const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DIST_DIR = path.join(__dirname, 'dist');
const PORT = 4173;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

async function capture(outPath, mode = 'welcome') {
  return new Promise((resolve, reject) => {
    server.listen(PORT, async () => {
      let browser;
      try {
        try {
          browser = await chromium.launch();
        } catch (e) {
          browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
        }
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

        await page.goto(`http://localhost:${PORT}`);
        await page.evaluate(() => {
          localStorage.setItem('rethink_auth_token', 'mock_token');
          localStorage.setItem('rethink_auth_user', JSON.stringify({ id: 'guest', name: '访客体验', role: 'guest' }));
        });

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        if (mode === 'active_chat' || mode === 'chat') {
          // 1. Click "开始对话"
          const startBtn = await page.$('button:has-text("开始对话")');
          if (startBtn) {
            await startBtn.click();
            await page.waitForTimeout(500);
          }

          // 2. Click "跳过，直接输入文字"
          const skipBtn = await page.$('button:has-text("跳过")');
          if (skipBtn) {
            await skipBtn.click();
            await page.waitForTimeout(500);
          }

          // 3. Type into input box and send
          const textarea = await page.$('textarea');
          if (textarea) {
            await textarea.fill('你好！最近工作压力有点大，总是失眠。');
            await page.waitForTimeout(200);
            const sendBtn = await page.$('button[aria-label="发送消息"]');
            if (sendBtn) {
              await sendBtn.click();
              await page.waitForTimeout(1000);
            }
          }
        }

        await page.waitForTimeout(500);
        await page.screenshot({ path: outPath, fullPage: false });
        console.log('Screenshot saved to', outPath);
        await browser.close();
        server.close(() => resolve());
      } catch (err) {
        if (browser) await browser.close();
        server.close(() => reject(err));
      }
    });
  });
}

const outputFile = process.argv[2] || 'screenshot.png';
const mode = process.argv[3] || 'welcome';
capture(outputFile, mode).catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
