use anyhow::{anyhow, Result};
use hmac::{Hmac, Mac};
use reqwest::{Client as HttpClient, Method};
use serde_json::{json, Value};
use sha2::Sha256;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

pub struct PayGateClient {
    base_url: String,
    api_token: String,
    http: HttpClient,
}

impl PayGateClient {
    pub fn new(base_url: impl Into<String>, api_token: impl Into<String>) -> Result<Self> {
        Ok(Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
            api_token: api_token.into(),
            http: HttpClient::builder()
                .timeout(Duration::from_secs(10))
                .build()?,
        })
    }

    pub async fn charge(&self, payload: Value, idempotency_key: Option<&str>) -> Result<Value> {
        let mut request = self.request(Method::POST, "/v1/transactions/charge");
        if let Some(value) = idempotency_key {
            request = request.header("Idempotency-Key", value);
        }

        self.send(request.json(&payload)).await
    }

    pub async fn get_transaction(&self, order_id: &str) -> Result<Value> {
        self.send(self.request(
            Method::GET,
            &format!("/v1/transactions/{}", urlencoding::encode(order_id)),
        ))
        .await
    }

    pub async fn list_audit_logs(&self, params: &[(&str, &str)]) -> Result<Value> {
        self.send(self.request(Method::GET, "/v1/audit-logs").query(params))
            .await
    }

    pub fn verify_webhook(
        &self,
        raw_body: &str,
        timestamp: &str,
        signature: &str,
        webhook_secret: &str,
        max_skew_seconds: u64,
    ) -> Result<Value> {
        let unix: u64 = timestamp.parse().map_err(|_| anyhow!("Webhook timestamp is not valid"))?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let delta = now.abs_diff(unix);
        if delta > max_skew_seconds {
            return Err(anyhow!("Webhook timestamp is too old"));
        }

        let mut mac = HmacSha256::new_from_slice(webhook_secret.as_bytes())?;
        mac.update(format!("{timestamp}.{raw_body}").as_bytes());
        let expected = format!("sha256={}", hex::encode(mac.finalize().into_bytes()));
        if expected != signature {
            return Err(anyhow!("Webhook signature is not valid"));
        }

        Ok(serde_json::from_str(raw_body)?)
    }

    fn request(&self, method: Method, path: &str) -> reqwest::RequestBuilder {
        self.http
            .request(method, format!("{}{}", self.base_url, path))
            .bearer_auth(&self.api_token)
            .header("Accept", "application/json")
    }

    async fn send(&self, request: reqwest::RequestBuilder) -> Result<Value> {
        let response = request.send().await?;
        let status = response.status();
        let payload: Value = response.json().await?;

        if !status.is_success() || !payload["success"].as_bool().unwrap_or(false) {
            return Err(anyhow!(
                "PayGate request failed: {}",
                payload["error"]["message"].as_str().unwrap_or("Unknown error")
            ));
        }

        Ok(payload["data"].clone())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let client = PayGateClient::new(
        "https://paygate.digixsolution.net",
        std::env::var("PAYGATE_STORE_API_TOKEN")?,
    )?;

    let transaction = client
        .charge(
            json!({
                "order_id": "INV-2026-0001",
                "amount": 150000,
                "currency": "IDR",
                "payment_type": "bank_transfer",
                "bank": "bsi",
                "customer": {
                    "name": "Budi",
                    "email": "budi@example.com",
                    "phone": "+628123456789"
                },
                "items": [{
                    "id": "SKU-1",
                    "name": "Kaos PayGate",
                    "qty": 1,
                    "price": 150000
                }]
            }),
            Some("idem_INV-2026-0001"),
        )
        .await?;

    println!("{transaction:#}");
    Ok(())
}
