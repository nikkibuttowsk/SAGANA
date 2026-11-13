<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

class ApiException extends RuntimeException
{
    public $status;

    public function __construct($status, $message)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

function respond($status, $body)
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function requireEnvironment($name)
{
    $value = getenv($name);
    if ($value === false || trim($value) === '') {
        throw new RuntimeException("Server configuration is missing {$name}.");
    }
    return trim($value);
}

function readJsonBody()
{
    $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($contentLength > 16384) {
        throw new ApiException(413, 'Request is too large.');
    }

    $raw = file_get_contents('php://input', false, null, 0, 16385);
    if ($raw === false || strlen($raw) > 16384) {
        throw new ApiException(413, 'Request is too large.');
    }
    try {
        $body = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new ApiException(400, 'Invalid JSON request body.');
    }

    if (!is_array($body) || $raw === '' || substr(ltrim($raw), 0, 1) !== '{') {
        throw new ApiException(400, 'A JSON object is required.');
    }
    return $body;
}

function rateLimit($bucket, $limit, $windowSeconds)
{
    $directory = getenv('SAGANA_RATE_LIMIT_DIR');
    if ($directory === false || trim($directory) === '') {
        $directory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sagana-rate-limits';
    }

    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Unable to initialize rate limiting.');
    }

    $file = $directory . DIRECTORY_SEPARATOR . hash('sha256', $bucket) . '.json';
    $handle = fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        throw new RuntimeException('Unable to access rate limiting state.');
    }
    chmod($file, 0600);

    $contents = stream_get_contents($handle);
    $state = [];
    if ($contents !== '') {
        $state = json_decode($contents, true);
        if (!is_array($state)) {
            flock($handle, LOCK_UN);
            fclose($handle);
            throw new RuntimeException('Rate limiting state is invalid.');
        }
    }

    $now = time();
    foreach ($state as $key => $timestamps) {
        if (!is_array($timestamps)) {
            unset($state[$key]);
            continue;
        }
        $active = array_values(array_filter($timestamps, function ($timestamp) use ($now, $windowSeconds) {
            return is_int($timestamp) && $timestamp > $now - $windowSeconds;
        }));
        if ($active) {
            $state[$key] = $active;
        } else {
            unset($state[$key]);
        }
    }

    $address = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $key = hash('sha256', $bucket . "\0" . $address);
    $timestamps = isset($state[$key]) ? $state[$key] : [];
    if (count($timestamps) >= $limit) {
        $retryAfter = max(1, $windowSeconds - ($now - min($timestamps)));
        flock($handle, LOCK_UN);
        fclose($handle);
        header('Retry-After: ' . $retryAfter);
        throw new ApiException(429, 'Too many requests. Please try again later.');
    }

    $state[$key][] = $now;
    rewind($handle);
    if (!ftruncate($handle, 0) || fwrite($handle, json_encode($state)) === false || !fflush($handle)) {
        flock($handle, LOCK_UN);
        fclose($handle);
        throw new RuntimeException('Unable to update rate limiting state.');
    }
    flock($handle, LOCK_UN);
    fclose($handle);
}

function supabaseRequest($method, $path, $payload = null)
{
    $baseUrl = rtrim(requireEnvironment('SUPABASE_URL'), '/');
    $urlParts = parse_url($baseUrl);
    if (!$urlParts || !isset($urlParts['scheme'], $urlParts['host']) || $urlParts['scheme'] !== 'https') {
        throw new RuntimeException('SUPABASE_URL must be an HTTPS URL.');
    }
    $serviceKey = requireEnvironment('SUPABASE_SERVICE_ROLE_KEY');
    $headers = [
        'apikey: ' . $serviceKey,
        'Authorization: Bearer ' . $serviceKey,
        'Accept: application/json',
        'Content-Type: application/json',
        'Prefer: return=representation',
    ];

    $curl = curl_init($baseUrl . '/rest/v1/' . $path);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize Supabase request.');
    }
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
    ]);
    if ($payload !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($payload, JSON_THROW_ON_ERROR));
    }

    $response = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    if (PHP_VERSION_ID < 80000) {
        curl_close($curl);
    }

    if ($response === false) {
        error_log('SAGANA Supabase request failed: ' . $curlError);
        throw new RuntimeException('The database service is unavailable.');
    }
    if ($status < 200 || $status >= 300) {
        error_log('SAGANA Supabase request returned HTTP ' . $status);
        throw new RuntimeException('The database service could not complete the request.');
    }

    try {
        return json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new RuntimeException('The database service returned an invalid response.');
    }
}

