<?php

declare(strict_types=1);

$secret = getenv('PAYGATE_WEBHOOK_SECRET');
$timestamp = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$rawBody = file_get_contents('php://input');

if (!$secret) {
    http_response_code(500);
    echo json_encode(['error' => 'PAYGATE_WEBHOOK_SECRET is required']);
    exit;
}

if ($timestamp === '' || $signature === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing webhook headers']);
    exit;
}

$now = time();
if (abs($now - (int) $timestamp) > 300) {
    http_response_code(400);
    echo json_encode(['error' => 'Webhook timestamp is too old']);
    exit;
}

$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid webhook signature']);
    exit;
}

$payload = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);

// Simpan perubahan status order ke database merchant.
error_log(sprintf(
    'PayGate webhook accepted for order %s with status %s',
    $payload['transaction']['order_id'],
    $payload['transaction']['status']
));

http_response_code(200);
header('Content-Type: application/json');
echo json_encode(['received' => true]);
