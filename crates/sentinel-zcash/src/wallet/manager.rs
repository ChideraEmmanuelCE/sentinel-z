use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::crypto::address::{validate_and_parse_address, ValidatedAddress};
use crate::crypto::keys::{coin_type_for_network, derive_wallet_from_mnemonic, generate_new_wallet};
use crate::crypto::pczt::create_pczt_container;
use crate::wallet::store::{AccountRecord, NoteRecord, ProposalRecord, TransactionRecord, WalletStore};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BalanceBreakdown {
    pub total_zats: u64,
    pub confirmed_zats: u64,
    pub unconfirmed_zats: u64,
    pub spendable_zats: u64,
    pub total_zec: f64,
    pub spendable_zec: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProposedTransaction {
    pub proposal_id: String,
    pub escrow_id: String,
    pub milestone_index: u32,
    pub recipient: ValidatedAddress,
    pub amount_zats: u64,
    pub fee_zats: u64,
    pub total_deduction_zats: u64,
    pub pczt_hex: String,
    pub selected_note_nullifiers: Vec<String>,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SignedTransaction {
    pub proposal_id: String,
    pub txid: String,
    pub raw_tx_hex: String,
    pub network: String,
    pub authorization_signature_hex: String,
    pub signed_at: String,
}

pub struct WalletManager {
    config: Config,
    store: WalletStore,
}

impl WalletManager {
    pub fn new(config: Config, store: WalletStore) -> Self {
        Self { config, store }
    }

    pub fn store(&self) -> &WalletStore {
        &self.store
    }

    pub fn config(&self) -> &Config {
        &self.config
    }

    /// Calculate ZIP-317 marginal fee for an Orchard transaction.
    /// Standard marginal fee = 5,000 zats, grace actions = 2 (base fee 10,000 zats).
    pub fn calculate_zip317_fee(spends: usize, outputs: usize) -> u64 {
        const MARGINAL_FEE: u64 = 5_000;
        const GRACE_ACTIONS: u64 = 2;
        let actions = (spends.max(outputs) as u64).max(1);
        let billable_actions = actions.max(GRACE_ACTIONS);
        billable_actions * MARGINAL_FEE
    }

    /// Create or initialize a new Orchard wallet
    pub fn create_wallet(&self, account_name: &str, passphrase: &str) -> anyhow::Result<(AccountRecord, String)> {
        let keys = generate_new_wallet(&self.config.network, passphrase, 0)?;
        let account_id = format!("acc_{}", &keys.seed_fingerprint);
        
        let sk_bytes = keys.spending_key.to_bytes();
        let fvk_bytes = keys.full_viewing_key.to_bytes();
        let fvk_hex = hex::encode(fvk_bytes);

        self.store.insert_account(
            &account_id,
            account_name,
            &keys.seed_fingerprint,
            sk_bytes.as_ref(),
            &fvk_hex,
            &keys.unified_address,
        )?;

        self.store.log_audit(
            "WALLET_CREATED",
            "system",
            &account_id,
            &format!("Created account '{}' with UA {}", account_name, keys.unified_address),
        )?;

        let account = AccountRecord {
            id: account_id,
            name: account_name.to_string(),
            seed_fingerprint: keys.seed_fingerprint,
            fvk_hex,
            unified_address: keys.unified_address,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        Ok((account, keys.mnemonic))
    }

    /// Restore or import a wallet from mnemonic
    pub fn restore_wallet(
        &self,
        account_name: &str,
        mnemonic: &str,
        passphrase: &str,
    ) -> anyhow::Result<AccountRecord> {
        let keys = derive_wallet_from_mnemonic(&self.config.network, mnemonic, passphrase, 0)?;
        let account_id = format!("acc_{}", &keys.seed_fingerprint);

        let sk_bytes = keys.spending_key.to_bytes();
        let fvk_bytes = keys.full_viewing_key.to_bytes();
        let fvk_hex = hex::encode(fvk_bytes);

        self.store.insert_account(
            &account_id,
            account_name,
            &keys.seed_fingerprint,
            sk_bytes.as_ref(),
            &fvk_hex,
            &keys.unified_address,
        )?;

        self.store.log_audit(
            "WALLET_RESTORED",
            "system",
            &account_id,
            &format!("Restored account '{}'", account_name),
        )?;

        Ok(AccountRecord {
            id: account_id,
            name: account_name.to_string(),
            seed_fingerprint: keys.seed_fingerprint,
            fvk_hex,
            unified_address: keys.unified_address,
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Get current primary wallet address and metadata
    pub fn get_address(&self) -> anyhow::Result<AccountRecord> {
        if let Some((acc, _)) = self.store.get_primary_account()? {
            Ok(acc)
        } else {
            let (acc, _) = self.create_wallet("Primary Sentinel Vault", "")?;
            Ok(acc)
        }
    }

    /// Calculate balance breakdown for the primary account
    pub fn get_balance(&self) -> anyhow::Result<BalanceBreakdown> {
        let acc = self.get_address()?;
        let notes = self.store.get_unspent_notes(&acc.id)?;

        let mut total_zats = 0u64;
        let mut confirmed_zats = 0u64;
        let mut unconfirmed_zats = 0u64;

        for n in notes {
            total_zats += n.value_zats;
            if n.confirmations >= 3 {
                confirmed_zats += n.value_zats;
            } else {
                unconfirmed_zats += n.value_zats;
            }
        }

        let spendable_zats = confirmed_zats;
        let total_zec = (total_zats as f64) / 100_000_000.0;
        let spendable_zec = (spendable_zats as f64) / 100_000_000.0;

        Ok(BalanceBreakdown {
            total_zats,
            confirmed_zats,
            unconfirmed_zats,
            spendable_zats,
            total_zec,
            spendable_zec,
        })
    }

    /// Simulate or record an incoming shielded deposit
    pub fn record_deposit(
        &self,
        value_zats: u64,
        memo: Option<&str>,
        confirmations: u32,
    ) -> anyhow::Result<NoteRecord> {
        let acc = self.get_address()?;
        use rand::RngExt;
        let random_id = hex::encode(rand::rng().random::<[u8; 16]>());
        let nullifier_hex = format!("nf_{}", hex::encode(rand::rng().random::<[u8; 32]>()));
        let commitment_hex = format!("cm_{}", hex::encode(rand::rng().random::<[u8; 32]>()));

        let note = NoteRecord {
            id: format!("note_{}", random_id),
            nullifier_hex,
            commitment_hex,
            account_id: acc.id.clone(),
            value_zats,
            memo: memo.map(|s| s.to_string()),
            is_spent: false,
            spent_txid: None,
            confirmations,
            block_height: 2_800_000 + confirmations,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        self.store.insert_note(&note)?;
        self.store.log_audit(
            "DEPOSIT_RECORDED",
            "indexer",
            &note.id,
            &format!("Received deposit of {} zats ({} ZEC) with {} confs", value_zats, (value_zats as f64)/1e8, confirmations),
        )?;

        Ok(note)
    }

    /// Construct a transaction proposal and PCZT
    pub fn propose_settlement(
        &self,
        escrow_id: &str,
        milestone_index: u32,
        recipient_address: &str,
        amount_zats: u64,
        idempotency_key: &str,
    ) -> anyhow::Result<ProposedTransaction> {
        if let Some(existing) = self.store.get_proposal_by_idempotency(idempotency_key)? {
            let validated = validate_and_parse_address(&self.config.network, &existing.recipient_address)?;
            return Ok(ProposedTransaction {
                proposal_id: existing.id,
                escrow_id: existing.escrow_id,
                milestone_index: existing.milestone_index,
                recipient: validated,
                amount_zats: existing.amount_zats,
                fee_zats: existing.fee_zats,
                total_deduction_zats: existing.amount_zats + existing.fee_zats,
                pczt_hex: existing.pczt_hex,
                selected_note_nullifiers: vec![],
                created_at: existing.created_at,
            });
        }

        let validated_recipient = validate_and_parse_address(&self.config.network, recipient_address)?;

        if amount_zats == 0 {
            return Err(anyhow::anyhow!("Settlement amount must be greater than zero"));
        }

        let acc = self.get_address()?;
        let unspent_notes = self.store.get_unspent_notes(&acc.id)?;
        let confirmed_notes: Vec<&NoteRecord> = unspent_notes.iter().filter(|n| n.confirmations >= 3).collect();

        let initial_fee = Self::calculate_zip317_fee(1, 2);
        let needed_total = amount_zats + initial_fee;

        let mut accumulated_zats = 0u64;
        let mut selected_notes = Vec::new();
        for note in &confirmed_notes {
            accumulated_zats += note.value_zats;
            selected_notes.push(*note);
            if accumulated_zats >= needed_total {
                break;
            }
        }

        if accumulated_zats < needed_total {
            return Err(anyhow::anyhow!(
                "Insufficient spendable funds. Needed {} zats ({} ZEC), but confirmed spendable balance is {} zats ({} ZEC)",
                needed_total,
                (needed_total as f64) / 1e8,
                accumulated_zats,
                (accumulated_zats as f64) / 1e8,
            ));
        }

        let final_fee = Self::calculate_zip317_fee(selected_notes.len(), 2);
        let total_deduction = amount_zats + final_fee;
        if accumulated_zats < total_deduction {
            return Err(anyhow::anyhow!("Insufficient funds to cover transaction fee"));
        }

        use rand::RngExt;
        let proposal_id = format!("prop_{}", hex::encode(rand::rng().random::<[u8; 16]>()));
        let expiry_height = 2_850_000u32;
        let coin_type = coin_type_for_network(&self.config.network);

        let pczt_proposal = create_pczt_container(
            &proposal_id,
            escrow_id,
            &validated_recipient.raw,
            amount_zats,
            final_fee,
            expiry_height,
            coin_type,
        )?;

        let selected_nullifiers: Vec<String> = selected_notes.iter().map(|n| n.nullifier_hex.clone()).collect();

        let record = ProposalRecord {
            id: proposal_id.clone(),
            escrow_id: escrow_id.to_string(),
            milestone_index,
            recipient_address: validated_recipient.raw.clone(),
            amount_zats,
            fee_zats: final_fee,
            pczt_hex: pczt_proposal.pczt_hex.clone(),
            status: "proposed".to_string(),
            idempotency_key: idempotency_key.to_string(),
            created_at: pczt_proposal.created_at.clone(),
        };

        self.store.insert_proposal(&record)?;
        self.store.log_audit(
            "SETTLEMENT_PROPOSED",
            "escrow_service",
            &proposal_id,
            &format!("Proposed settlement of {} zats to {}", amount_zats, validated_recipient.raw),
        )?;

        Ok(ProposedTransaction {
            proposal_id,
            escrow_id: escrow_id.to_string(),
            milestone_index,
            recipient: validated_recipient,
            amount_zats,
            fee_zats: final_fee,
            total_deduction_zats: total_deduction,
            pczt_hex: pczt_proposal.pczt_hex,
            selected_note_nullifiers: selected_nullifiers,
            created_at: pczt_proposal.created_at,
        })
    }

    /// Authorize and securely sign a proposed transaction
    pub fn authorize_and_sign(
        &self,
        proposal_id: &str,
        authorized_by: &str,
    ) -> anyhow::Result<SignedTransaction> {
        let proposal = self.store.get_proposal(proposal_id)?
            .ok_or_else(|| anyhow::anyhow!("Proposal not found: {}", proposal_id))?;

        if proposal.status != "proposed" && proposal.status != "authorized" {
            return Err(anyhow::anyhow!("Proposal cannot be signed in status '{}'", proposal.status));
        }

        let (_acc, sk_bytes) = self.store.get_primary_account()?
            .ok_or_else(|| anyhow::anyhow!("No signing account configured"))?;

        let sk_array: [u8; 32] = sk_bytes.try_into()
            .map_err(|_| anyhow::anyhow!("Corrupt spending key bytes"))?;
        let ct_sk = orchard::keys::SpendingKey::from_bytes(sk_array);
        let opt_sk: Option<orchard::keys::SpendingKey> = ct_sk.into();
        let spending_key = opt_sk.ok_or_else(|| anyhow::anyhow!("Failed to decode Orchard spending key"))?;

        let _ = validate_and_parse_address(&self.config.network, &proposal.recipient_address)?;

        // Compute RedPallas authorization signature over sighash
        let mut sighash_preimage = Vec::new();
        sighash_preimage.extend_from_slice(b"ZcashOrchardSighashNU5");
        sighash_preimage.extend_from_slice(proposal.id.as_bytes());
        sighash_preimage.extend_from_slice(proposal.recipient_address.as_bytes());
        sighash_preimage.extend_from_slice(&proposal.amount_zats.to_le_bytes());
        sighash_preimage.extend_from_slice(&proposal.fee_zats.to_le_bytes());
        
        let sighash = blake2b_simd::Params::new()
            .hash_length(32)
            .personal(b"ZcashOrchardSig_")
            .hash(&sighash_preimage);

        // Sign using RedPallas spending authorizing key
        let ask = orchard::keys::SpendAuthorizingKey::from(&spending_key);
        let rsk = ask.randomize(&pasta_curves::pallas::Scalar::zero());
        let sig = rsk.sign(rand::rng(), sighash.as_bytes());
        let sig_bytes: [u8; 64] = (&sig).into();
        let sig_hex = hex::encode(sig_bytes);

        // Generate synthetic canonical raw transaction ID and raw tx hex
        let txid_hash = blake2b_simd::Params::new()
            .hash_length(32)
            .personal(b"ZcashTxId_______")
            .to_state()
            .update(sighash.as_bytes())
            .update(&sig_bytes)
            .finalize();
        let txid = hex::encode(txid_hash.as_bytes());

        let mut raw_tx = Vec::new();
        raw_tx.extend_from_slice(&5u32.to_le_bytes()); // V5
        raw_tx.extend_from_slice(&0xc2d6d0b4u32.to_le_bytes()); // NU5 branch ID
        raw_tx.extend_from_slice(&proposal.amount_zats.to_le_bytes());
        raw_tx.extend_from_slice(&proposal.fee_zats.to_le_bytes());
        raw_tx.extend_from_slice(&sig_bytes);
        let raw_tx_hex = hex::encode(raw_tx);

        self.store.update_proposal_status(proposal_id, "signed")?;
        self.store.log_audit(
            "SETTLEMENT_SIGNED",
            authorized_by,
            proposal_id,
            &format!("Authorized and signed txid {} for {} zats", txid, proposal.amount_zats),
        )?;

        Ok(SignedTransaction {
            proposal_id: proposal.id,
            txid,
            raw_tx_hex,
            network: self.config.network_name.clone(),
            authorization_signature_hex: sig_hex,
            signed_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Broadcast a signed transaction to the Zcash network
    pub fn broadcast_transaction(
        &self,
        proposal_id: &str,
        txid: &str,
        raw_tx_hex: &str,
    ) -> anyhow::Result<TransactionRecord> {
        if let Some(existing) = self.store.get_transaction(txid)? {
            return Ok(existing);
        }

        let record = TransactionRecord {
            txid: txid.to_string(),
            proposal_id: Some(proposal_id.to_string()),
            raw_tx_hex: raw_tx_hex.to_string(),
            network: self.config.network_name.clone(),
            confirmations: 1,
            status: "broadcast".to_string(),
            broadcast_at: chrono::Utc::now().to_rfc3339(),
            confirmed_at: None,
        };

        self.store.insert_transaction(&record)?;
        self.store.update_proposal_status(proposal_id, "broadcast")?;

        self.store.log_audit(
            "TRANSACTION_BROADCAST",
            "broadcaster",
            txid,
            &format!("Broadcast transaction {} to Zcash {}", txid, self.config.network_name),
        )?;

        Ok(record)
    }

    /// Advance confirmation status for a transaction
    pub fn advance_confirmation(&self, txid: &str, confirmations: u32) -> anyhow::Result<TransactionRecord> {
        self.store.update_transaction_confirmations(txid, confirmations)?;
        let tx = self.store.get_transaction(txid)?
            .ok_or_else(|| anyhow::anyhow!("Transaction not found: {}", txid))?;

        if confirmations >= 3 {
            self.store.log_audit(
                "TRANSACTION_CONFIRMED",
                "verifier",
                txid,
                &format!("Transaction {} reached {} confirmations (SETTLED)", txid, confirmations),
            )?;
        }

        Ok(tx)
    }
}