function validateText($value, $field, $maxLength, $required = true)
{
    if (!is_string($value)) {
        if (!$required && ($value === null || $value === '')) {
            return '';
        }
        throw new ApiException(422, $field . ' is invalid.');
    }
    $value = trim($value);
    if (($required && $value === '') || strlen($value) > $maxLength) {
        throw new ApiException(422, $field . ' is invalid.');
    }
    return $value;
}

function validateReservation($body)
{
    $farmIdValue = isset($body['farm_id']) ? $body['farm_id'] : null;
    if (!is_string($farmIdValue) && !is_int($farmIdValue)) {
        throw new ApiException(422, 'A valid farm is required.');
    }
    $farmId = (string) $farmIdValue;
    if (!preg_match('/\A[A-Za-z0-9_-]{1,64}\z/', $farmId)) {
        throw new ApiException(422, 'A valid farm is required.');
    }
    $name = validateText(isset($body['visitor_name']) ? $body['visitor_name'] : null, 'Visitor name', 120);
    $email = validateText(isset($body['visitor_email']) ? $body['visitor_email'] : null, 'Email', 254);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new ApiException(422, 'A valid email is required.');
    }
    $phone = validateText(isset($body['visitor_phone']) ? $body['visitor_phone'] : null, 'Phone number', 30);
    if (!preg_match('/\A[0-9+().\-\s]{7,30}\z/', $phone)) {
        throw new ApiException(422, 'A valid phone number is required.');
    }

    $date = validateText(isset($body['visit_date']) ? $body['visit_date'] : null, 'Visit date', 10);
    $visitDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Manila'));
    $dateErrors = DateTimeImmutable::getLastErrors();
    if (!$visitDate || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count'])) ||
        $visitDate->format('Y-m-d') !== $date) {
        throw new ApiException(422, 'A valid visit date is required.');
    }
    $today = new DateTimeImmutable('today', new DateTimeZone('Asia/Manila'));
    if ($visitDate < $today || $visitDate > $today->modify('+180 days')) {
        throw new ApiException(422, 'Visit dates must be within the next 180 days.');
    }

    $timeSlot = validateText(isset($body['time_slot']) ? $body['time_slot'] : null, 'Time slot', 20);
    $allowedSlots = ['08:00 - 10:00', '10:00 - 12:00', '13:00 - 15:00', '15:00 - 17:00'];
    if (!in_array($timeSlot, $allowedSlots, true)) {
        throw new ApiException(422, 'A valid time slot is required.');
    }

    $guestCountValue = isset($body['guest_count']) ? $body['guest_count'] : null;
    if (!is_string($guestCountValue) && !is_int($guestCountValue)) {
        throw new ApiException(422, 'Guest count must be between 1 and 100.');
    }
    $guestCount = filter_var($guestCountValue, FILTER_VALIDATE_INT);
    if ($guestCount === false || $guestCount < 1 || $guestCount > 100) {
        throw new ApiException(422, 'Guest count must be between 1 and 100.');
    }
    $idempotencyKey = validateText(isset($body['idempotency_key']) ? $body['idempotency_key'] : null, 'Reservation key', 80);
    if (!preg_match('/\A[A-Za-z0-9_-]+\z/', $idempotencyKey)) {
        throw new ApiException(422, 'Reservation key is invalid.');
    }

    $farms = supabaseRequest('GET', 'farms_public?id=eq.' . rawurlencode($farmId) . '&select=id&limit=1');
    if (!is_array($farms) || count($farms) !== 1) {
        throw new ApiException(422, 'The selected farm is not available.');
    }

    return [
        'farm_id' => $farmId,
        'visitor_name' => $name,
        'visitor_email' => $email,
        'visitor_phone' => $phone,
        'visit_date' => $date,
        'time_slot' => $timeSlot,
        'guest_count' => $guestCount,
        'idempotency_key' => $idempotencyKey,
    ];
}

