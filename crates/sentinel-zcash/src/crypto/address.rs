use serde::{Deserialize, Serialize};
use zcash_keys::address::Address;
use zcash_protocol::consensus::Network;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidatedAddress {
    pub raw: String,
    pub is_unified: bool,
    pub has_orchard: bool,
    pub orchard_receiver_hex: Option<String>,
}

pub fn validate_and_parse_address(network: &Network, address_str: &str) -> anyhow::Result<ValidatedAddress> {
    let trimmed = address_str.trim();
    if trimmed.is_empty() {
        return Err(anyhow::anyhow!("Address cannot be empty"));
    }

    match network {
        Network::TestNetwork => {
            if !trimmed.starts_with("utest1") && !trimmed.starts_with("ztestsapling") && !trimmed.starts_with("tm") {
                return Err(anyhow::anyhow!("Expected a Zcash testnet address (e.g. utest1...)"));
            }
        }
        Network::MainNetwork => {
            if !trimmed.starts_with("u1") && !trimmed.starts_with("zs1") && !trimmed.starts_with("t1") && !trimmed.starts_with("t3") {
                return Err(anyhow::anyhow!("Expected a Zcash mainnet address (e.g. u1...)"));
            }
        }
    }

    let decoded = Address::decode(network, trimmed)
        .ok_or_else(|| anyhow::anyhow!("Failed to decode Zcash address for the current network"))?;

    match decoded {
        Address::Unified(ua) => {
            if let Some(orchard_addr) = ua.orchard() {
                let raw_bytes = orchard_addr.to_raw_address_bytes();
                Ok(ValidatedAddress {
                    raw: trimmed.to_string(),
                    is_unified: true,
                    has_orchard: true,
                    orchard_receiver_hex: Some(hex::encode(raw_bytes)),
                })
            } else {
                Err(anyhow::anyhow!("Unified Address does not contain an Orchard receiver"))
            }
        }
        _ => Err(anyhow::anyhow!("Recipient address must be a Unified Address with an Orchard receiver")),
    }
}
