const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Health check for Render + UptimeRobot
app.get('/', (req, res) => {
  res.send('Bot Online - Scan QR in logs');
});
app.listen(PORT, () => {
  console.log(`HTTP server ready on port ${PORT}`);
});

console.log('Starting WhatsApp client...');

const client = new Client({
  authStrategy: new LocalAuth({ 
    dataPath: './session',
    clientId: 'reminder-bot'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions'
    ]
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

client.on('qr', (qr) => {
  console.log('=== QR CODE - SCAN WITH WHATSAPP ===');
  qrcode.generate(qr, { small: true });
  console.log('QR STRING:', qr);
  console.log(`If QR above not scannable, open this link: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
});

client.on('authenticated', () => {
  console.log('AUTHENTICATED - SESSION SAVED');
});

client.on('auth_failure', (msg) => {
  console.log('AUTH FAILED:', msg);
});

client.on('ready', () => {
  console.log('BOT READY! WHATSAPP CONNECTED - YOU CAN CLOSE QR');
});

client.on('disconnected', (reason) => {
  console.log('DISCONNECTED:', reason);
});

client.on('message', async (msg) => {
  try {
    const body = msg.body.toLowerCase().trim();
    console.log(`Message from ${msg.from}: ${msg.body}`);

    if (body === 'ping') {
      await msg.reply('Pong! Bot is alive ✅');
    }
    
    // Add your reminder logic here
    // if (body.startsWith('remind')) { ... }

  } catch (err) {
    console.log('Message error:', err.message);
  }
});

client.initialize().catch(err => {
  console.log('Initialize error:', err.message);
});

// Prevent crash
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection:', err.message);
});
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
});
