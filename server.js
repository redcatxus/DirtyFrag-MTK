const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const APK_DIR = path.join(__dirname, 'app/build/outputs/apk/debug');
const APK_PATH = path.join(APK_DIR, 'app-debug.apk');
const KITTYFRAG_APK_PATH = path.join(APK_DIR, 'kittyfrag.apk');
const DIRTYFRAG_APK_PATH = path.join(APK_DIR, 'dirtyfrag.apk');

function getApkStats() {
    let target = fs.existsSync(KITTYFRAG_APK_PATH) ? KITTYFRAG_APK_PATH : (fs.existsSync(DIRTYFRAG_APK_PATH) ? DIRTYFRAG_APK_PATH : APK_PATH);
    if (fs.existsSync(target)) {
        const stats = fs.statSync(target);
        return {
            available: true,
            sizeBytes: stats.size,
            sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
            mtime: stats.mtime.toISOString(),
            filename: path.basename(target)
        };
    }
    return { available: false, sizeBytes: 0, sizeMb: '0', mtime: null, filename: 'kittyfrag.apk' };
}

function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Download APK routes
    if (url.pathname === '/download/dirtyfrag.apk' || url.pathname === '/download/kittyfrag.apk' || url.pathname === '/download/app-debug.apk' || url.pathname === '/download') {
        const target = fs.existsSync(KITTYFRAG_APK_PATH) ? KITTYFRAG_APK_PATH : (fs.existsSync(DIRTYFRAG_APK_PATH) ? DIRTYFRAG_APK_PATH : APK_PATH);
        if (fs.existsSync(target)) {
            const stat = fs.statSync(target);
            res.writeHead(200, {
                'Content-Type': 'application/vnd.android.package-archive',
                'Content-Length': stat.size,
                'Content-Disposition': 'attachment; filename="kittyfrag.apk"'
            });
            return fs.createReadStream(target).pipe(res);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('APK not found. Please build the project first.');
    }

    // Icon routes
    if (url.pathname === '/kittyfrag_icon.png' || url.pathname === '/favicon.ico') {
        const iconPath = path.join(__dirname, 'kittyfrag_icon.png');
        if (fs.existsSync(iconPath)) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            return fs.createReadStream(iconPath).pipe(res);
        }
    }
    if (url.pathname === '/kittyfrag_icon.svg') {
        const svgPath = path.join(__dirname, 'kittyfrag_icon.svg');
        if (fs.existsSync(svgPath)) {
            res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
            return fs.createReadStream(svgPath).pipe(res);
        }
    }

    // Status API route
    if (url.pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(getApkStats()));
    }

    // Main Web View (Interactive Android MDE3 Preview)
    if (url.pathname === '/' || url.pathname === '/index.html') {
        const apk = getApkStats();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KittyFrag</title>
  <link rel="icon" type="image/png" href="/kittyfrag_icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0e1114;
      --surface-container-lowest: #0c0e12;
      --surface-container-low: #191c20;
      --surface-container: #1d2024;
      --surface-container-high: #272a2f;
      --surface-terminal: #0D0E11;
      --outline: #8d9199;
      --outline-variant: #43474e;
      --log-gutter: #8d9199;
      --log-time: #8d9199;
      --log-ink: #e6edf3;
      --log-info: #c3c6cf;
      --primary: #92ccff;
      --on-primary: #003353;
      --secondary: #b8c8da;
      --secondary-container: #394857;
      --on-secondary-container: #d4e4f6;
      --on-surface: #e1e2e8;
      --on-surface-variant: #c3c6cf;
      --ink-terminal: #e6edf3;
      --color-warn: #ffd566;
      --color-success: #7bd58c;
      --color-error: #f2b8b5;
      --radius-card: 20px;
    }

    /* Light Theme overrides */
    [data-theme="light"] {
      --bg: #f8f9fe;
      --surface-container-lowest: #ffffff;
      --surface-container-low: #f7f9ff;
      --surface-container: #f1f3fa;
      --surface-container-high: #ebecef;
      --surface-terminal: #eef2f6;
      --outline: #73777f;
      --outline-variant: #c4c7d0;
      --log-gutter: #73777f;
      --log-time: #73777f;
      --log-ink: #1a1c1e;
      --log-info: #43474e;
      --primary: #00639b;
      --on-primary: #ffffff;
      --secondary: #51606f;
      --secondary-container: #d5e4f7;
      --on-secondary-container: #0e1d2a;
      --on-surface: #191c20;
      --on-surface-variant: #43474e;
      --ink-terminal: #1a1c1e;
      --color-warn: #7d5700;
      --color-success: #146c2e;
      --color-error: #ba1a1a;
    }

    /* AMOLED Theme overrides (Pure pitch black #000000 with dedicated log colors immune to OLED outline) */
    [data-theme="amoled"] {
      --bg: #000000;
      --surface-container-lowest: #000000;
      --surface-container-low: #000000;
      --surface-container: #000000;
      --surface-container-high: #0a0a0a;
      --surface-terminal: #0D0E11;
      --outline: #33373e;
      --outline-variant: #1c2026;
      /* Text logs colors are unaffected by AMOLED mode */
      --log-gutter: #8d9199;
      --log-time: #8d9199;
      --log-ink: #e6edf3;
      --log-info: #c3c6cf;
      --primary: #92ccff;
      --on-primary: #003353;
      --secondary: #b8c8da;
      --secondary-container: #394857;
      --on-secondary-container: #d4e4f6;
      --on-surface: #e1e2e8;
      --on-surface-variant: #c3c6cf;
      --ink-terminal: #e6edf3;
      --color-warn: #ffd566;
      --color-success: #7bd58c;
      --color-error: #f2b8b5;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #06080b;
      color: #e1e2e8;
      font-family: 'Roboto Flex', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 16px 12px 32px;
    }

    .top-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #1d2024;
      border: 1px solid #43474e;
      padding: 8px 16px;
      border-radius: 9999px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #c3c6cf;
    }
    .top-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade8088;
    }
    .dl-btn {
      background: #92ccff;
      color: #003353;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.2s, transform 0.1s;
    }
    .dl-btn:hover { opacity: 0.9; transform: translateY(-1px); }

    /* Phone Shell */
    .phone-mockup {
      width: 100%;
      max-width: 430px;
      height: 880px;
      background: var(--bg);
      border: 2px solid #2b3038;
      border-radius: 44px;
      box-shadow: 0 25px 60px -15px rgba(0,0,0,0.8), 0 0 0 8px #13171c;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: background-color 0.25s ease;
    }

    /* Status Bar */
    .status-bar {
      height: 38px;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--on-surface);
      user-select: none;
      flex-shrink: 0;
    }
    .status-icons { display: flex; align-items: center; gap: 8px; font-size: 12px; }

    /* App Bar */
    .app-bar {
      padding: 8px 20px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .app-title-group { display: flex; flex-direction: column; }
    .app-title { font-size: 22px; font-weight: 700; color: var(--on-surface); }
    .app-subtitle { font-size: 13px; color: var(--on-surface-variant); margin-top: 2px; }

    .theme-toggle-btn {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      border: none;
      background: var(--secondary-container);
      color: var(--on-secondary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s, opacity 0.15s;
    }
    .theme-toggle-btn:hover { opacity: 0.9; transform: scale(1.05); }

    /* ViewPager & Pages */
    .pager-container {
      flex: 1;
      display: flex;
      overflow-x: hidden;
      scroll-behavior: smooth;
      position: relative;
    }
    .page {
      min-width: 100%;
      max-width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 8px 18px 116px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Cards */
    .card {
      background: var(--surface-container-low);
      border: 1px solid var(--outline-variant);
      border-radius: var(--radius-card);
      padding: 18px;
      transition: background-color 0.25s, border-color 0.25s;
    }
    .card-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--primary);
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .mono-body {
      font-family: 'Roboto Mono', monospace;
      font-size: 12.5px;
      line-height: 1.6;
      color: var(--on-surface);
      white-space: pre-wrap;
      user-select: text;
    }

    /* Buttons */
    .action-btn {
      width: 100%;
      height: 54px;
      border-radius: 16px;
      border: none;
      background: var(--primary);
      color: var(--on-primary);
      font-size: 16px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 10px;
      transition: filter 0.15s, transform 0.1s;
    }
    .action-btn:hover { filter: brightness(1.08); }
    .action-btn:active { transform: scale(0.98); }
    .action-btn:disabled {
      background: var(--surface-container-high);
      color: var(--on-surface-variant);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .sub-note {
      font-size: 12px;
      color: var(--on-surface-variant);
      margin-top: 10px;
      line-height: 1.4;
    }

    /* Log Header and Action Box */
    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .action-box {
      display: flex;
      align-items: center;
      background: var(--surface-container-high);
      border: 1px solid var(--outline-variant);
      border-radius: 10px;
      height: 34px;
      overflow: hidden;
    }
    .icon-action-btn {
      width: 34px;
      height: 34px;
      background: transparent;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--on-surface-variant);
      transition: background 0.15s, color 0.15s;
    }
    .icon-action-btn:hover {
      background: rgba(146, 204, 255, 0.12);
      color: var(--primary);
    }
    .icon-action-btn.active-lock {
      color: var(--color-warn);
    }
    .action-divider {
      width: 1px;
      height: 18px;
      background: var(--outline-variant);
    }

    /* M3 Filter Chips Row */
    .filter-chip-row {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 4px 0 8px;
      scrollbar-width: none;
    }
    .filter-chip-row::-webkit-scrollbar { display: none; }
    .filter-chip {
      height: 30px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--outline-variant);
      background: transparent;
      color: var(--on-surface-variant);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-family: inherit;
    }
    .filter-chip:hover {
      background: rgba(146, 204, 255, 0.08);
      color: var(--on-surface);
    }
    .filter-chip.active {
      background: var(--secondary-container);
      color: var(--on-secondary-container);
      border-color: transparent;
      font-weight: 600;
    }

    /* Real-Time Sticky Status Bar */
    .status-banner {
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      border-radius: 10px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .status-progress-bar {
      height: 3px;
      background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 50%, var(--primary) 100%);
      background-size: 200% 100%;
      animation: progressIndeterminate 1.5s infinite linear;
      display: none;
    }
    .status-progress-bar.active { display: block; }
    @keyframes progressIndeterminate {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .status-content {
      height: 34px;
      padding: 0 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .status-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--primary);
    }
    .status-text {
      flex: 1;
      color: var(--on-surface);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }
    .status-duration {
      font-family: 'Roboto Mono', monospace;
      font-size: 11px;
      color: var(--on-surface-variant);
    }

    /* Terminal Container with Gutter & Monospace Scaling */
    .terminal-box {
      background: var(--surface-terminal);
      border: 1px solid var(--outline-variant);
      border-radius: 14px;
      height: 240px;
      overflow-y: auto;
      padding: 10px 12px;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      line-height: 16px;
      color: var(--log-ink);
      user-select: text;
      display: flex;
      gap: 8px;
      scroll-behavior: smooth;
    }
    .terminal-gutter {
      width: 24px;
      flex-shrink: 0;
      text-align: right;
      color: var(--log-gutter);
      opacity: 0.85;
      line-height: 16px;
      font-size: 12px;
      white-space: pre;
      user-select: none;
    }
    .terminal-divider {
      width: 1px;
      background: var(--outline-variant);
      opacity: 0.4;
      flex-shrink: 0;
    }
    .terminal-logs {
      flex: 1;
      white-space: pre;
      line-height: 16px;
      font-size: 12px;
      overflow-x: auto;
    }
    .log-line {
      display: block;
      line-height: 16px;
      white-space: pre;
    }
    .log-time {
      color: var(--log-time);
      opacity: 0.85;
    }
    .log-badge {
      display: inline-block;
      font-weight: 600;
    }
    .log-badge.info { color: var(--log-info); }
    .log-badge.verb { color: var(--log-info); }
    .log-badge.succ { color: var(--color-success); font-weight: 700; }
    .log-badge.kern { color: var(--primary); font-weight: 700; }
    .log-badge.warn { color: var(--color-warn); font-weight: 700; }
    .log-badge.error { color: var(--color-error); font-weight: 700; }
    .log-msg { color: var(--log-ink); }

    /* Expanded / Fullscreen Log Overlay */
    .fullscreen-log-overlay {
      position: absolute;
      top: 38px;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg);
      z-index: 45;
      display: none;
      flex-direction: column;
      padding: 10px 18px 18px;
      animation: fsSlideUp 0.22s cubic-bezier(0.1, 0.9, 0.2, 1);
    }
    .fullscreen-log-overlay.active {
      display: flex;
    }
    @keyframes fsSlideUp {
      from { transform: translateY(18px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Settings inputs */
    .field-card {
      margin-top: 12px;
      padding: 12px 16px;
      background: var(--surface-container-high);
      border: 1px solid var(--outline-variant);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background 0.15s;
    }
    .field-card:hover {
      background: rgba(146, 204, 255, 0.08);
    }
    .field-card-title {
      font-size: 12px;
      color: var(--on-surface-variant);
    }
    .field-card-val {
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--on-surface);
      margin-top: 2px;
    }

    .outline-btn {
      width: 100%;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--outline);
      background: transparent;
      color: var(--primary);
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.15s;
    }
    .outline-btn:hover { background: rgba(146, 204, 255, 0.08); }

    /* MDE3 Floating Bottom Nav (Glitch-Free Fluid Pill Expansion) */
    .floating-nav-wrap {
      position: absolute;
      bottom: 24px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 10;
    }
    .floating-nav {
      pointer-events: auto;
      height: 62px;
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      border-radius: 31px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      padding: 6px 8px;
      gap: 6px;
      transition: background 0.25s;
    }
    .nav-tab-pill {
      height: 46px;
      min-width: 46px;
      border-radius: 23px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0 12px;
      transition: background-color 0.25s cubic-bezier(0.2, 0, 0, 1),
                  color 0.25s cubic-bezier(0.2, 0, 0, 1),
                  padding 0.25s cubic-bezier(0.2, 0, 0, 1);
      user-select: none;
      overflow: hidden;
    }
    .nav-tab-pill.active {
      background: var(--secondary-container);
      color: var(--on-secondary-container);
      padding: 0 16px 0 14px;
    }
    .nav-tab-pill:not(.active) {
      background: transparent;
      color: var(--on-surface-variant);
      padding: 0 12px;
    }
    .nav-tab-pill svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
      flex-shrink: 0;
    }
    .nav-tab-label {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      max-width: 0;
      opacity: 0;
      margin-left: 0;
      transition: max-width 0.25s cubic-bezier(0.2, 0, 0, 1),
                  opacity 0.2s cubic-bezier(0.2, 0, 0, 1),
                  margin-left 0.25s cubic-bezier(0.2, 0, 0, 1);
    }
    .nav-tab-pill.active .nav-tab-label {
      max-width: 100px;
      opacity: 1;
      margin-left: 8px;
    }

    /* Dialog Modals */
    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 50;
    }
    .modal-overlay.active { display: flex; }
    .dialog-card {
      width: 100%;
      background: var(--surface-container-high);
      border: 1px solid var(--outline-variant);
      border-radius: 28px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.7);
      animation: dialogPop 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
      max-height: 85%;
      display: flex;
      flex-direction: column;
    }
    @keyframes dialogPop {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .dialog-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--on-surface);
    }
    .dialog-subtitle {
      font-size: 13px;
      color: var(--on-surface-variant);
      margin-top: 4px;
      margin-bottom: 16px;
    }
    .dialog-content-scroll {
      overflow-y: auto;
      flex: 1;
      border-top: 1px solid var(--outline-variant);
      border-bottom: 1px solid var(--outline-variant);
      padding: 8px 0;
    }

    /* Screenshot 3 Styled Selection Pill */
    .ko-item-card {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      margin: 4px 0;
      cursor: pointer;
      border-radius: 16px;
      gap: 12px;
      transition: background-color 0.2s, color 0.2s;
    }
    .ko-item-card.selected {
      background: var(--secondary-container);
      color: var(--on-secondary-container);
    }
    .ko-item-card.selected .ko-title {
      color: var(--on-secondary-container);
    }
    .ko-item-card:not(.selected) {
      background: transparent;
      color: var(--on-surface);
    }
    .ko-item-card:not(.selected):hover {
      background: rgba(146, 204, 255, 0.08);
    }
    .ko-radio {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--outline);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ko-item-card.selected .ko-radio {
      border-color: var(--on-secondary-container);
    }
    .ko-item-card.selected .ko-radio::after {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--on-secondary-container);
    }
    .ko-info { flex: 1; min-width: 0; }
    .ko-title {
      font-family: 'Roboto Mono', monospace;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--on-surface);
    }
    .ko-sub {
      font-size: 12px;
      margin-top: 2px;
      color: var(--on-surface-variant);
    }
    .ko-item-card.selected .ko-sub:not(.warning) {
      color: var(--on-secondary-container);
      opacity: 0.9;
    }
    .ko-sub.warning { color: var(--color-error); font-weight: 500; }
    .ko-indicator {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 18px;
    }
    .dialog-btn {
      height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      border: none;
    }
    .dialog-btn.cancel {
      background: transparent;
      color: var(--primary);
    }
    .dialog-btn.confirm {
      background: var(--secondary-container);
      color: var(--on-secondary-container);
      min-width: 100px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .dialog-btn.confirm:hover {
      filter: brightness(1.08);
    }

    /* Theme Option Cards in Dialog */
    .theme-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .theme-card-option {
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      border-radius: 16px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .theme-card-option.selected {
      border: 2px solid var(--primary);
      background: var(--secondary-container);
      color: var(--on-secondary-container);
    }
    .amoled-toggle-card {
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      border-radius: 16px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
    .amoled-toggle-card.selected {
      border: 2px solid var(--primary);
    }
    .switch-ui {
      width: 44px;
      height: 24px;
      background: #394857;
      border-radius: 12px;
      position: relative;
      transition: background 0.2s;
    }
    .switch-ui::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      transition: transform 0.2s;
    }
    .switch-ui.checked {
      background: var(--primary);
    }
    .switch-ui.checked::after {
      transform: translateX(20px);
      background: var(--on-primary);
    }

    /* Material Design 3 Expressive & Material You Dynamic Floating Toast */
    .mde3-toast-container {
      position: absolute;
      bottom: 92px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 120;
      padding: 0 16px;
    }
    .mde3-toast {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      max-width: 90%;
      padding: 8px 16px 8px 10px;
      background: var(--surface-container-high);
      color: var(--on-surface);
      border: 1px solid var(--outline-variant);
      border-radius: 24px;
      box-shadow: 0 10px 28px -4px rgba(0, 0, 0, 0.45), 0 3px 8px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transform: translateY(22px) scale(0.92);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.22s cubic-bezier(0.2, 0, 0, 1);
    }
    .mde3-toast.show {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .mde3-toast-icon-wrap {
      width: 32px;
      height: 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--secondary-container);
      color: var(--on-secondary-container);
      transition: background 0.25s, color 0.25s;
    }
    .mde3-toast-icon-wrap.tone-success {
      background: rgba(123, 213, 140, 0.22);
      color: var(--color-success);
    }
    .mde3-toast-icon-wrap.tone-warn {
      background: rgba(255, 213, 102, 0.22);
      color: var(--color-warn);
    }
    .mde3-toast-icon-wrap.tone-error {
      background: rgba(242, 184, 181, 0.22);
      color: var(--color-error);
    }
    .mde3-toast-icon-wrap.tone-primary {
      background: var(--secondary-container);
      color: var(--on-secondary-container);
    }
    .mde3-toast-label {
      font-size: 13.5px;
      font-weight: 500;
      letter-spacing: 0.01em;
      line-height: 1.35;
      color: var(--on-surface);
      white-space: normal;
      word-break: break-word;
    }
    .mde3-toast-action {
      margin-left: 6px;
      padding: 4px 12px;
      background: var(--primary);
      color: var(--on-primary);
      border: none;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      transition: opacity 0.15s, transform 0.1s;
    }
    .mde3-toast-action:hover {
      opacity: 0.9;
      transform: scale(1.03);
    }
  </style>
</head>
<body>

  <div class="top-badge">
    <img src="/kittyfrag_icon.png" width="22" height="22" style="border-radius:6px; flex-shrink:0;" alt="KittyFrag">
    <span>KittyFrag · Android Build Active</span>
    <a href="/download/kittyfrag.apk" class="dl-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
      Download APK (${apk.sizeMb} MB)
    </a>
  </div>

  <div class="phone-mockup" id="phoneMockup" data-theme="amoled">
    <!-- Status Bar -->
    <div class="status-bar">
      <span>21:04</span>
      <div class="status-icons">
        <span>4G</span>
        <span>61%</span>
      </div>
    </div>

    <!-- App Header with KittyFrag Icon and M3 Theme Toggle -->
    <div class="app-bar">
      <div class="app-title-group" style="display:flex; flex-direction:row; align-items:center; gap:10px;">
        <img src="/kittyfrag_icon.png" width="30" height="30" style="border-radius:8px; border:1px solid #2B314B; box-shadow:0 2px 6px rgba(0,0,0,0.4);" alt="KittyFrag">
        <div style="display:flex; flex-direction:column;">
          <div class="app-title">KittyFrag</div>
          <div class="app-subtitle">Experimental Android root</div>
        </div>
      </div>
      <button class="theme-toggle-btn" id="btnThemeToggle" title="Theme & Appearance">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/>
        </svg>
      </button>
    </div>

    <!-- ViewPager container -->
    <div class="pager-container" id="pager">
      <!-- HOME PAGE -->
      <div class="page" id="pageHome">
        <div class="card">
          <div class="card-label">This Device</div>
          <div class="mono-body">Package: kitty.root
Brand: INFINIX
Model / device: Infinix X6885 / Infinix-X6885
SoC: MT6789
Android: 16 (API 36)
Security patch: 2026-09-05
Kernel: 6.12.38-android16-5-gb575a0b6e647-ab14355190-4k
KMI: android16-6.12</div>
        </div>

        <div class="card">
          <div class="card-label">Root Session</div>
          <button class="action-btn" id="btnLaunchRoot">Launch root</button>
          <div class="sub-note">Root is temporary and is cleared when the phone reboots. Device and firmware compatibility is not guaranteed.</div>
        </div>

        <div class="card">
          <!-- Log Header with Material 3 Action Box and Separated Fullscreen Button -->
          <div class="log-header">
            <div class="card-label" style="margin-bottom:0">Run Log</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="action-box">
                <button class="icon-action-btn" id="btnToggleScrollLock" title="Toggle auto-scroll lock">
                  <svg id="scrollLockIcon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"/>
                  </svg>
                </button>
                <div class="action-divider"></div>
                <button class="icon-action-btn" id="btnCopyLogs" title="Copy log">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
                <div class="action-divider"></div>
                <button class="icon-action-btn" id="btnShareLogs" title="Share log">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
                </button>
                <div class="action-divider"></div>
                <button class="icon-action-btn" id="btnSaveLogs" title="Save log as file">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                </button>
                <div class="action-divider"></div>
                <button class="icon-action-btn" id="btnClearLogs" title="Clear log">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>
                </button>
              </div>

              <!-- Separated Fullscreen Button (Distinct container so it doesn't confuse users) -->
              <div class="action-box">
                <button class="icon-action-btn" id="btnFullscreenLog" title="Fullscreen log screen" style="color:var(--primary);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- M3 FilterChip Row -->
          <div class="filter-chip-row" id="filterChipRow">
            <button class="filter-chip active" data-filter="all">All</button>
            <button class="filter-chip" data-filter="errors">Errors Only</button>
            <button class="filter-chip" data-filter="kernel">Kernel Output</button>
            <button class="filter-chip" data-filter="verbose">Verbose</button>
          </div>

          <!-- Real-Time Sticky Status Bar -->
          <div class="status-banner" id="statusBanner">
            <div class="status-progress-bar" id="statusProgress"></div>
            <div class="status-content">
              <div class="status-icon" id="statusIcon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <span class="status-text" id="statusText">Ready · Review detected KMI and launch root</span>
              <span class="status-duration" id="statusDuration"></span>
            </div>
          </div>

          <!-- Terminal Box with Line Number Gutter & Monospace Scaling -->
          <div class="terminal-box" id="terminalContainer">
            <div class="terminal-gutter" id="gutterView">01</div>
            <div class="terminal-divider"></div>
            <div class="terminal-logs" id="logBox"></div>
          </div>
        </div>
      </div>

      <!-- SETTINGS PAGE -->
      <div class="page" id="pageSettings">
        <div class="card">
          <div class="card-label">Root Manager</div>
          <div style="font-size:14px; font-weight:600; margin-top:4px;">Loader: automatic manager detection</div>
          <div class="sub-note">Automatic mode checks KernelSU Manager, then ReSukiSU Manager, then /data/adb/ksu/bin/ksud. A compatible arm64 ksud can be selected manually.</div>
          <button class="outline-btn">Choose custom ksud</button>
          <button class="action-btn" style="height:44px; font-size:14px; margin-top:8px;">Use automatic manager selection</button>
        </div>

        <div class="card">
          <div class="card-label">KittyFrag Helper Module</div>
          <div style="font-size:14px; font-weight:600; margin-top:4px;">Selected KittyFrag helper</div>
          <div class="sub-note">Automatic mode shows the selected file. If no helper matches this kernel, build a DFRoot dirtyfrag.ko for its KMI and select that file here.</div>
          
          <!-- Sleek Selector Card opening Material 3 Dialog -->
          <div class="field-card" id="btnOpenKoDialog">
            <div>
              <div class="field-card-title">Bundled KittyFrag .ko</div>
              <div class="field-card-val" id="koSelectedDisplay">dirtyfrag-android16-6.12.ko</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--on-surface-variant)"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>
          </div>

          <button class="outline-btn">Choose custom DFRoot .ko</button>
          <button class="action-btn" style="height:44px; font-size:14px; margin-top:8px;">Use automatic KMI selection</button>
        </div>

        <div class="card">
          <div class="card-label">Advanced Patch #2 Targets</div>
          <div class="sub-note">Optional device-specific carrier files used for patch #2. Enter one existing absolute /vendor/ or /system/vendor/ path per line.</div>
          <div class="terminal-box" style="height:110px; margin-top:10px; white-space:pre-wrap;">/vendor/etc/vintf/manifest.xml
/system/vendor/etc/vintf/manifest.xml</div>
          <button class="action-btn" style="height:44px; font-size:14px; margin-top:10px;">Save target profile</button>
        </div>
      </div>
    </div>

    <!-- MDE3 Floating Navigation Capsule (Horizontal Pill Expanding Style) -->
    <div class="floating-nav-wrap">
      <div class="floating-nav">
        <div class="nav-tab-pill active" id="tabHomePill">
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span class="nav-tab-label">Home</span>
        </div>
        <div class="nav-tab-pill" id="tabSettingsPill">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          <span class="nav-tab-label">Settings</span>
        </div>
      </div>
    <!-- EXPANDED / FULLSCREEN LOG OVERLAY -->
    <div class="fullscreen-log-overlay" id="fullscreenLogOverlay">
      <!-- Fullscreen Header with Title, Action Box, and Separated Exit Button -->
      <div class="log-header" style="padding-top:4px; margin-bottom:8px;">
        <div class="card-label" style="font-size:13px; margin-bottom:0;">Expanded Run Log</div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="action-box">
            <button class="icon-action-btn" id="btnToggleScrollLockFs" title="Toggle auto-scroll lock">
              <svg id="scrollLockIconFs" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"/>
              </svg>
            </button>
            <div class="action-divider"></div>
            <button class="icon-action-btn" id="btnCopyLogsFs" title="Copy log">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
            <div class="action-divider"></div>
            <button class="icon-action-btn" id="btnShareLogsFs" title="Share log">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
            </button>
            <div class="action-divider"></div>
            <button class="icon-action-btn" id="btnSaveLogsFs" title="Save log as file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
            </button>
            <div class="action-divider"></div>
            <button class="icon-action-btn" id="btnClearLogsFs" title="Clear log">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>
            </button>
          </div>

          <!-- Separated Exit Fullscreen Button (Distinct container to avoid confusing with inline tools) -->
          <div class="action-box">
            <button class="icon-action-btn" id="btnExitFullscreenLog" title="Exit fullscreen" style="color:var(--primary);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- M3 FilterChip Row for Fullscreen -->
      <div class="filter-chip-row" id="filterChipRowFs" style="padding-bottom:6px;">
        <button class="filter-chip active" data-filter="all">All</button>
        <button class="filter-chip" data-filter="errors">Errors Only</button>
        <button class="filter-chip" data-filter="kernel">Kernel Output</button>
        <button class="filter-chip" data-filter="verbose">Verbose</button>
      </div>

      <!-- Real-Time Sticky Status Bar in Fullscreen -->
      <div class="status-banner" id="statusBannerFs">
        <div class="status-progress-bar" id="statusProgressFs"></div>
        <div class="status-content">
          <div class="status-icon" id="statusIconFs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <span class="status-text" id="statusTextFs">Ready · Review detected KMI and launch root</span>
          <span class="status-duration" id="statusDurationFs"></span>
        </div>
      </div>

      <!-- Expanded Terminal Box with Gutter & Monospace Scaling -->
      <div class="terminal-box" id="terminalContainerFs" style="flex:1; height:auto; min-height:0;">
        <div class="terminal-gutter" id="gutterViewFs">01</div>
        <div class="terminal-divider"></div>
        <div class="terminal-logs" id="logBoxFs"></div>
      </div>
    </div>

    <!-- KO SELECTION DIALOG (Screenshot 3 styled selection pill + clean mismatch format) -->
    <div class="modal-overlay" id="modalKo">
      <div class="dialog-card">
        <div class="dialog-title">Bundled KittyFrag .ko</div>
        <div class="dialog-subtitle">Choose module variant for this kernel</div>
        
        <div class="dialog-content-scroll" id="koOptionsList">
          <!-- Dynamically filled with Screenshot 3 styled item pills -->
        </div>

        <div class="dialog-actions">
          <button class="dialog-btn cancel" id="btnCancelKo">Cancel</button>
          <button class="dialog-btn confirm" id="btnConfirmKo">Confirm</button>
        </div>
      </div>
    </div>

    <!-- THEME SELECTION DIALOG (Light, Dark, and Pure AMOLED toggle) -->
    <div class="modal-overlay" id="modalTheme">
      <div class="dialog-card">
        <div class="dialog-title">Theme</div>
        <div class="dialog-subtitle">Choose your preferred appearance</div>

        <div class="theme-options-grid">
          <div class="theme-card-option" id="cardOptLight">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>
            <span style="font-size:14px; font-weight:600;">Light</span>
          </div>

          <div class="theme-card-option selected" id="cardOptDark">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>
            <span style="font-size:14px; font-weight:600;">Dark</span>
          </div>
        </div>

        <div class="amoled-toggle-card selected" id="cardOptAmoled">
          <div>
            <div style="font-size:15px; font-weight:600;">AMOLED mode</div>
            <div style="font-size:12px; color:var(--on-surface-variant); margin-top:2px;">Pure pitch-black #000000 for OLED</div>
          </div>
          <div class="switch-ui checked" id="switchAmoledUi"></div>
        </div>

        <div class="dialog-actions">
          <button class="dialog-btn cancel" id="btnCancelTheme">Cancel</button>
          <button class="dialog-btn confirm" id="btnConfirmTheme">Confirm</button>
        </div>
      </div>
    </div>

    <!-- MDE3 & Material You Dynamic Floating Toast (Interactive with Dynamic Theming & Contextual Icons) -->
    <div class="mde3-toast-container">
      <div class="mde3-toast" id="mde3Toast">
        <div class="mde3-toast-icon-wrap tone-primary" id="mde3ToastIcon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        </div>
        <div class="mde3-toast-label" id="mde3ToastLabel">Toast message</div>
        <button class="mde3-toast-action" id="mde3ToastAction" style="display:none;">Undo</button>
      </div>
    </div>
  </div>

  <script>
    const phone = document.getElementById('phoneMockup');
    const pager = document.getElementById('pager');
    const tabHomePill = document.getElementById('tabHomePill');
    const tabSettingsPill = document.getElementById('tabSettingsPill');
    const terminalContainer = document.getElementById('terminalContainer');
    const gutterView = document.getElementById('gutterView');
    const logBox = document.getElementById('logBox');
    const mde3Toast = document.getElementById('mde3Toast');
    const mde3ToastIcon = document.getElementById('mde3ToastIcon');
    const mde3ToastLabel = document.getElementById('mde3ToastLabel');
    const mde3ToastAction = document.getElementById('mde3ToastAction');
    const btnToggleScrollLock = document.getElementById('btnToggleScrollLock');
    const scrollLockIcon = document.getElementById('scrollLockIcon');
    const statusProgress = document.getElementById('statusProgress');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const statusDuration = document.getElementById('statusDuration');

    let currentTabIndex = 0;
    let isNavigating = false;
    let navTimeout = null;

    let toastTimer = null;

    const ICONS_MAP = {
      copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
      save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
      trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>',
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
      error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
      warn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
      sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>',
      moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>',
      sparkle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>',
      chip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V7h2V5h-2V3h-2v2h-2V3h-2v2H9V3zm8 14H7V7h10v10z"/></svg>',
      lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
    };

    function showToast(rawMsg, onActionClick) {
      clearTimeout(toastTimer);
      let text = String(rawMsg);
      let actionLabel = null;
      let actionCb = null;

      if (typeof onActionClick === 'function') {
        actionLabel = 'Undo';
        actionCb = onActionClick;
      }

      const cleanText = text.replace(/<[^>]*>/g, '').replace(/·.*$/, '').trim();

      let iconKey = 'info';
      let tone = 'tone-primary';
      const lower = cleanText.toLowerCase();

      if (lower.includes('copy') || lower.includes('clipboard')) {
        iconKey = 'copy';
        tone = 'tone-primary';
      } else if (lower.includes('save') || lower.includes('download')) {
        iconKey = 'save';
        tone = 'tone-primary';
      } else if (lower.includes('clear') || lower.includes('empty')) {
        iconKey = 'trash';
        tone = 'tone-warn';
      } else if (lower.includes('success') || lower.includes('restored') || lower.includes('completed')) {
        iconKey = 'success';
        tone = 'tone-success';
      } else if (lower.includes('error') || lower.includes('failed') || lower.includes('different kernel') || lower.includes('invalid')) {
        iconKey = 'error';
        tone = 'tone-error';
      } else if (lower.includes('warn') || lower.includes('warning') || lower.includes('not verified')) {
        iconKey = 'warn';
        tone = 'tone-warn';
      } else if (lower.includes('amoled')) {
        iconKey = 'sparkle';
        tone = 'tone-primary';
      } else if (lower.includes('dark theme')) {
        iconKey = 'moon';
        tone = 'tone-primary';
      } else if (lower.includes('light theme')) {
        iconKey = 'sun';
        tone = 'tone-warn';
      } else if (lower.includes('lock')) {
        iconKey = 'lock';
        tone = 'tone-primary';
      } else if (lower.includes('helper') || lower.includes('.ko') || lower.includes('target') || lower.includes('profile')) {
        iconKey = 'chip';
        tone = 'tone-primary';
      }

      mde3ToastIcon.className = 'mde3-toast-icon-wrap ' + tone;
      mde3ToastIcon.innerHTML = ICONS_MAP[iconKey] || ICONS_MAP.info;
      mde3ToastLabel.textContent = cleanText;

      if (actionLabel && actionCb) {
        mde3ToastAction.textContent = actionLabel;
        mde3ToastAction.style.display = 'inline-flex';
        mde3ToastAction.onclick = () => {
          actionCb();
          mde3Toast.classList.remove('show');
        };
      } else {
        mde3ToastAction.style.display = 'none';
        mde3ToastAction.onclick = null;
      }

      mde3Toast.classList.add('show');
      toastTimer = setTimeout(() => {
        mde3Toast.classList.remove('show');
      }, 3400);
    }

    // Glitch-Free Fluid Tab Navigation
    function selectTab(pageIndex) {
      currentTabIndex = pageIndex;
      isNavigating = true;
      if (pageIndex === 0) {
        tabHomePill.classList.add('active');
        tabSettingsPill.classList.remove('active');
        pager.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        tabSettingsPill.classList.add('active');
        tabHomePill.classList.remove('active');
        pager.scrollTo({ left: pager.clientWidth, behavior: 'smooth' });
      }
      clearTimeout(navTimeout);
      navTimeout = setTimeout(() => { isNavigating = false; }, 350);
    }

    tabHomePill.addEventListener('click', () => selectTab(0));
    tabSettingsPill.addEventListener('click', () => selectTab(1));

    pager.addEventListener('scroll', () => {
      if (isNavigating) return;
      const scrollLeft = pager.scrollLeft;
      const width = pager.clientWidth;
      if (scrollLeft > width * 0.55) {
        currentTabIndex = 1;
        tabSettingsPill.classList.add('active');
        tabHomePill.classList.remove('active');
      } else if (scrollLeft < width * 0.45) {
        currentTabIndex = 0;
        tabHomePill.classList.add('active');
        tabSettingsPill.classList.remove('active');
      }
    });

    // Structured Log System with Level-Based Tokens & Fixed-Width Metadata
    let logEntries = [];
    let clearedLogEntries = [];
    let activeFilter = 'all';
    let autoScrollLocked = false;

    function detectLevel(text) {
      const lower = text.toLowerCase();
      if (lower.includes('error') || lower.includes('failed') || lower.includes('fail:') ||
          lower.includes('exception') || lower.includes('fatal') || lower.includes('could not') ||
          lower.includes('cannot') || lower.includes('mismatch detected')) {
        return 'error';
      }
      if (lower.includes('warn') || lower.includes('warning') || lower.includes('mismatch') ||
          lower.includes('unrecognized') || lower.includes('fallback')) {
        return 'warn';
      }
      if (lower.includes('success') || lower.includes('completed') || lower.includes('succeeded') ||
          lower.includes('root: success') || lower.includes('daemon initiated')) {
        return 'succ';
      }
      if (lower.includes('kernel') || lower.includes('kmi') || lower.includes('dirtyfrag') ||
          lower.includes('lkm') || lower.includes('module') || lower.includes('splice') ||
          lower.includes('/dev/df') || lower.includes('ipsec') || lower.includes('spi:') ||
          lower.includes('encap port:') || lower.includes('vermagic')) {
        return 'kern';
      }
      if (lower.includes('verbose') || lower.includes('debug') || lower.includes('stage') ||
          lower.includes('setup') || lower.includes('testing')) {
        return 'verb';
      }
      return 'info';
    }

    function formatTime(d) {
      const pad = (n, w=2) => String(n).padStart(w, '0');
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + pad(d.getMilliseconds(), 3);
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function addLogEntry(rawText) {
      let trimmed = rawText.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('[+]') || trimmed.startsWith('[*]') || trimmed.startsWith('[-]')) {
        trimmed = trimmed.substring(3).trim();
      }
      const level = detectLevel(trimmed);
      const timeStr = formatTime(new Date());
      const levelTag = level === 'warn' ? '[WARN]  ' :
                       level === 'error' ? '[ERROR] ' :
                       level === 'succ' ? '[SUCC]  ' :
                       level === 'kern' ? '[KERN]  ' :
                       level === 'verb' ? '[VERB]  ' : '[INFO]  ';
      logEntries.push({ time: timeStr, level, tag: levelTag, message: trimmed });
      renderLogs();
    }

    const fsOverlay = document.getElementById('fullscreenLogOverlay');
    const btnFullscreenLog = document.getElementById('btnFullscreenLog');
    const btnExitFullscreenLog = document.getElementById('btnExitFullscreenLog');
    const gutterViewFs = document.getElementById('gutterViewFs');
    const logBoxFs = document.getElementById('logBoxFs');
    const terminalContainerFs = document.getElementById('terminalContainerFs');
    const statusProgressFs = document.getElementById('statusProgressFs');
    const statusIconFs = document.getElementById('statusIconFs');
    const statusTextFs = document.getElementById('statusTextFs');
    const statusDurationFs = document.getElementById('statusDurationFs');
    const btnToggleScrollLockFs = document.getElementById('btnToggleScrollLockFs');
    const scrollLockIconFs = document.getElementById('scrollLockIconFs');

    btnFullscreenLog.addEventListener('click', () => {
      fsOverlay.classList.add('active');
      renderLogs();
      if (!autoScrollLocked) {
        terminalContainerFs.scrollTop = terminalContainerFs.scrollHeight;
      }
    });

    btnExitFullscreenLog.addEventListener('click', () => {
      fsOverlay.classList.remove('active');
      if (!autoScrollLocked) {
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
      }
    });

    function renderLogs() {
      const filtered = logEntries.filter(e => {
        if (activeFilter === 'errors') return e.level === 'error';
        if (activeFilter === 'kernel') return e.level === 'kern';
        if (activeFilter === 'verbose') return true;
        return true;
      });

      if (filtered.length === 0) {
        gutterView.textContent = '01';
        if (gutterViewFs) gutterViewFs.textContent = '01';
        const emptyMsg = '<span style="color:var(--on-surface-variant); opacity:0.6;">No log lines matching current filter</span>';
        logBox.innerHTML = emptyMsg;
        if (logBoxFs) logBoxFs.innerHTML = emptyMsg;
        return;
      }

      const gutterStr = filtered.map((_, i) => String(i + 1).padStart(2, '0')).join('\n');
      const logHtml = filtered.map(e => '<span class="log-line"><span class="log-time">[' + e.time + ']</span>  <span class="log-badge ' + e.level + '">' + e.tag + '</span> <span class="log-msg">' + escapeHtml(e.message) + '</span></span>').join('');

      gutterView.textContent = gutterStr;
      if (gutterViewFs) gutterViewFs.textContent = gutterStr;

      logBox.innerHTML = logHtml;
      if (logBoxFs) logBoxFs.innerHTML = logHtml;

      if (!autoScrollLocked) {
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
        if (terminalContainerFs) terminalContainerFs.scrollTop = terminalContainerFs.scrollHeight;
      }
    }

    function toggleScrollLock() {
      autoScrollLocked = !autoScrollLocked;
      const lockIconSvg = '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>';
      const unlockIconSvg = '<path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"/>';

      if (autoScrollLocked) {
        btnToggleScrollLock.classList.add('active-lock');
        scrollLockIcon.innerHTML = lockIconSvg;
        if (btnToggleScrollLockFs) {
          btnToggleScrollLockFs.classList.add('active-lock');
          scrollLockIconFs.innerHTML = lockIconSvg;
        }
        showToast('Auto-scroll paused (locked)');
      } else {
        btnToggleScrollLock.classList.remove('active-lock');
        scrollLockIcon.innerHTML = unlockIconSvg;
        if (btnToggleScrollLockFs) {
          btnToggleScrollLockFs.classList.remove('active-lock');
          scrollLockIconFs.innerHTML = unlockIconSvg;
        }
        showToast('Auto-scroll resumed');
        terminalContainer.scrollTop = terminalContainer.scrollHeight;
        if (terminalContainerFs) terminalContainerFs.scrollTop = terminalContainerFs.scrollHeight;
      }
    }

    // Auto-Scroll Lock Toggle listeners
    btnToggleScrollLock.addEventListener('click', toggleScrollLock);
    if (btnToggleScrollLockFs) {
      btnToggleScrollLockFs.addEventListener('click', toggleScrollLock);
    }

    // Synchronize Filter Chips between inline and fullscreen
    function applyFilter(filter) {
      activeFilter = filter;
      document.querySelectorAll('#filterChipRow .filter-chip, #filterChipRowFs .filter-chip').forEach(c => {
        if (c.getAttribute('data-filter') === filter) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
      renderLogs();
    }

    document.querySelectorAll('#filterChipRow .filter-chip, #filterChipRowFs .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        applyFilter(chip.getAttribute('data-filter'));
      });
    });

    // Run Log Action Buttons (Copy, Share, Save as file, Clear with undo)
    function handleCopyLogs() {
      if (logEntries.length === 0) {
        showToast('Log is empty');
        return;
      }
      const text = logEntries.map(e => '[' + e.time + ']  ' + e.tag + ' ' + e.message).join('\n');
      navigator.clipboard.writeText(text).then(() => showToast('Formatted log copied to clipboard'));
    }

    function handleShareLogs() {
      if (logEntries.length === 0) {
        showToast('Log is empty');
        return;
      }
      showToast('Sharing run log (plain text attachment)...');
    }

    function handleSaveLogs() {
      if (logEntries.length === 0) {
        showToast('Log is empty');
        return;
      }
      const text = logEntries.map(e => '[' + e.time + ']  ' + e.tag + ' ' + e.message).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kittyfrag-log.txt';
      a.click();
      showToast('Saved kittyfrag-log.txt');
    }

    function handleClearLogs() {
      if (logEntries.length === 0) {
        showToast('Log is already empty');
        return;
      }
      clearedLogEntries = [...logEntries];
      logEntries = [];
      renderLogs();
      showToast('Log canvas cleared · <u style="cursor:pointer; font-weight:700;">Undo</u>', () => {
        if (clearedLogEntries.length > 0) {
          logEntries = [...clearedLogEntries];
          clearedLogEntries = [];
          renderLogs();
          showToast('Log canvas restored');
        }
      });
    }

    document.getElementById('btnCopyLogs').addEventListener('click', handleCopyLogs);
    document.getElementById('btnCopyLogsFs').addEventListener('click', handleCopyLogs);

    document.getElementById('btnShareLogs').addEventListener('click', handleShareLogs);
    document.getElementById('btnShareLogsFs').addEventListener('click', handleShareLogs);

    document.getElementById('btnSaveLogs').addEventListener('click', handleSaveLogs);
    document.getElementById('btnSaveLogsFs').addEventListener('click', handleSaveLogs);

    document.getElementById('btnClearLogs').addEventListener('click', handleClearLogs);
    document.getElementById('btnClearLogsFs').addEventListener('click', handleClearLogs);

    // Initial ready state log line
    addLogEntry('Ready · Review detected KMI and launch root');

    function updateStatus(inProgress, iconSvg, iconColor, text, duration) {
      if (inProgress) {
        statusProgress.classList.add('active');
        if (statusProgressFs) statusProgressFs.classList.add('active');
      } else {
        statusProgress.classList.remove('active');
        if (statusProgressFs) statusProgressFs.classList.remove('active');
      }
      statusIcon.innerHTML = iconSvg;
      statusIcon.style.color = iconColor;
      if (statusIconFs) {
        statusIconFs.innerHTML = iconSvg;
        statusIconFs.style.color = iconColor;
      }
      statusText.textContent = text;
      if (statusTextFs) statusTextFs.textContent = text;
      statusDuration.textContent = duration || '';
      if (statusDurationFs) statusDurationFs.textContent = duration || '';
    }

    const spinIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>';
    const checkIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

    // Launch Root Action with Real-Time Sticky Status Bar
    btnLaunch.addEventListener('click', () => {
      btnLaunch.disabled = true;
      btnLaunch.textContent = 'Launching...';
      const startMs = Date.now();

      updateStatus(true, spinIcon, 'var(--primary)', 'Executing payload...', '');

      logEntries = [];
      addLogEntry('Starting KittyFrag session...');

      const steps = [
        'Kernel version: 6.12.38-android16-5-gb575a0b6e647',
        'Scanning kernel build parameters...',
        'Matched KMI: android16-6.12 (dirtyfrag-android16-6.12.ko)',
        'Testing splice helper & memory mapping...',
        'Staging ksud binary to device protected storage...',
        'Applying kernel hook via DFRoot helper...',
        'Checking /dev/df mount points...',
        'Process exited with code 0 (Success: KernelSU daemon initiated).'
      ];

      steps.forEach((step, idx) => {
        setTimeout(() => {
          addLogEntry(step);
          if (idx === steps.length - 1) {
            const elapsed = ((Date.now() - startMs) / 1000).toFixed(2);
            btnLaunch.disabled = false;
            btnLaunch.textContent = 'Launch root';
            updateStatus(false, checkIcon, 'var(--color-success)', 'Process exited with code 0 (Completed in ' + elapsed + 's)', elapsed + 's');
            showToast('KittyFrag: SUCCESS');
          }
        }, (idx + 1) * 350);
      });
    });

    // KO Selection Modal styled like Screenshot 3 (Rounded pill selection) + Clean Mismatch format
    const BUNDLED_KMIS = [
      { name: 'android12-5.10', kernel: '5.10' },
      { name: 'android13-5.10', kernel: '5.10' },
      { name: 'android13-5.15', kernel: '5.15' },
      { name: 'android14-5.15', kernel: '5.15' },
      { name: 'android14-6.1',  kernel: '6.1' },
      { name: 'android15-6.6',  kernel: '6.6' },
      { name: 'android16-6.12', kernel: '6.12' },
      { name: 'android17-6.18', kernel: '6.18' }
    ];
    const DEVICE_KERNEL = '6.12';

    let selectedKoIndex = 7; // default to android16-6.12 (index 7 including Automatic)
    const modalKo = document.getElementById('modalKo');
    const koOptionsList = document.getElementById('koOptionsList');
    const koSelectedDisplay = document.getElementById('koSelectedDisplay');

    function renderKoOptions() {
      koOptionsList.innerHTML = '';
      
      // Option 0: Automatic
      const autoRow = document.createElement('div');
      const isAuto = selectedKoIndex === 0;
      autoRow.className = \`ko-item-card \${isAuto ? 'selected' : ''}\`;
      autoRow.innerHTML = \`
        <div class="ko-radio"></div>
        <div class="ko-info">
          <div class="ko-title">Automatic · dirtyfrag-android16-6.12.ko</div>
          <div class="ko-sub success">Exact KMI match for kernel (android16-6.12)</div>
        </div>
        <div class="ko-indicator" style="color:\${isAuto ? 'var(--on-secondary-container)' : 'var(--primary)'}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
      \`;
      autoRow.onclick = () => { selectedKoIndex = 0; renderKoOptions(); };
      koOptionsList.appendChild(autoRow);

      // Bundled options 1..8
      BUNDLED_KMIS.forEach((kmi, idx) => {
        const pos = idx + 1;
        const isChecked = selectedKoIndex === pos;
        const match = kmi.kernel === DEVICE_KERNEL;
        const subText = match
          ? \`Matches kernel version (\${kmi.kernel})\`
          : \`Kernel mismatch (\${kmi.kernel} vs \${DEVICE_KERNEL})\`;

        const row = document.createElement('div');
        row.className = \`ko-item-card \${isChecked ? 'selected' : ''}\`;
        row.innerHTML = \`
          <div class="ko-radio"></div>
          <div class="ko-info">
            <div class="ko-title">dirtyfrag-\${kmi.name}.ko</div>
            <div class="ko-sub \${match ? 'success' : 'warning'}">\${subText}</div>
          </div>
          <div class="ko-indicator" style="color:\${match ? (isChecked ? 'var(--on-secondary-container)' : 'var(--primary)') : 'var(--color-error)'}">
            \${match 
              ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
              : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>'}
          </div>
        \`;
        row.onclick = () => { selectedKoIndex = pos; renderKoOptions(); };
        koOptionsList.appendChild(row);
      });
    }

    document.getElementById('btnOpenKoDialog').addEventListener('click', () => {
      renderKoOptions();
      modalKo.classList.add('active');
    });
    document.getElementById('btnCancelKo').addEventListener('click', () => modalKo.classList.remove('active'));
    document.getElementById('btnConfirmKo').addEventListener('click', () => {
      modalKo.classList.remove('active');
      if (selectedKoIndex === 0) {
        koSelectedDisplay.textContent = 'Automatic · dirtyfrag-android16-6.12.ko';
      } else {
        koSelectedDisplay.textContent = 'dirtyfrag-' + BUNDLED_KMIS[selectedKoIndex - 1].name + '.ko';
      }
      showToast('Selected helper module updated');
    });

    // Theme Modal (Light, Dark, and Pure AMOLED toggle)
    const modalTheme = document.getElementById('modalTheme');
    const cardOptLight = document.getElementById('cardOptLight');
    const cardOptDark = document.getElementById('cardOptDark');
    const cardOptAmoled = document.getElementById('cardOptAmoled');
    const switchAmoledUi = document.getElementById('switchAmoledUi');

    let pendingThemeDark = true;
    let pendingAmoled = true;

    function updateThemeModalCards() {
      if (!pendingThemeDark) {
        cardOptLight.classList.add('selected');
        cardOptDark.classList.remove('selected');
      } else {
        cardOptDark.classList.add('selected');
        cardOptLight.classList.remove('selected');
      }
      if (pendingAmoled) {
        cardOptAmoled.classList.add('selected');
        switchAmoledUi.classList.add('checked');
      } else {
        cardOptAmoled.classList.remove('selected');
        switchAmoledUi.classList.remove('checked');
      }
    }

    document.getElementById('btnThemeToggle').addEventListener('click', () => {
      updateThemeModalCards();
      modalTheme.classList.add('active');
    });

    cardOptLight.addEventListener('click', () => {
      pendingThemeDark = false;
      pendingAmoled = false;
      updateThemeModalCards();
    });

    cardOptDark.addEventListener('click', () => {
      pendingThemeDark = true;
      updateThemeModalCards();
    });

    cardOptAmoled.addEventListener('click', () => {
      pendingAmoled = !pendingAmoled;
      if (pendingAmoled) pendingThemeDark = true;
      updateThemeModalCards();
    });

    document.getElementById('btnCancelTheme').addEventListener('click', () => modalTheme.classList.remove('active'));
    document.getElementById('btnConfirmTheme').addEventListener('click', () => {
      modalTheme.classList.remove('active');
      if (pendingAmoled) {
        phone.setAttribute('data-theme', 'amoled');
        showToast('AMOLED pitch-black theme applied');
      } else if (pendingThemeDark) {
        phone.setAttribute('data-theme', 'dark');
        showToast('Dark theme applied');
      } else {
        phone.setAttribute('data-theme', 'light');
        showToast('Light theme applied');
      }
      // Re-synchronize current active tab pill appearance after theme change
      selectTab(currentTabIndex);
    });
  </script>
</body>
</html>`);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`DirtyFrag App Server running on http://0.0.0.0:${PORT}`);
});
