use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use sentinel_zcash::{api, config, wallet};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "sentinel_zcash=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::Config::from_env();
    tracing::info!(
        "Initializing Sentinel-Z Zcash Signer Daemon on network: {}",
        config.network_name
    );

    let store = wallet::store::WalletStore::open(&config.db_path)?;
    let manager = Arc::new(wallet::manager::WalletManager::new(config.clone(), store));

    match manager.get_address() {
        Ok(acc) => {
            tracing::info!(
                "Primary wallet loaded. UA: {} (Fingerprint: {})",
                acc.unified_address,
                acc.seed_fingerprint
            );
        }
        Err(e) => {
            tracing::warn!("Failed to load or initialize primary wallet: {:?}", e);
        }
    }

    let router = api::routes::create_router(manager);
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Sentinel-Z Zcash Signer Daemon listening on http://{}", addr);

    axum::serve(listener, router).await?;

    Ok(())
}
