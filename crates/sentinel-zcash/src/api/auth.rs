use axum::{
    extract::Request,
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use crate::wallet::manager::WalletManager;

pub async fn auth_middleware(
    state: axum::extract::State<Arc<WalletManager>>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if let Some(expected_token) = &state.config().auth_token {
        let auth_header = req.headers().get(AUTHORIZATION);
        match auth_header {
            Some(val) => {
                let val_str = val.to_str().map_err(|_| StatusCode::UNAUTHORIZED)?;
                let prefix = "Bearer ";
                if !val_str.starts_with(prefix) {
                    return Err(StatusCode::UNAUTHORIZED);
                }
                let token = &val_str[prefix.len()..];
                if token != expected_token {
                    return Err(StatusCode::UNAUTHORIZED);
                }
            }
            None => return Err(StatusCode::UNAUTHORIZED),
        }
    }

    Ok(next.run(req).await)
}

