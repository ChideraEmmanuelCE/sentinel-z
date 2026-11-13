use std::env;
use zcash_protocol::consensus::Network;

#[derive(Clone, Debug)]
pub struct Config {
    pub network: Network,
    pub network_name: String,
    pub host: String,
    pub port: u16,
    pub auth_token: Option<String>,
    pub db_path: String,
    pub lightwalletd_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        let network_mode = env::var("ZCASH_NETWORK_MODE").unwrap_or_else(|_| "testnet".to_string());
        let (network, network_name) = match network_mode.to_lowercase().as_str() {
            "mainnet" => (Network::MainNetwork, "mainnet".to_string()),
            _ => (Network::TestNetwork, "testnet".to_string()),
        };

        let host = env::var("ZCASH_SIGNER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = env::var("ZCASH_SIGNER_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8232);

        let auth_token = env::var("ZCASH_SIGNER_AUTH_TOKEN").ok().filter(|s| !s.is_empty());
        let db_path = env::var("ZCASH_WALLET_DB").unwrap_or_else(|_| "sentinel_wallet.db".to_string());
        let lightwalletd_url = env::var("ZCASH_LIGHTWALLETD_URL")
            .unwrap_or_else(|_| "https://testnet.lightwalletd.com:9067".to_string());

        Self {
            network,
            network_name,
            host,
            port,
            auth_token,
            db_path,
            lightwalletd_url,
        }
    }
}

