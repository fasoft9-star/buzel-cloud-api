import { execFileSync } from 'node:child_process';
import { launch } from 'chrome-launcher';
import Xvfb from 'xvfb';
import { HttpError } from '../middlewares/error.middleware.js';

/**
 * @typedef {Object} TurnstileResponse
 * @property {boolean} success
 * @property {string} token
 */

/** @type {Promise<unknown>} */
let queueLock = Promise.resolve();

/**
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function runExclusive(task) {
  const next = queueLock.then(task, task);
  queueLock = next.catch(() => {});
  return next;
}

/**
 * @param {string} display
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function x11Click(display, x, y) {
  const py = `
import ctypes, time, os
os.environ["DISPLAY"] = "${display}"
x11 = ctypes.cdll.LoadLibrary("libX11.so.6")
xtst = ctypes.cdll.LoadLibrary("libXtst.so.6")
x11.XOpenDisplay.restype = ctypes.c_void_p
d = x11.XOpenDisplay(None)
if d:
    for step in range(1, 20):
        xtst.XTestFakeMotionEvent(ctypes.c_void_p(d), -1, int(300 + (${x} - 300) * step / 19), int(300 + (${y} - 300) * step / 19), 0)
        x11.XFlush(ctypes.c_void_p(d))
        time.sleep(0.015)
    time.sleep(0.15)
    xtst.XTestFakeButtonEvent(ctypes.c_void_p(d), 1, 1, 0)
    x11.XFlush(ctypes.c_void_p(d))
    time.sleep(0.08)
    xtst.XTestFakeButtonEvent(ctypes.c_void_p(d), 1, 0, 0)
    x11.XFlush(ctypes.c_void_p(d))
    x11.XCloseDisplay(ctypes.c_void_p(d))
`;
  execFileSync('python3', ['-c', py]);
}

/**
 * @param {string} sitekey
 * @returns {string}
 */
function buildTurnstileHtml(sitekey) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>WAIT</title>
  <style>body{margin:0;padding:20px;}</style>
</head>
<body>
  <div id="w" class="cf-turnstile" data-sitekey="${sitekey}" data-callback="onOk" data-error-callback="onErr"></div>
  <script>
    window.onOk = function (t) { document.title = "TOKEN:" + t; };
    window.onErr = function (e) { document.title = "ERR:" + e; };
  </script>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</body>
</html>`;
}

/**
 * @param {number} port
 * @returns {Promise<string>}
 */
async function getTabTitle(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    /** @type {{ type: string, url: string, title: string }[]} */
    const list = await res.json();
    const pageTab = list.find((t) => t.type === 'page' && t.url !== 'about:blank');
    return pageTab?.title || '';
  } catch {
    return '';
  }
}

/**
 * @param {string} rawUrl
 * @param {string} sitekey
 * @returns {Promise<TurnstileResponse>}
 */
async function solveWithBrowser(rawUrl, sitekey) {
  const parsed = new URL(rawUrl);
  const originUrl = `${parsed.origin}/`;

  const xvfb = new Xvfb({
    silent: true,
    xvfb_args: ['-screen', '0', '1280x720x24', '-ac', '+extension', 'GLX', '+render', '-noreset'],
  });
  xvfb.startSync();
  const display = process.env.DISPLAY || ':99';

  const chrome = await launch({
    ignoreDefaultFlags: true,
    chromePath: '/opt/google/chrome/chrome-bin',
    chromeFlags: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=Translate,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1280,720',
      '--window-position=0,0',
      'about:blank',
    ],
  });

  try {
    const tabsRes = await fetch(`http://127.0.0.1:${chrome.port}/json/list`);
    /** @type {{ type: string, webSocketDebuggerUrl: string }[]} */
    const tabs = await tabsRes.json();
    const wsUrl = tabs.find((t) => t.type === 'page')?.webSocketDebuggerUrl;

    if (!wsUrl) {
      throw new HttpError(500, 'Failed to attach to browser tab');
    }

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let id = 1;
      const timer = setTimeout(() => {
        ws.close();
        reject(new HttpError(504, 'Timed out initializing Turnstile page'));
      }, 10000);

      /**
       * @param {string} method
       * @param {Record<string, unknown>} [params]
       */
      const send = (method, params = {}) => {
        ws.send(JSON.stringify({ id: id++, method, params }));
      };

      ws.onopen = () => {
        send('Fetch.enable', {
          patterns: [{ urlPattern: `${parsed.origin}/*`, resourceType: 'Document' }],
        });
        setTimeout(() => send('Page.navigate', { url: originUrl }), 100);
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.method === 'Fetch.requestPaused') {
          const html = buildTurnstileHtml(sitekey);
          send('Fetch.fulfillRequest', {
            requestId: msg.params.requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'text/html; charset=utf-8' }],
            body: Buffer.from(html).toString('base64'),
          });
          send('Fetch.disable');
          setTimeout(() => {
            clearTimeout(timer);
            ws.close();
            resolve(undefined);
          }, 150);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });

    for (let elapsed = 0; elapsed < 26000; elapsed += 500) {
      await new Promise((r) => setTimeout(r, 500));

      const title = await getTabTitle(chrome.port);
      if (title.startsWith('TOKEN:')) {
        return {
          success: true,
          token: title.slice(6),
        };
      }

      if (title.startsWith('ERR:')) {
        throw new HttpError(400, `Turnstile error: ${title.slice(4)}`);
      }

      if (elapsed === 9500 || elapsed === 15500) {
        x11Click(display, 48, 195);
      }
    }

    throw new HttpError(504, 'Timed out waiting for Turnstile token');
  } finally {
    try {
      await chrome.kill();
    } catch {}
    try {
      xvfb.stopSync();
    } catch {}
  }
}

/**
 * @param {string} url
 * @param {string} sitekey
 * @returns {Promise<TurnstileResponse>}
 */
export function solveTurnstile(url, sitekey) {
  return runExclusive(() => solveWithBrowser(url, sitekey));
}