function validateFarmSubmission($body)
{
    if (!empty($body['website'])) {
        throw new ApiException(422, 'Farm submission could not be accepted.');
    }

    $name = validateText(isset($body['name']) ? $body['name'] : null, 'Farm name', 120);
    $province = validateText(isset($body['province']) ? $body['province'] : null, 'Province', 120);
    $location = validateText(isset($body['location']) ? $body['location'] : null, 'Location', 250);
    $adminEmail = validateText(isset($body['admin_email']) ? $body['admin_email'] : null, 'Admin email', 254);
    if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
        throw new ApiException(422, 'A valid admin email is required.');
    }
    $feeValue = isset($body['entrance_fee']) ? $body['entrance_fee'] : null;
    if ((!is_string($feeValue) && !is_int($feeValue) && !is_float($feeValue)) || !is_finite((float) $feeValue)) {
        throw new ApiException(422, 'A valid entrance fee is required.');
    }
    $fee = filter_var($feeValue, FILTER_VALIDATE_FLOAT);
    if ($fee === false || $fee < 0 || $fee > 1000000) {
        throw new ApiException(422, 'A valid entrance fee is required.');
    }
    if (!isset($body['crops']) || !is_array($body['crops']) || count($body['crops']) < 1 || count($body['crops']) > 20) {
        throw new ApiException(422, 'Please provide between 1 and 20 crops.');
    }
    $crops = [];
    foreach ($body['crops'] as $crop) {
        $crops[] = validateText($crop, 'Crop name', 60);
    }
    $season = validateText(isset($body['season']) ? $body['season'] : null, 'Season', 10);
    if (!in_array($season, ['dry', 'wet', 'all'], true)) {
        throw new ApiException(422, 'A valid season is required.');
    }
    $bearingSeason = validateText(isset($body['bearing_season']) ? $body['bearing_season'] : null, 'Bearing season', 100, false);
    $hours = validateText(isset($body['hours']) ? $body['hours'] : null, 'Operating hours', 120, false);
    $description = validateText(isset($body['description']) ? $body['description'] : null, 'Description', 2000, false);

    $latitudeValue = isset($body['latitude']) ? $body['latitude'] : null;
    $longitudeValue = isset($body['longitude']) ? $body['longitude'] : null;
    foreach ([$latitudeValue, $longitudeValue] as $coordinate) {
        if ($coordinate !== null && $coordinate !== '' &&
            !is_string($coordinate) && !is_int($coordinate) && !is_float($coordinate)) {
            throw new ApiException(422, 'Map coordinates must be valid and provided together.');
        }
    }
    $latitude = $latitudeValue !== null && $latitudeValue !== '' ? filter_var($latitudeValue, FILTER_VALIDATE_FLOAT) : null;
    $longitude = $longitudeValue !== null && $longitudeValue !== '' ? filter_var($longitudeValue, FILTER_VALIDATE_FLOAT) : null;
    if (($latitude !== null && ($latitude === false || $latitude < -90 || $latitude > 90)) ||
        ($longitude !== null && ($longitude === false || $longitude < -180 || $longitude > 180)) ||
        (($latitude === null) !== ($longitude === null))) {
        throw new ApiException(422, 'Map coordinates must be valid and provided together.');
    }

    if (isset($body['images']) && !is_array($body['images'])) {
        throw new ApiException(422, 'Farm images are invalid.');
    }
    $images = isset($body['images']) ? $body['images'] : [];
    if (count($images) > 5) {
        throw new ApiException(422, 'Too many farm images were provided.');
    }
    foreach ($images as $image) {
        if ($image === 'images/default-farm.jpg') {
            continue;
        }
        if (!is_string($image) || strlen($image) > 2048 || !filter_var($image, FILTER_VALIDATE_URL) ||
            parse_url($image, PHP_URL_SCHEME) !== 'https') {
            throw new ApiException(422, 'Farm images must use valid HTTPS URLs.');
        }
    }

    return [
        'name' => $name,
        'province' => $province,
        'location' => $location,
        'admin_email' => $adminEmail,
        'entrance_fee' => (float) $fee,
        'crops' => $crops,
        'season' => $season,
        'bearing_season' => $bearingSeason !== '' ? $bearingSeason : 'All Season',
        'hours' => $hours !== '' ? $hours : '8:00 AM - 5:00 PM',
        'description' => $description !== '' ? $description : 'Welcome to our fruit farm experience!',
        'latitude' => $latitude === false ? null : $latitude,
        'longitude' => $longitude === false ? null : $longitude,
        'images' => $images ?: ['images/default-farm.jpg'],
    ];
}

