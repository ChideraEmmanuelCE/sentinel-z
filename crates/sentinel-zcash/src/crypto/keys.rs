use bip39::Mnemonic;
use orchard::keys::{FullViewingKey, IncomingViewingKey, Scope, SpendingKey};
use zcash_keys::address::{Address, UnifiedAddress};
use zcash_protocol::consensus::Network;
use zip32::AccountId;

pub struct WalletKeys {
    pub mnemonic: String,
    pub seed_fingerprint: String,
    pub spending_key: SpendingKey,
    pub full_viewing_key: FullViewingKey,
    pub incoming_viewing_key: IncomingViewingKey,
    pub default_orchard_address: orchard::Address,
    pub unified_address: String,
}

pub fn coin_type_for_network(network: &Network) -> u32 {
    match network {
        Network::MainNetwork => 133,
        Network::TestNetwork => 1,
    }
}

pub fn generate_new_wallet(network: &Network, passphrase: &str, account_index: u32) -> anyhow::Result<WalletKeys> {
    use rand::RngExt;
    let mut entropy = [0u8; 32];
    rand::rng().fill(&mut entropy);
    let mnemonic = Mnemonic::from_entropy(&entropy)?;
    derive_wallet_from_mnemonic(network, &mnemonic.to_string(), passphrase, account_index)
}

pub fn derive_wallet_from_mnemonic(
    network: &Network,
    mnemonic_str: &str,
    passphrase: &str,
    account_index: u32,
) -> anyhow::Result<WalletKeys> {
    let mnemonic = Mnemonic::parse(mnemonic_str)?;
    let seed = mnemonic.to_seed(passphrase);
    let seed_fingerprint = hex::encode(&seed[..8]);

    let coin_type = coin_type_for_network(network);
    let account_id = AccountId::try_from(account_index)
        .map_err(|e| anyhow::anyhow!("Invalid account index {}: {:?}", account_index, e))?;

    let spending_key = SpendingKey::from_zip32_seed(&seed, coin_type, account_id)
        .map_err(|e| anyhow::anyhow!("Failed to derive Orchard spending key: {:?}", e))?;

    let full_viewing_key = FullViewingKey::from(&spending_key);
    let incoming_viewing_key = full_viewing_key.to_ivk(Scope::External);
    let default_orchard_address = incoming_viewing_key.address_at(0u32);

    let ua = UnifiedAddress::from_receivers(Some(default_orchard_address), None, None, None, None)
        .ok_or_else(|| anyhow::anyhow!("Failed to construct Unified Address from Orchard receiver"))?;

    let unified_address = Address::Unified(Box::new(ua)).encode(network);

    Ok(WalletKeys {
        mnemonic: mnemonic.to_string(),
        seed_fingerprint,
        spending_key,
        full_viewing_key,
        incoming_viewing_key,
        default_orchard_address,
        unified_address,
    })
}
