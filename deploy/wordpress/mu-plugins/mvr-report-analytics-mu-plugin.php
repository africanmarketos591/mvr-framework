<?php
/**
 * Plugin Name: MVR Report Analytics Bridge
 * Description: Privacy-respecting report view/download telemetry for African Market OS public reports.
 * Version: 1.0.0
 * Author: African Market OS
 */

if (!defined('ABSPATH')) {
    exit;
}

const MVR_REPORT_ANALYTICS_EMAIL = 'info@africanmarketos.com';
const MVR_REPORT_ANALYTICS_SLUG = 'kenya-retail-relational-readiness-2026';
const MVR_REPORT_ANALYTICS_PDF = '/reports/kenya-retail-relational-readiness-2026/Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf';

add_action('template_redirect', 'mvr_report_analytics_serve_public_report', 0);

add_action('rest_api_init', function () {
    register_rest_route('mvr/v1', '/report-event', [
        'methods' => 'POST',
        'callback' => 'mvr_report_analytics_event',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('mvr/v1', '/report-download', [
        'methods' => 'GET',
        'callback' => 'mvr_report_analytics_download',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('mvr/v1', '/report-stats', [
        'methods' => 'GET',
        'callback' => 'mvr_report_analytics_stats',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        },
    ]);
});

add_action('init', function () {
    if (!wp_next_scheduled('mvr_report_analytics_daily_summary')) {
        wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'mvr_report_analytics_daily_summary');
    }
});

add_action('mvr_report_analytics_daily_summary', 'mvr_report_analytics_send_daily_summary');

function mvr_report_analytics_serve_public_report() {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    $base = '/reports/' . MVR_REPORT_ANALYTICS_SLUG;

    if ($path !== $base && strpos($path, $base . '/') !== 0) {
        return;
    }

    $relative = trim(substr($path, strlen($base)), '/');
    if ($relative === '') {
        $relative = 'index.html';
    }

    $allowed = [
        'index.html' => 'text/html; charset=utf-8',
        'source-notes.html' => 'text/html; charset=utf-8',
        'designed-report.html' => 'text/html; charset=utf-8',
        'report-metadata.json' => 'application/json; charset=utf-8',
        'Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf' => 'application/pdf',
    ];

    if (!isset($allowed[$relative])) {
        return;
    }

    $file = mvr_report_analytics_find_report_file($relative);
    if (!is_readable($file)) {
        return;
    }

    if ($relative === 'Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf') {
        mvr_report_analytics_log('direct_pdf_view', MVR_REPORT_ANALYTICS_SLUG, [
            'path' => $path,
            'href' => home_url($path),
            'target' => $path,
        ]);
    }

    status_header(200);
    header('Content-Type: ' . $allowed[$relative]);
    header('Cache-Control: public, max-age=300');
    header('X-Robots-Tag: index, follow');

    if ($relative === 'Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf') {
        header('Content-Length: ' . filesize($file));
        header('Content-Disposition: inline; filename="Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf"');
    }

    readfile($file);
    exit;
}

function mvr_report_analytics_find_report_file($relative) {
    $relative = ltrim($relative, '/\\');
    $candidates = [
        trailingslashit(ABSPATH) . 'reports/' . MVR_REPORT_ANALYTICS_SLUG . '/' . $relative,
        trailingslashit(WP_CONTENT_DIR) . 'uploads/mvr-reports/' . MVR_REPORT_ANALYTICS_SLUG . '/' . $relative,
        trailingslashit(__DIR__) . 'mvr-report-assets/' . MVR_REPORT_ANALYTICS_SLUG . '/' . $relative,
    ];

    foreach ($candidates as $candidate) {
        if (is_readable($candidate)) {
            return $candidate;
        }
    }

    return '';
}

function mvr_report_analytics_event(WP_REST_Request $request) {
    $payload = json_decode($request->get_body(), true);
    if (!is_array($payload)) {
        $payload = $request->get_params();
    }

    $event = sanitize_key($payload['event'] ?? 'unknown_event');
    $slug = sanitize_title($payload['slug'] ?? MVR_REPORT_ANALYTICS_SLUG);
    $path = sanitize_text_field($payload['path'] ?? '');
    $href = esc_url_raw($payload['href'] ?? '');
    $target = esc_url_raw($payload['target'] ?? '');
    $title = sanitize_text_field($payload['title'] ?? '');

    mvr_report_analytics_log($event, $slug, [
        'path' => $path,
        'href' => $href,
        'target' => $target,
        'title' => $title,
    ]);

    return new WP_REST_Response([
        'ok' => true,
        'service' => 'mvr-report-analytics',
        'event' => $event,
        'slug' => $slug,
    ], 200);
}

function mvr_report_analytics_download(WP_REST_Request $request) {
    $slug = sanitize_title($request->get_param('slug') ?: MVR_REPORT_ANALYTICS_SLUG);
    $target = esc_url_raw($request->get_param('target') ?: MVR_REPORT_ANALYTICS_PDF);

    if ($slug !== MVR_REPORT_ANALYTICS_SLUG || $target !== MVR_REPORT_ANALYTICS_PDF) {
        return new WP_REST_Response([
            'ok' => false,
            'error' => 'invalid_report_download_target',
        ], 400);
    }

    mvr_report_analytics_log('download_pdf', $slug, [
        'path' => $target,
        'href' => home_url($target),
        'target' => $target,
    ]);

    $file = mvr_report_analytics_find_report_file('Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf');
    if (is_readable($file)) {
        status_header(200);
        header('Content-Type: application/pdf');
        header('Cache-Control: private, max-age=0, no-store');
        header('Content-Length: ' . filesize($file));
        header('Content-Disposition: attachment; filename="Kenya_Retail_Relational_Readiness_Report_2026_v1.pdf"');
        readfile($file);
        exit;
    }

    wp_safe_redirect(home_url($target), 302);
    exit;
}

function mvr_report_analytics_stats(WP_REST_Request $request) {
    $date = sanitize_text_field($request->get_param('date') ?: gmdate('Y-m-d'));
    return new WP_REST_Response(mvr_report_analytics_read_summary($date), 200);
}

function mvr_report_analytics_log($event, $slug, array $extra = []) {
    $dir = mvr_report_analytics_dir();
    if (!wp_mkdir_p($dir)) {
        return false;
    }

    if (!file_exists($dir . '/index.html')) {
        file_put_contents($dir . '/index.html', '');
    }
    if (!file_exists($dir . '/.htaccess')) {
        file_put_contents($dir . '/.htaccess', "Deny from all\n");
    }

    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $record = [
        'ts' => gmdate('c'),
        'event' => sanitize_key($event),
        'slug' => sanitize_title($slug),
        'ip_hash' => hash_hmac('sha256', $ip, wp_salt('auth')),
        'country' => sanitize_text_field($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''),
        'user_agent' => substr(sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300),
        'referrer' => esc_url_raw($_SERVER['HTTP_REFERER'] ?? ''),
        'method' => sanitize_text_field($_SERVER['REQUEST_METHOD'] ?? ''),
        'extra' => $extra,
    ];

    $file = $dir . '/events-' . gmdate('Y-m') . '.jsonl';
    return file_put_contents($file, wp_json_encode($record, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
}

function mvr_report_analytics_dir() {
    return trailingslashit(WP_CONTENT_DIR) . 'mvr-private-report-events';
}

function mvr_report_analytics_read_summary($date) {
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : gmdate('Y-m-d');
    $month = substr($date, 0, 7);
    $file = mvr_report_analytics_dir() . '/events-' . $month . '.jsonl';
    $summary = [
        'date' => $date,
        'total_events' => 0,
        'unique_visitors' => 0,
        'events' => [],
        'slugs' => [],
        'countries' => [],
        'referrers' => [],
        'ai_user_agents' => [],
    ];

    if (!file_exists($file)) {
        return $summary;
    }

    $seen = [];
    $fh = fopen($file, 'r');
    if (!$fh) {
        return $summary;
    }

    while (($line = fgets($fh)) !== false) {
        $row = json_decode($line, true);
        if (!is_array($row) || strpos($row['ts'] ?? '', $date) !== 0) {
            continue;
        }
        $summary['total_events']++;
        $seen[$row['ip_hash'] ?? ''] = true;
        mvr_report_analytics_inc($summary['events'], $row['event'] ?? 'unknown');
        mvr_report_analytics_inc($summary['slugs'], $row['slug'] ?? 'unknown');
        mvr_report_analytics_inc($summary['countries'], $row['country'] ?: 'unknown');

        $ref = parse_url($row['referrer'] ?? '', PHP_URL_HOST) ?: 'direct';
        mvr_report_analytics_inc($summary['referrers'], $ref);

        $ua = strtolower($row['user_agent'] ?? '');
        if (preg_match('/chatgpt|oai-searchbot|claude|perplexity|googlebot|bingbot|gptbot|copilot|gemini|grok/', $ua, $m)) {
            mvr_report_analytics_inc($summary['ai_user_agents'], $m[0]);
        }
    }
    fclose($fh);

    unset($seen['']);
    $summary['unique_visitors'] = count($seen);
    arsort($summary['events']);
    arsort($summary['slugs']);
    arsort($summary['countries']);
    arsort($summary['referrers']);
    arsort($summary['ai_user_agents']);

    return $summary;
}

function mvr_report_analytics_inc(array &$map, $key) {
    $key = (string) $key;
    if ($key === '') {
        $key = 'unknown';
    }
    $map[$key] = ($map[$key] ?? 0) + 1;
}

function mvr_report_analytics_send_daily_summary() {
    $date = gmdate('Y-m-d', time() - DAY_IN_SECONDS);
    $summary = mvr_report_analytics_read_summary($date);
    if (($summary['total_events'] ?? 0) < 1) {
        return;
    }

    $body = "MVR report traffic summary for {$date}\n\n";
    $body .= "Total events: {$summary['total_events']}\n";
    $body .= "Estimated unique visitors: {$summary['unique_visitors']}\n\n";
    $body .= "Events:\n" . mvr_report_analytics_format_map($summary['events']) . "\n";
    $body .= "Countries:\n" . mvr_report_analytics_format_map($summary['countries']) . "\n";
    $body .= "Referrers:\n" . mvr_report_analytics_format_map($summary['referrers']) . "\n";
    $body .= "AI user-agent signals:\n" . mvr_report_analytics_format_map($summary['ai_user_agents']) . "\n";
    $body .= "\nStats endpoint for WordPress admins: " . home_url('/wp-json/mvr/v1/report-stats?date=' . rawurlencode($date)) . "\n";

    wp_mail(MVR_REPORT_ANALYTICS_EMAIL, "MVR report traffic summary - {$date}", $body, [
        'From: African Market OS <info@africanmarketos.com>',
    ]);
}

function mvr_report_analytics_format_map(array $map) {
    if (!$map) {
        return "- none\n";
    }
    $out = '';
    foreach (array_slice($map, 0, 12, true) as $key => $value) {
        $out .= "- {$key}: {$value}\n";
    }
    return $out;
}