function htmlEscape($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function sendReservationEmail($record)
{
    $apiKey = requireEnvironment('BREVO_API_KEY');
    $reference = isset($record['idempotency_key']) ? $record['idempotency_key'] : $record['id'];
    $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' .
        rawurlencode('SAGANA-TICKET:' . $reference);
    $safeName = htmlEscape($record['visitor_name']);
    $safeDate = htmlEscape($record['visit_date']);
    $safeSlot = htmlEscape($record['time_slot']);
    $safeGuests = htmlEscape($record['guest_count']);
    $safeReference = htmlEscape(strtoupper(substr((string) $reference, 0, 8)));
    $email = [
        'sender' => ['name' => 'SAGANA Fruit Farms', 'email' => 'sagana077@gmail.com'],
        'to' => [['email' => $record['visitor_email'], 'name' => $record['visitor_name']]],
        'subject' => 'Your Digital Ticket & Confirmation - SAGANA Farm Visit',
        'htmlContent' => '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">' .
            '<h2>Reservation Confirmed!</h2><p>Hi <strong>' . $safeName . '</strong>,</p>' .
            '<p>Your visit has been successfully booked. Please present this email or QR code at the farm entry gate.</p>' .
            '<p><strong>Date:</strong> ' . $safeDate . '<br><strong>Time slot:</strong> ' . $safeSlot .
            '<br><strong>Guests:</strong> ' . $safeGuests . '<br><strong>Ref ID:</strong> ' . $safeReference .
            '</p><img src="' . htmlEscape($qrCodeUrl) . '" alt="Digital ticket QR code" width="160" height="160">' .
            '<p>Thank you for supporting local agritourism with SAGANA!</p></div>',
    ];

    $curl = curl_init('https://api.brevo.com/v3/smtp/email');
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize email request.');
    }
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'accept: application/json',
            'api-key: ' . $apiKey,
            'content-type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($email, JSON_THROW_ON_ERROR),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    if (PHP_VERSION_ID < 80000) {
        curl_close($curl);
    }

    if ($response === false || $status < 200 || $status >= 300) {
        error_log('SAGANA email delivery failed with HTTP ' . $status . ($response === false ? ': ' . $curlError : ''));
        throw new RuntimeException('Email delivery failed.');
    }
}

try {
    $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($method === 'GET') {
        rateLimit('farm-read', 120, 60);
        if ($action === 'farms') {
            $farms = supabaseRequest('GET', 'farms_public?select=*');
            respond(200, ['data' => $farms]);
        }

        if ($action === 'farm') {
            $farmId = isset($_GET['id']) ? $_GET['id'] : '';
            if (!is_string($farmId) || !preg_match('/\A[A-Za-z0-9_-]{1,64}\z/', $farmId)) {
                throw new ApiException(400, 'A valid farm ID is required.');
            }
            $farms = supabaseRequest('GET', 'farms_public?id=eq.' . rawurlencode($farmId) . '&select=*&limit=1');
            if (!is_array($farms) || count($farms) === 0) {
                throw new ApiException(404, 'Farm not found.');
            }
            respond(200, ['data' => $farms[0]]);
        }

        throw new ApiException(404, 'Unknown API action.');
    }

    if ($method !== 'POST') {
        header('Allow: POST');
        throw new ApiException(405, 'This request method is not accepted.');
    }
    if (!isset($_SERVER['CONTENT_TYPE']) || stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== 0) {
        throw new ApiException(415, 'Content-Type must be application/json.');
    }

    $body = readJsonBody();

    if ($action === 'reservation') {
        rateLimit('reservation', 10, 900);
        $reservation = validateReservation($body);
        $rows = supabaseRequest('POST', 'reservations', $reservation);
        if (!is_array($rows) || !isset($rows[0]) || !is_array($rows[0])) {
            throw new RuntimeException('The database did not return the saved reservation.');
        }
        $emailSent = false;
        try {
            sendReservationEmail($rows[0]);
            $emailSent = true;
        } catch (Throwable $error) {
            error_log('SAGANA reservation email could not be sent: ' . $error->getMessage());
        }
        respond(201, ['data' => $rows[0], 'email_sent' => $emailSent]);
    }

    if ($action === 'farm-submission') {
        rateLimit('farm-submission', 3, 3600);
        $submission = validateFarmSubmission($body);
        $rows = supabaseRequest('POST', 'farm_submissions', ['submission' => $submission]);
        if (!is_array($rows) || !isset($rows[0]['id'])) {
            throw new RuntimeException('The database did not return the saved farm submission.');
        }
        respond(201, ['submission_id' => $rows[0]['id'], 'status' => 'pending']);
    }

    throw new ApiException(404, 'Unknown API action.');
} catch (ApiException $error) {
    respond($error->status, ['error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('SAGANA API error: ' . $error->getMessage());
    respond(500, ['error' => 'The request could not be completed. Please try again later.']);
}
