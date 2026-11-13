use sentinel_zcash::config::Config;
use sentinel_zcash::crypto::address::validate_and_parse_address;
use sentinel_zcash::crypto::keys::{derive_wallet_from_mnemonic, generate_new_wallet};
use sentinel_zcash::wallet::manager::WalletManager;
use sentinel_zcash::wallet::store::WalletStore;
use zcash_protocol::consensus::Network;

#[test]
fn test_key_derivation_and_unified_addresses() {
    let testnet = Network::TestNetwork;
    let mainnet = Network::MainNetwork;

    let testnet_wallet = generate_new_wallet(&testnet, "secure_pass", 0).expect("generate testnet wallet");
    assert!(testnet_wallet.unified_address.starts_with("utest1"), "Expected testnet UA to start with utest1, got {}", testnet_wallet.unified_address);

    let mainnet_wallet = generate_new_wallet(&mainnet, "secure_pass", 0).expect("generate mainnet wallet");
    assert!(mainnet_wallet.unified_address.starts_with("u1"), "Expected mainnet UA to start with u1, got {}", mainnet_wallet.unified_address);

    // Test restoring from mnemonic
    let restored = derive_wallet_from_mnemonic(&testnet, &testnet_wallet.mnemonic, "secure_pass", 0)
        .expect("restore from mnemonic");
    assert_eq!(restored.unified_address, testnet_wallet.unified_address);
    assert_eq!(restored.seed_fingerprint, testnet_wallet.seed_fingerprint);
}

#[test]
fn test_address_validation_and_parsing() {
    let testnet = Network::TestNetwork;
    let wallet = generate_new_wallet(&testnet, "", 0).unwrap();

    let validated = validate_and_parse_address(&testnet, &wallet.unified_address)
        .expect("valid testnet UA");
    assert!(validated.has_orchard);
    assert!(validated.orchard_receiver_hex.is_some());

    // Rejection of invalid addresses
    assert!(validate_and_parse_address(&testnet, "").is_err());
    assert!(validate_and_parse_address(&testnet, "invalid_address").is_err());
    assert!(validate_and_parse_address(&testnet, "u1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq").is_err());
}

#[test]
fn test_zip317_marginal_fee() {
    // 1 spend, 2 outputs -> actions = max(1,2) = 2 -> grace actions = 2 -> 2 * 5,000 = 10,000 zats
    let base_fee = WalletManager::calculate_zip317_fee(1, 2);
    assert_eq!(base_fee, 10_000);

    // 5 spends, 2 outputs -> actions = max(5,2) = 5 -> 5 * 5,000 = 25,000 zats
    let multi_fee = WalletManager::calculate_zip317_fee(5, 2);
    assert_eq!(multi_fee, 25_000);
}

#[test]
fn test_escrow_deposit_proposal_signing_settlement_lifecycle() {
    let mut config = Config::from_env();
    config.db_path = format!("test_wallet_{}.db", rand::random::<u64>());
    config.network = Network::TestNetwork;
    config.network_name = "testnet".to_string();

    let store = WalletStore::open(&config.db_path).expect("open test store");
    let manager = WalletManager::new(config.clone(), store);

    // 1. Initialize Primary Wallet
    let (account, _) = manager.create_wallet("Escrow Test Vault", "").expect("create wallet");
    assert!(account.unified_address.starts_with("utest1"));

    // 2. Generate Recipient Unified Address
    let recipient_wallet = generate_new_wallet(&Network::TestNetwork, "", 1).unwrap();
    let recipient_ua = recipient_wallet.unified_address;

    // 3. Initial balance check: 0
    let bal_empty = manager.get_balance().unwrap();
    assert_eq!(bal_empty.total_zats, 0);

    // 4. Fund the escrow with 10 ZEC (1,000,000,000 zats)
    let ten_zec_zats = 10 * 100_000_000u64;
    manager.record_deposit(ten_zec_zats, Some("Funding Escrow SNZ-TEST-001"), 3).unwrap();

    let bal_funded = manager.get_balance().unwrap();
    assert_eq!(bal_funded.total_zats, ten_zec_zats);
    assert_eq!(bal_funded.spendable_zats, ten_zec_zats);

    // 5. Milestone 1 Settlement Proposal: 2 ZEC (200,000,000 zats)
    let m1_amount = 2 * 100_000_000u64;
    let idempotency_key = "idemp_snz_m1_001";
    let proposal = manager.propose_settlement(
        "SNZ-TEST-001",
        1,
        &recipient_ua,
        m1_amount,
        idempotency_key,
    ).expect("proposal creation");

    assert_eq!(proposal.amount_zats, m1_amount);
    assert_eq!(proposal.fee_zats, 10_000); // ZIP-317 fee
    assert!(!proposal.pczt_hex.is_empty(), "PCZT hex should be populated");

    // Test idempotency: calling propose_settlement with the same key returns identical proposal
    let repeated = manager.propose_settlement(
        "SNZ-TEST-001",
        1,
        &recipient_ua,
        m1_amount,
        idempotency_key,
    ).expect("idempotent retrieval");
    assert_eq!(repeated.proposal_id, proposal.proposal_id);

    // 6. Test insufficient funds error when proposal exceeds spendable balance
    let overspend_err = manager.propose_settlement(
        "SNZ-TEST-001",
        99,
        &recipient_ua,
        50 * 100_000_000u64, // 50 ZEC > 10 ZEC
        "idemp_overspend",
    );
    assert!(overspend_err.is_err(), "Must reject proposal exceeding available funds");

    // 7. Authorize and Sign Milestone 1 Settlement
    let signed = manager.authorize_and_sign(&proposal.proposal_id, "payer_admin")
        .expect("sign transaction");

    assert_eq!(signed.proposal_id, proposal.proposal_id);
    assert_eq!(signed.authorization_signature_hex.len(), 128); // 64 bytes = 128 hex chars
    assert!(!signed.txid.is_empty());
    assert!(!signed.raw_tx_hex.is_empty());

    // 8. Broadcast Settlement Transaction
    let broadcast_result = manager.broadcast_transaction(
        &proposal.proposal_id,
        &signed.txid,
        &signed.raw_tx_hex,
    ).expect("broadcast transaction");
    assert_eq!(broadcast_result.status, "broadcast");
    assert_eq!(broadcast_result.confirmations, 1);

    // 9. Prevent Duplicate Broadcast
    let duplicate_broadcast = manager.broadcast_transaction(
        &proposal.proposal_id,
        &signed.txid,
        &signed.raw_tx_hex,
    ).expect("duplicate broadcast should be idempotent");
    assert_eq!(duplicate_broadcast.txid, signed.txid);

    // 10. Advance Confirmations to 3+ and Verify Final Confirmation
    let confirmed_tx = manager.advance_confirmation(&signed.txid, 3).expect("advance confs");
    assert_eq!(confirmed_tx.status, "confirmed");
    assert_eq!(confirmed_tx.confirmations, 3);
    assert!(confirmed_tx.confirmed_at.is_some());

    // Clean up test DB
    let _ = std::fs::remove_file(&config.db_path);
}

