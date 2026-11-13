use serde::{Deserialize, Serialize};
use crate::wallet::manager::{BalanceBreakdown, ProposedTransaction, SignedTransaction};
use crate::wallet::store::{AccountRecord, NoteRecord, TransactionRecord};

#[derive(Clone, Debug, Deserialize)]
pub struct CreateWalletRequest {
    pub name: Option<String>,
    pub passphrase: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct CreateWalletResponse {
    pub success: bool,
    pub account: AccountRecord,
    pub mnemonic: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct RestoreWalletRequest {
    pub name: Option<String>,
    pub mnemonic: String,
    pub passphrase: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct AddressResponse {
    pub account_id: String,
    pub name: String,
    pub unified_address: String,
    pub fvk_hex: String,
    pub network: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct BalanceResponse {
    pub balance: BalanceBreakdown,
    pub network: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SimulateDepositRequest {
    pub amount_zats: u64,
    pub memo: Option<String>,
    pub confirmations: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
pub struct DepositResponse {
    pub success: bool,
    pub note: NoteRecord,
    pub message: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ProposeSettlementRequest {
    pub escrow_id: String,
    pub milestone_index: u32,
    pub recipient_address: String,
    pub amount_zats: u64,
    pub idempotency_key: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProposeSettlementResponse {
    pub success: bool,
    pub proposal: ProposedTransaction,
}

#[derive(Clone, Debug, Deserialize)]
pub struct AuthorizeSignRequest {
    pub proposal_id: String,
    pub authorized_by: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct AuthorizeSignResponse {
    pub success: bool,
    pub signed: SignedTransaction,
}

#[derive(Clone, Debug, Deserialize)]
pub struct BroadcastRequest {
    pub proposal_id: String,
    pub txid: String,
    pub raw_tx_hex: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct BroadcastResponse {
    pub success: bool,
    pub transaction: TransactionRecord,
}

#[derive(Clone, Debug, Deserialize)]
pub struct AdvanceConfirmationRequest {
    pub txid: String,
    pub confirmations: u32,
}

#[derive(Clone, Debug, Serialize)]
pub struct GenericResponse {
    pub success: bool,
    pub message: String,
}

