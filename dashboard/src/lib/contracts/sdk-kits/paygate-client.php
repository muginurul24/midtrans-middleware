<?php

final class PayGateApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $statusCode = null,
        public readonly ?string $errorCode = null,
        public readonly ?string $requestId = null,
    ) {
        parent::__construct($message);
    }
}

final class PayGateClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiToken,
        private readonly int $timeoutSeconds = 10,
    ) {
        if ($this->baseUrl === '' || $this->apiToken === '') {
            throw new InvalidArgumentException('baseUrl and apiToken are required.');
        }
    }

    public function charge(array $payload, ?string $idempotencyKey = null): array
    {
        $headers = $idempotencyKey ? ['Idempotency-Key: ' . $idempotencyKey] : [];
        return $this->request('POST', '/v1/transactions/charge', $payload, $headers);
    }

    public function getTransaction(string $orderId): array
    {
        return $this->request('GET', '/v1/transactions/' . rawurlencode($orderId));
    }

    public function listAuditLogs(array $query = []): array
    {
        $query = array_filter($query, static fn ($value) => $value !== null && $value !== '');
        $path = '/v1/audit-logs';
        if ($query !== []) {
            $path .= '?' . http_build_query($query);
        }

        return $this->request('GET', $path);
    }

    public function verifyWebhook(
        string $rawBody,
        string $timestamp,
        string $signature,
        string $webhookSecret,
        int $maxSkewSeconds = 300,
    ): array {
        if ($rawBody === '' || $timestamp === '' || $signature === '' || $webhookSecret === '') {
            throw new InvalidArgumentException('Webhook body, timestamp, signature, and secret are required.');
        }

        $unix = (int) $timestamp;
        if (abs(time() - $unix) > $maxSkewSeconds) {
            throw new RuntimeException('Webhook timestamp is too old.');
        }

        $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $webhookSecret);
        if (!hash_equals($expected, $signature)) {
            throw new RuntimeException('Webhook signature is not valid.');
        }

        return json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
    }

    private function request(
        string $method,
        string $path,
        ?array $body = null,
        array $extraHeaders = [],
    ): array {
        $url = rtrim($this->baseUrl, '/') . $path;
        $headers = array_merge([
            'Accept: application/json',
            'Authorization: Bearer ' . $this->apiToken,
        ], $extraHeaders);

        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR));
        }

        $raw = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if ($raw === false) {
            throw new RuntimeException('Unable to reach PayGate: ' . curl_error($ch));
        }
        curl_close($ch);

        $payload = json_decode($raw, true);
        if ($status < 200 || $status >= 300 || ($payload['success'] ?? false) !== true) {
            throw new PayGateApiException(
                $payload['error']['message'] ?? 'PayGate request failed.',
                $status,
                $payload['error']['code'] ?? null,
                $payload['error']['request_id'] ?? null,
            );
        }

        return $payload['data'] ?? [];
    }
}

$client = new PayGateClient(
    baseUrl: 'https://paygate.digixsolution.net',
    apiToken: $_ENV['PAYGATE_STORE_API_TOKEN'] ?? '',
);

$transaction = $client->charge([
    'order_id' => 'INV-2026-0001',
    'amount' => 150000,
    'currency' => 'IDR',
    'payment_type' => 'bank_transfer',
    'bank' => 'bsi',
    'customer' => [
        'name' => 'Budi',
        'email' => 'budi@example.com',
        'phone' => '+628123456789',
    ],
    'items' => [
        [
            'id' => 'SKU-1',
            'name' => 'Kaos PayGate',
            'qty' => 1,
            'price' => 150000,
        ],
    ],
], 'idem_INV-2026-0001');

print_r($transaction);
