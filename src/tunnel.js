import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_URL_FILE } from './utils/url.util.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const LOCAL_TARGET = process.env.TUNNEL_TARGET || 'http://127.0.0.1:3000';

let announcedUrl = '';

/**
 * @param {string} publicUrl
 * @returns {Promise<void>}
 */
async function saveAndNotifyPublicUrl(publicUrl) {
  if (!publicUrl || publicUrl === announcedUrl) return;
  announcedUrl = publicUrl;

  await fs.mkdir(path.dirname(PUBLIC_URL_FILE), { recursive: true });
  await fs.writeFile(PUBLIC_URL_FILE, publicUrl, 'utf8');
  console.log(`[Cloudflare Tunnel] Public URL active: ${publicUrl}`);

  const text =
    `🌐 *Buzel CDN & REST API Online!*\n\n` +
    `🚀 *Web Upload CDN:*\n${publicUrl}/cdn\n\n` +
    `⚡ *Base REST API:*\n${publicUrl}\n\n` +
    `📌 *Endpoints:*\n` +
    `• \`${publicUrl}/cdn\` (Web UI)\n` +
    `• \`${publicUrl}/upload\` (POST File)\n` +
    `• \`${publicUrl}/tiktok?url=\`\n` +
    `• \`${publicUrl}/play?q=\`\n` +
    `• \`${publicUrl}/ai?prompt=\`\n` +
    `• \`${publicUrl}/turnstile?url=&sitekey=\``;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  }).catch(() => null);
}

function startTunnel() {
  const child = spawn(
    '/usr/local/bin/cloudflared',
    ['tunnel', '--url', LOCAL_TARGET, '--no-autoupdate', '--protocol', 'http2'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  /**
   * @param {Buffer} chunk
   */
  const handleOutput = (chunk) => {
    const line = chunk.toString('utf8');
    process.stdout.write(line);
    const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match && match[0]) {
      saveAndNotifyPublicUrl(match[0]);
    }
  };

  child.stdout.on('data', handleOutput);
  child.stderr.on('data', handleOutput);

  child.on('exit', (code) => {
    console.error(`[Cloudflare Tunnel] exited with code ${code}, restarting in 3s...`);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
