const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const http = require('http');

// Fix for Render - open a port
http.createServer((req,res)=>{ res.writeHead(200); res.end('Bot Online - Scan QR in logs'); }).listen(process.env.PORT || 10000, ()=>console.log('HTTP server ready'));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8677479696:AAFHLHiW9nHufW1127t7ETiAbl-Iw9pthFI';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6509466127';

async function sendTelegram(text){
  try{
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(text)}`;
    await fetch(url);
  }catch(e){ console.log('Telegram failed, but continuing:', e.message); }
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  puppeteer: { args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--no-zygote'] }
});

client.on('qr', async (qr) => {
  console.log('=== QR CODE - SCAN WITH WHATSAPP ===');
  qrcode.generate(qr, { small: true });
  console.log('QR STRING:', qr);
  console.log('If QR above not scannable, open this link: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qr));
  // try telegram but don't crash
  await sendTelegram('WA QR: ' + qr);
});

client.on('ready', () => console.log('BOT READY!'));
client.on('authenticated', () => console.log('AUTHENTICATED'));
client.initialize();
