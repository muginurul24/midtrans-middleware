use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::json;
use sha2::Sha256;
use std::{net::SocketAddr, sync::Arc, time::{SystemTime, UNIX_EPOCH}};

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
struct AppState {
    webhook_secret: Arc<String>,
}

#[derive(Deserialize)]
struct WebhookPayload {
    transaction: Transaction,
}

#[derive(Deserialize)]
struct Transaction {
    order_id: String,
    status: String,
}

#[tokio::main]
async fn main() {
    let webhook_secret = std::env::var("PAYGATE_WEBHOOK_SECRET")
        .expect("PAYGATE_WEBHOOK_SECRET is required");

    let app = Router::new()
        .route("/api/paygate/webhook", post(handle_webhook))
        .with_state(AppState {
            webhook_secret: Arc::new(webhook_secret),
        });

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("PayGate webhook receiver listening on {}", addr);
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app)
        .await
        .unwrap();
}

async fn handle_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let timestamp = match headers.get("x-webhook-timestamp").and_then(|value| value.to_str().ok()) {
        Some(value) => value,
        None => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "missing timestamp" }))).into_response(),
    };

    let signature = match headers.get("x-webhook-signature").and_then(|value| value.to_str().ok()) {
        Some(value) => value,
        None => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "missing signature" }))).into_response(),
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let ts = match timestamp.parse::<i64>() {
        Ok(value) if (now - value).abs() <= 300 => value,
        _ => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "webhook timestamp is too old" }))).into_response(),
    };

    let raw_body = match String::from_utf8(body.to_vec()) {
        Ok(value) => value,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "invalid utf8 body" }))).into_response(),
    };

    let mut mac = HmacSha256::new_from_slice(state.webhook_secret.as_bytes()).unwrap();
    mac.update(timestamp.as_bytes());
    mac.update(b".");
    mac.update(raw_body.as_bytes());
    let expected = format!("sha256={}", hex::encode(mac.finalize().into_bytes()));
    if expected != signature {
        return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "invalid webhook signature" }))).into_response();
    }

    let payload: WebhookPayload = match serde_json::from_str(&raw_body) {
        Ok(value) => value,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "invalid json body" }))).into_response(),
    };

    println!(
        "PayGate webhook accepted order={} status={} timestamp={}",
        payload.transaction.order_id,
        payload.transaction.status,
        ts
    );

    (StatusCode::OK, Json(json!({ "received": true }))).into_response()
}
