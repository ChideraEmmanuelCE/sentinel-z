use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AccountRecord {
    pub id: String,
    pub name: String,
    pub seed_fingerprint: String,
    pub fvk_hex: String,
    pub unified_address: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NoteRecord {
    pub id: String,
    pub nullifier_hex: String,
    pub commitment_hex: String,
    pub account_id: String,
    pub value_zats: u64,
    pub memo: Option<String>,
    pub is_spent: bool,
    pub spent_txid: Option<String>,
    pub confirmations: u32,
    pub block_height: u32,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProposalRecord {
    pub id: String,
    pub escrow_id: String,
    pub milestone_index: u32,
    pub recipient_address: String,
    pub amount_zats: u64,
    pub fee_zats: u64,
    pub pczt_hex: String,
    pub status: String,
    pub idempotency_key: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionRecord {
    pub txid: String,
    pub proposal_id: Option<String>,
    pub raw_tx_hex: String,
    pub network: String,
    pub confirmations: u32,
    pub status: String,
    pub broadcast_at: String,
    pub confirmed_at: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuditLogRecord {
    pub id: i64,
    pub action: String,
    pub actor: String,
    pub target_id: String,
    pub details: String,
    pub timestamp: String,
}

#[derive(Clone)]
pub struct WalletStore {
    conn: Arc<Mutex<Connection>>,
}

impl WalletStore {
    pub fn open(path: &str) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS accounts (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 seed_fingerprint TEXT NOT NULL,
                 spending_key_bytes BLOB NOT NULL,
                 fvk_hex TEXT NOT NULL,
                 unified_address TEXT NOT NULL,
                 created_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS notes (
                 id TEXT PRIMARY KEY,
                 nullifier_hex TEXT UNIQUE NOT NULL,
                 commitment_hex TEXT NOT NULL,
                 account_id TEXT NOT NULL,
                 value_zats INTEGER NOT NULL,
                 memo TEXT,
                 is_spent INTEGER NOT NULL DEFAULT 0,
                 spent_txid TEXT,
                 confirmations INTEGER NOT NULL DEFAULT 0,
                 block_height INTEGER NOT NULL DEFAULT 0,
                 created_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS proposals (
                 id TEXT PRIMARY KEY,
                 escrow_id TEXT NOT NULL,
                 milestone_index INTEGER NOT NULL,
                 recipient_address TEXT NOT NULL,
                 amount_zats INTEGER NOT NULL,
                 fee_zats INTEGER NOT NULL,
                 pczt_hex TEXT NOT NULL,
                 status TEXT NOT NULL,
                 idempotency_key TEXT UNIQUE NOT NULL,
                 created_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS transactions (
                 txid TEXT PRIMARY KEY,
                 proposal_id TEXT,
                 raw_tx_hex TEXT NOT NULL,
                 network TEXT NOT NULL,
                 confirmations INTEGER NOT NULL DEFAULT 0,
                 status TEXT NOT NULL,
                 broadcast_at TEXT NOT NULL,
                 confirmed_at TEXT
             );

             CREATE TABLE IF NOT EXISTS audit_logs (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 action TEXT NOT NULL,
                 actor TEXT NOT NULL,
                 target_id TEXT NOT NULL,
                 details TEXT NOT NULL,
                 timestamp TEXT NOT NULL
             );

             CREATE INDEX IF NOT EXISTS idx_notes_account ON notes(account_id, is_spent);
             CREATE INDEX IF NOT EXISTS idx_proposals_escrow ON proposals(escrow_id);
             CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
            "
        )?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn insert_account(
        &self,
        id: &str,
        name: &str,
        seed_fingerprint: &str,
        spending_key_bytes: &[u8],
        fvk_hex: &str,
        unified_address: &str,
    ) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO accounts (id, name, seed_fingerprint, spending_key_bytes, fvk_hex, unified_address, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, name, seed_fingerprint, spending_key_bytes, fvk_hex, unified_address, now],
        )?;
        Ok(())
    }

    pub fn get_account(&self, id: &str) -> anyhow::Result<Option<(AccountRecord, Vec<u8>)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, seed_fingerprint, spending_key_bytes, fvk_hex, unified_address, created_at
             FROM accounts WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let record = AccountRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                seed_fingerprint: row.get(2)?,
                fvk_hex: row.get(4)?,
                unified_address: row.get(5)?,
                created_at: row.get(6)?,
            };
            let sk_bytes: Vec<u8> = row.get(3)?;
            Ok(Some((record, sk_bytes)))
        } else {
            Ok(None)
        }
    }

    pub fn get_primary_account(&self) -> anyhow::Result<Option<(AccountRecord, Vec<u8>)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, seed_fingerprint, spending_key_bytes, fvk_hex, unified_address, created_at
             FROM accounts ORDER BY created_at ASC LIMIT 1",
        )?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            let record = AccountRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                seed_fingerprint: row.get(2)?,
                fvk_hex: row.get(4)?,
                unified_address: row.get(5)?,
                created_at: row.get(6)?,
            };
            let sk_bytes: Vec<u8> = row.get(3)?;
            Ok(Some((record, sk_bytes)))
        } else {
            Ok(None)
        }
    }

    pub fn insert_note(&self, note: &NoteRecord) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO notes (id, nullifier_hex, commitment_hex, account_id, value_zats, memo, is_spent, spent_txid, confirmations, block_height, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(nullifier_hex) DO UPDATE SET
                confirmations = excluded.confirmations,
                block_height = excluded.block_height,
                is_spent = excluded.is_spent",
            params![
                note.id,
                note.nullifier_hex,
                note.commitment_hex,
                note.account_id,
                note.value_zats,
                note.memo,
                if note.is_spent { 1 } else { 0 },
                note.spent_txid,
                note.confirmations,
                note.block_height,
                note.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_unspent_notes(&self, account_id: &str) -> anyhow::Result<Vec<NoteRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, nullifier_hex, commitment_hex, account_id, value_zats, memo, is_spent, spent_txid, confirmations, block_height, created_at
             FROM notes WHERE account_id = ?1 AND is_spent = 0 ORDER BY value_zats DESC",
        )?;
        let rows = stmt.query_map(params![account_id], |row| {
            Ok(NoteRecord {
                id: row.get(0)?,
                nullifier_hex: row.get(1)?,
                commitment_hex: row.get(2)?,
                account_id: row.get(3)?,
                value_zats: row.get(4)?,
                memo: row.get(5)?,
                is_spent: row.get::<_, i64>(6)? != 0,
                spent_txid: row.get(7)?,
                confirmations: row.get(8)?,
                block_height: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn mark_notes_spent(&self, nullifiers: &[String], txid: &str) -> anyhow::Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        for nf in nullifiers {
            tx.execute(
                "UPDATE notes SET is_spent = 1, spent_txid = ?1 WHERE nullifier_hex = ?2",
                params![txid, nf],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn insert_proposal(&self, proposal: &ProposalRecord) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO proposals (id, escrow_id, milestone_index, recipient_address, amount_zats, fee_zats, pczt_hex, status, idempotency_key, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                proposal.id,
                proposal.escrow_id,
                proposal.milestone_index,
                proposal.recipient_address,
                proposal.amount_zats,
                proposal.fee_zats,
                proposal.pczt_hex,
                proposal.status,
                proposal.idempotency_key,
                proposal.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_proposal(&self, id: &str) -> anyhow::Result<Option<ProposalRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, escrow_id, milestone_index, recipient_address, amount_zats, fee_zats, pczt_hex, status, idempotency_key, created_at
             FROM proposals WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(ProposalRecord {
                id: row.get(0)?,
                escrow_id: row.get(1)?,
                milestone_index: row.get(2)?,
                recipient_address: row.get(3)?,
                amount_zats: row.get(4)?,
                fee_zats: row.get(5)?,
                pczt_hex: row.get(6)?,
                status: row.get(7)?,
                idempotency_key: row.get(8)?,
                created_at: row.get(9)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_proposal_by_idempotency(&self, key: &str) -> anyhow::Result<Option<ProposalRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, escrow_id, milestone_index, recipient_address, amount_zats, fee_zats, pczt_hex, status, idempotency_key, created_at
             FROM proposals WHERE idempotency_key = ?1",
        )?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            Ok(Some(ProposalRecord {
                id: row.get(0)?,
                escrow_id: row.get(1)?,
                milestone_index: row.get(2)?,
                recipient_address: row.get(3)?,
                amount_zats: row.get(4)?,
                fee_zats: row.get(5)?,
                pczt_hex: row.get(6)?,
                status: row.get(7)?,
                idempotency_key: row.get(8)?,
                created_at: row.get(9)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_proposal_status(&self, id: &str, status: &str) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE proposals SET status = ?1 WHERE id = ?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn insert_transaction(&self, tx: &TransactionRecord) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO transactions (txid, proposal_id, raw_tx_hex, network, confirmations, status, broadcast_at, confirmed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                tx.txid,
                tx.proposal_id,
                tx.raw_tx_hex,
                tx.network,
                tx.confirmations,
                tx.status,
                tx.broadcast_at,
                tx.confirmed_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_transaction(&self, txid: &str) -> anyhow::Result<Option<TransactionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT txid, proposal_id, raw_tx_hex, network, confirmations, status, broadcast_at, confirmed_at
             FROM transactions WHERE txid = ?1",
        )?;
        let mut rows = stmt.query(params![txid])?;
        if let Some(row) = rows.next()? {
            Ok(Some(TransactionRecord {
                txid: row.get(0)?,
                proposal_id: row.get(1)?,
                raw_tx_hex: row.get(2)?,
                network: row.get(3)?,
                confirmations: row.get(4)?,
                status: row.get(5)?,
                broadcast_at: row.get(6)?,
                confirmed_at: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_transaction_confirmations(&self, txid: &str, confirmations: u32) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        let status = if confirmations >= 3 { "confirmed" } else { "broadcast" };
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE transactions SET confirmations = ?1, status = ?2, confirmed_at = CASE WHEN ?1 >= 3 AND confirmed_at IS NULL THEN ?3 ELSE confirmed_at END WHERE txid = ?4",
            params![confirmations, status, now, txid],
        )?;
        Ok(())
    }

    pub fn list_transactions(&self, limit: usize) -> anyhow::Result<Vec<TransactionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT txid, proposal_id, raw_tx_hex, network, confirmations, status, broadcast_at, confirmed_at
             FROM transactions ORDER BY broadcast_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok(TransactionRecord {
                txid: row.get(0)?,
                proposal_id: row.get(1)?,
                raw_tx_hex: row.get(2)?,
                network: row.get(3)?,
                confirmations: row.get(4)?,
                status: row.get(5)?,
                broadcast_at: row.get(6)?,
                confirmed_at: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn log_audit(&self, action: &str, actor: &str, target_id: &str, details: &str) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO audit_logs (action, actor, target_id, details, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![action, actor, target_id, details, now],
        )?;
        Ok(())
    }
}

