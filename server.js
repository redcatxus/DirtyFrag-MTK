const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const APK_DIR = path.join(__dirname, 'app/build/outputs/apk/debug');
const APK_PATH = path.join(APK_DIR, 'app-debug.apk');
const DIRTYFRAG_APK_PATH = path.join(APK_DIR, 'dirtyfrag.apk');

function getApkStats() {
    let target = fs.existsSync(DIRTYFRAG_APK_PATH) ? DIRTYFRAG_APK_PATH : APK_PATH;
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
    return { available: false, sizeBytes: 0, sizeMb: '0', mtime: null, filename: 'app-debug.apk' };
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Download APK routes
    if (url.pathname === '/download/dirtyfrag.apk' || url.pathname === '/download/app-debug.apk' || url.pathname === '/download') {
        const target = fs.existsSync(DIRTYFRAG_APK_PATH) ? DIRTYFRAG_APK_PATH : APK_PATH;
        if (fs.existsSync(target)) {
            const stat = fs.statSync(target);
            res.writeHead(200, {
                'Content-Type': 'application/vnd.android.package-archive',
                'Content-Length': stat.size,
                'Content-Disposition': 'attachment; filename="dirtyfrag.apk"'
            });
            return fs.createReadStream(target).pipe(res);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('APK not found. Please build the project first.');
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
  <title>DirtyFrag Android Root</title>
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
      --surface-terminal: #080b10;
      --outline: #8d9199;
      --outline-variant: #43474e;
      --primary: #92ccff;
      --on-primary: #003353;
      --secondary: #b8c8da;
      --secondary-container: #394857;
      --on-secondary-container: #d4e4f6;
      --on-surface: #e1e2e8;
      --on-surface-variant: #c3c6cf;
      --ink-terminal: #e6edf3;
      --color-error: #ffb4ab;
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
      --primary: #00639b;
      --on-primary: #ffffff;
      --secondary: #51606f;
      --secondary-container: #d5e4f7;
      --on-secondary-container: #0e1d2a;
      --on-surface: #191c20;
      --on-surface-variant: #43474e;
      --ink-terminal: #1a1c1e;
      --color-error: #ba1a1a;
    }

    /* AMOLED Theme overrides (Pure pitch black with Material You dynamic accents) */
    [data-theme="amoled"] {
      --bg: #000000;
      --surface-container-lowest: #000000;
      --surface-container-low: #000000;
      --surface-container: #000000;
      --surface-container-high: #0a0a0a;
      --surface-terminal: #000000;
      --outline: #33373e;
      --outline-variant: #1c2026;
      --primary: #92ccff;
      --on-primary: #003353;
      --secondary: #b8c8da;
      --secondary-container: #394857;
      --on-secondary-container: #d4e4f6;
      --on-surface: #e1e2e8;
      --on-surface-variant: #c3c6cf;
      --ink-terminal: #e6edf3;
      --color-error: #ffb4ab;
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
      padding: 8px 18px 116dp;
      padding-bottom: 116px;
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
      margin-bottom: 10px;
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
      transition: background 0.15s;
    }
    .icon-action-btn:hover {
      background: rgba(146, 204, 255, 0.12);
      color: var(--primary);
    }
    .action-divider {
      width: 1px;
      height: 18px;
      background: var(--outline-variant);
    }

    .terminal-box {
      background: var(--surface-terminal);
      border: 1px solid var(--outline-variant);
      border-radius: 14px;
      height: 230px;
      overflow-y: auto;
      padding: 12px;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      color: var(--ink-terminal);
      user-select: text;
      white-space: pre-wrap;
      word-break: break-all;
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

    /* MDE3 Floating Bottom Nav */
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
      padding: 0 14px;
      gap: 8px;
      transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
      user-select: none;
    }
    .nav-tab-pill.active {
      background: var(--secondary-container);
      color: var(--on-secondary-container);
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
    }
    .nav-tab-label {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }
    .nav-tab-pill:not(.active) .nav-tab-label {
      display: none;
    }

    /* Dialog Modals */
    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
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
      padding: 6px 0;
    }
    .ko-item-row {
      display: flex;
      align-items: center;
      padding: 10px 8px;
      cursor: pointer;
      border-radius: 12px;
      gap: 12px;
      transition: background 0.15s;
    }
    .ko-item-row:hover { background: rgba(146, 204, 255, 0.08); }
    .ko-radio {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--outline);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ko-radio.checked {
      border-color: var(--primary);
    }
    .ko-radio.checked::after {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary);
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
    .ko-sub.warning { color: var(--color-error); font-weight: 500; }
    .ko-sub.success { color: var(--primary); font-weight: 500; }
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

    /* Toast Notification */
    .toast {
      position: absolute;
      bottom: 96px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #272a2f;
      color: #e1e2e8;
      border: 1px solid #43474e;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 13px;
      opacity: 0;
      pointer-events: none;
      transition: all 0.25s;
      z-index: 100;
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>

  <div class="top-badge">
    <div class="dot"></div>
    <span>DirtyFrag MTK · Android Build Active</span>
    <a href="/download/dirtyfrag.apk" class="dl-btn">
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

    <!-- App Header with M3 Theme Toggle -->
    <div class="app-bar">
      <div class="app-title-group">
        <div class="app-title">DirtyFrag Android Root</div>
        <div class="app-subtitle">Experimental Android root</div>
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
          <div class="mono-body">Brand: INFINIX
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
          <!-- Log Header with Material 3 Action Box -->
          <div class="log-header">
            <div class="card-label" style="margin-bottom:0">Run Log</div>
            <div class="action-box">
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
          </div>
          <div class="terminal-box" id="logBox">Ready. Review the detected KMI and selected module before launching.</div>
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
          <div class="card-label">DirtyFrag Helper Module</div>
          <div style="font-size:14px; font-weight:600; margin-top:4px;">Selected DirtyFrag helper</div>
          <div class="sub-note">Automatic mode shows the selected file. If no helper matches this kernel, build a DFRoot dirtyfrag.ko for its KMI and select that file here.</div>
          
          <!-- Sleek Selector Card opening Material 3 Dialog -->
          <div class="field-card" id="btnOpenKoDialog">
            <div>
              <div class="field-card-title">Bundled DirtyFrag .ko</div>
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
    </div>

    <!-- KO SELECTION DIALOG (Displays clean warning: Kernel mismatch (X.XX vs Y.YY)) -->
    <div class="modal-overlay" id="modalKo">
      <div class="dialog-card">
        <div class="dialog-title">Bundled DirtyFrag .ko</div>
        <div class="dialog-subtitle">Choose module variant for this kernel</div>
        
        <div class="dialog-content-scroll" id="koOptionsList">
          <!-- Dynamically filled by JS -->
        </div>

        <div class="dialog-actions">
          <button class="dialog-btn cancel" id="btnCancelKo">Cancel</button>
          <button class="dialog-btn confirm" id="btnConfirmKo">OK</button>
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

    <!-- In-app Toast message -->
    <div class="toast" id="toast">Log copied to clipboard</div>
  </div>

  <script>
    const phone = document.getElementById('phoneMockup');
    const pager = document.getElementById('pager');
    const tabHomePill = document.getElementById('tabHomePill');
    const tabSettingsPill = document.getElementById('tabSettingsPill');
    const logBox = document.getElementById('logBox');
    const btnLaunch = document.getElementById('btnLaunchRoot');
    const toast = document.getElementById('toast');

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // Tab Navigation
    function selectTab(pageIndex) {
      if (pageIndex === 0) {
        pager.scrollTo({ left: 0, behavior: 'smooth' });
        tabHomePill.classList.add('active');
        tabSettingsPill.classList.remove('active');
      } else {
        pager.scrollTo({ left: pager.clientWidth, behavior: 'smooth' });
        tabSettingsPill.classList.add('active');
        tabHomePill.classList.remove('active');
      }
    }

    tabHomePill.addEventListener('click', () => selectTab(0));
    tabSettingsPill.addEventListener('click', () => selectTab(1));

    pager.addEventListener('scroll', () => {
      const scrollLeft = pager.scrollLeft;
      const width = pager.clientWidth;
      if (scrollLeft > width / 2) {
        tabSettingsPill.classList.add('active');
        tabHomePill.classList.remove('active');
      } else {
        tabHomePill.classList.add('active');
        tabSettingsPill.classList.remove('active');
      }
    });

    // Run Log Action Buttons
    document.getElementById('btnCopyLogs').addEventListener('click', () => {
      navigator.clipboard.writeText(logBox.textContent).then(() => showToast('Log copied to clipboard'));
    });

    document.getElementById('btnShareLogs').addEventListener('click', () => {
      showToast('Sharing run log...');
    });

    document.getElementById('btnSaveLogs').addEventListener('click', () => {
      const blob = new Blob([logBox.textContent], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dirtyfrag-log.txt';
      a.click();
      showToast('Saved dirtyfrag-log.txt');
    });

    document.getElementById('btnClearLogs').addEventListener('click', () => {
      logBox.textContent = '';
      showToast('Log cleared');
    });

    // Launch Root Action
    btnLaunch.addEventListener('click', () => {
      btnLaunch.disabled = true;
      btnLaunch.textContent = 'Launching...';
      logBox.textContent = '[*] Starting DirtyFrag Android Root session...\\n';
      
      const steps = [
        '[+] Kernel version: 6.12.38-android16-5-gb575a0b6e647\\n',
        '[+] Matched KMI: android16-6.12 (dirtyfrag-android16-6.12.ko)\\n',
        '[+] Testing splice helper & memory mapping...\\n',
        '[+] Staging ksud binary to device storage...\\n',
        '[+] Applying kernel hook via DFRoot helper...\\n',
        '[+] Checking /dev/df mount points...\\n',
        '[+] Success: KernelSU daemon initiated.\\n'
      ];

      steps.forEach((step, idx) => {
        setTimeout(() => {
          logBox.textContent += step;
          logBox.scrollTop = logBox.scrollHeight;
          if (idx === steps.length - 1) {
            btnLaunch.disabled = false;
            btnLaunch.textContent = 'Launch root';
            showToast('DirtyFrag Android Root: SUCCESS');
          }
        }, (idx + 1) * 350);
      });
    });

    // KO Selection Modal with Clean Mismatch Format: Kernel mismatch (X.XX vs Y.YY)
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
      autoRow.className = 'ko-item-row';
      const isAuto = selectedKoIndex === 0;
      autoRow.innerHTML = \`
        <div class="ko-radio \${isAuto ? 'checked' : ''}"></div>
        <div class="ko-info">
          <div class="ko-title">Automatic · dirtyfrag-android16-6.12.ko</div>
          <div class="ko-sub success">Exact KMI match for kernel (android16-6.12)</div>
        </div>
        <div class="ko-indicator" style="color:var(--primary)">
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
        row.className = 'ko-item-row';
        row.innerHTML = \`
          <div class="ko-radio \${isChecked ? 'checked' : ''}"></div>
          <div class="ko-info">
            <div class="ko-title">dirtyfrag-\${kmi.name}.ko</div>
            <div class="ko-sub \${match ? 'success' : 'warning'}">\${subText}</div>
          </div>
          <div class="ko-indicator" style="color:\${match ? 'var(--primary)' : 'var(--color-error)'}">
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
    });
  </script>
</body>
</html>`);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`DirtyFrag App Server running on http://0.0.0.0:${PORT}`);
});
