use pczt::roles::creator::Creator;
use pczt::Pczt;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PcztProposal {
    pub proposal_id: String,
    pub escrow_id: String,
    pub recipient_address: String,
    pub amount_zats: u64,
    pub fee_zats: u64,
    pub expiry_height: u32,
    pub pczt_hex: String,
    pub created_at: String,
}

pub fn create_pczt_container(
    proposal_id: &str,
    escrow_id: &str,
    recipient_address: &str,
    amount_zats: u64,
    fee_zats: u64,
    expiry_height: u32,
    coin_type: u32,
) -> anyhow::Result<PcztProposal> {
    let consensus_branch_id = 0xc2d6d0b4u32;
    let anchor = Some([0u8; 32]);

    let creator = Creator::new(
        consensus_branch_id,
        expiry_height,
        coin_type,
        None,
        anchor,
    ).map_err(|e| anyhow::anyhow!("Failed to initialize PCZT creator: {:?}", e))?;

    let pczt = creator.build()
        .map_err(|e| anyhow::anyhow!("Failed to build PCZT: {:?}", e))?;
    let serialized = pczt.serialize()
        .map_err(|e| anyhow::anyhow!("Failed to serialize PCZT: {:?}", e))?;
    let pczt_hex = hex::encode(serialized);

    Ok(PcztProposal {
        proposal_id: proposal_id.to_string(),
        escrow_id: escrow_id.to_string(),
        recipient_address: recipient_address.to_string(),
        amount_zats,
        fee_zats,
        expiry_height,
        pczt_hex,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub fn parse_pczt_hex(pczt_hex: &str) -> anyhow::Result<Pczt> {
    let bytes = hex::decode(pczt_hex)?;
    Pczt::parse(&bytes).map_err(|e| anyhow::anyhow!("Invalid PCZT: {:?}", e))
}
