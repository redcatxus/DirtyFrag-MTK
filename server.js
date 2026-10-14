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
      --surface-container-low: #191c20;
      --surface-container: #1d2024;
      --surface-container-high: #272a2f;
      --surface-terminal: #080b10;
      --outline-variant: #43474e;
      --primary: #92ccff;
      --on-primary: #003353;
      --secondary-container: #394857;
      --on-secondary-container: #d4e4f6;
      --on-surface: #e1e2e8;
      --on-surface-variant: #c3c6cf;
      --ink-terminal: #e6edf3;
      --radius-card: 20px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background-color: #06080b;
      color: var(--on-surface);
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
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      padding: 8px 16px;
      border-radius: 9999px;
      margin-bottom: 16px;
      font-size: 13px;
      color: var(--on-surface-variant);
    }
    .top-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade8088;
    }
    .dl-btn {
      background: var(--primary);
      color: var(--on-primary);
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
      padding: 8px 24px 12px;
      flex-shrink: 0;
    }
    .app-title { font-size: 24px; font-weight: 700; color: var(--on-surface); }
    .app-subtitle { font-size: 13px; color: var(--on-surface-variant); margin-top: 2px; }

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
      padding: 8px 20px 110px;
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
      background: #32353a;
      color: #71767f;
      cursor: not-allowed;
    }

    .sub-note {
      font-size: 12px;
      color: var(--on-surface-variant);
      margin-top: 10px;
      line-height: 1.4;
    }

    /* Log Screen */
    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .log-actions { display: flex; gap: 8px; }
    .text-btn {
      background: transparent;
      border: none;
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .text-btn:hover { background: rgba(146, 204, 255, 0.12); }

    .terminal-box {
      background: var(--surface-terminal);
      border: 1px solid var(--outline-variant);
      border-radius: 14px;
      height: 220px;
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
    .field-box {
      margin-top: 10px;
      padding: 12px;
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      border-radius: 12px;
      font-family: 'Roboto Mono', monospace;
      font-size: 12px;
      color: var(--on-surface);
    }
    .outline-btn {
      width: 100%;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--primary);
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
    }
    .floating-nav {
      pointer-events: auto;
      width: 240px;
      height: 66px;
      background: var(--surface-container);
      border: 1px solid var(--outline-variant);
      border-radius: 33px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      display: flex;
      padding: 6px;
      gap: 6px;
    }
    .nav-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border-radius: 26px;
      cursor: pointer;
      color: var(--on-surface-variant);
      font-size: 12px;
      font-weight: 500;
      transition: color 0.2s;
      position: relative;
    }
    .nav-tab .pill-indicator {
      width: 58px;
      height: 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s, transform 0.2s;
    }
    .nav-tab.active .pill-indicator {
      background: var(--secondary-container);
    }
    .nav-tab.active {
      color: var(--on-surface);
      font-weight: 600;
    }
    .nav-tab.active svg {
      fill: var(--on-secondary-container);
    }
    .nav-tab svg {
      width: 22px;
      height: 22px;
      fill: var(--on-surface-variant);
      transition: fill 0.2s;
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

  <div class="phone-mockup">
    <!-- Status Bar -->
    <div class="status-bar">
      <span>21:04</span>
      <div class="status-icons">
        <span>4G</span>
        <span>61%</span>
      </div>
    </div>

    <!-- App Header -->
    <div class="app-bar">
      <div class="app-title">DirtyFrag Android Root</div>
      <div class="app-subtitle">Experimental Android root</div>
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
          <div class="log-header">
            <div class="card-label" style="margin-bottom:0">Run Log</div>
            <div class="log-actions">
              <button class="text-btn" id="btnCopy">Copy</button>
              <button class="text-btn" id="btnClear">Clear</button>
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
          <div style="font-size:14px; font-weight:600; margin-top:4px;">Selected: dirtyfrag-android16-6.12.ko · automatic for android16-6.12</div>
          <div class="sub-note">Automatic mode uses the detected KMI. You can choose another bundled variant with the same kernel major/minor.</div>
          <div class="field-box">Bundled .ko: dirtyfrag-android16-6.12.ko</div>
          <button class="outline-btn">Choose custom DFRoot .ko</button>
          <button class="action-btn" style="height:44px; font-size:14px; margin-top:8px;">Use automatic KMI selection</button>
        </div>

        <div class="card">
          <div class="card-label">Advanced Patch #2 Targets</div>
          <div class="sub-note">Optional device-specific carrier files used for patch #2.</div>
          <div class="field-box" style="white-space:pre-wrap;">/vendor/etc/vintf/manifest.xml
/system/vendor/etc/vintf/manifest.xml</div>
          <button class="action-btn" style="height:44px; font-size:14px; margin-top:10px;">Save target profile</button>
        </div>
      </div>
    </div>

    <!-- MDE3 Floating Navigation Capsule -->
    <div class="floating-nav-wrap">
      <div class="floating-nav">
        <div class="nav-tab active" id="tabHome">
          <div class="pill-indicator">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </div>
          <span>Home</span>
        </div>
        <div class="nav-tab" id="tabSettings">
          <div class="pill-indicator">
            <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </div>
          <span>Settings</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    const pager = document.getElementById('pager');
    const tabHome = document.getElementById('tabHome');
    const tabSettings = document.getElementById('tabSettings');
    const pageHome = document.getElementById('pageHome');
    const pageSettings = document.getElementById('pageSettings');
    const logBox = document.getElementById('logBox');
    const btnLaunch = document.getElementById('btnLaunchRoot');
    const btnCopy = document.getElementById('btnCopy');
    const btnClear = document.getElementById('btnClear');

    function selectTab(pageIndex) {
      if (pageIndex === 0) {
        pager.scrollTo({ left: 0, behavior: 'smooth' });
        tabHome.classList.add('active');
        tabSettings.classList.remove('active');
      } else {
        pager.scrollTo({ left: pager.clientWidth, behavior: 'smooth' });
        tabSettings.classList.add('active');
        tabHome.classList.remove('active');
      }
    }

    tabHome.addEventListener('click', () => selectTab(0));
    tabSettings.addEventListener('click', () => selectTab(1));

    // Handle touch scroll sync between pages
    pager.addEventListener('scroll', () => {
      const scrollLeft = pager.scrollLeft;
      const width = pager.clientWidth;
      if (scrollLeft > width / 2) {
        tabSettings.classList.add('active');
        tabHome.classList.remove('active');
      } else {
        tabHome.classList.add('active');
        tabSettings.classList.remove('active');
      }
    });

    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(logBox.textContent).then(() => {
        btnCopy.textContent = 'Copied!';
        setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
      });
    });

    btnClear.addEventListener('click', () => {
      logBox.textContent = '';
    });

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
          }
        }, (idx + 1) * 400);
      });
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
