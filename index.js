const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const TELEGRAM_TOKEN = '8677479696:AAFHLHiW9nHufW1127t7ETiAbl-Iw9pthFI';
const TELEGRAM_CHAT_ID = '6509466127';

async function sendTelegram(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text }) });
}

async function start() {
    const execPath = await chromium.executablePath();

    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: './session' }),
        puppeteer: {
            headless: chromium.headless,
            executablePath: execPath,
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null
        }
    });

    function parseDelay(text) {
        const lower = text.toLowerCase(); const now = new Date();
        let m = lower.match(/contact after (\d+)\s*min/); if (m) return { delay: parseInt(m[1])*60000, label: `${m[1]} min` };
        m = lower.match(/contact after (\d+)\s*hrs?/); if (m) return { delay: parseInt(m[1])*3600000, label: `${m[1]} hr` };
        m = lower.match(/contact after (\d+)\s*days?/); if (m) return { delay: parseInt(m[1])*86400000, label: `${m[1]} day` };
        m = lower.match(/contact after (\d+)\s*weeks?/); if (m) return { delay: parseInt(m[1])*604800000, label: `${m[1]} week` };
        return null;
    }
    function extractPhone(text) { let m = text.match(/\+?\d{10,15}/g); if(!m) return null; let num=m[m.length-1].replace(/[^0-9]/g,''); return num.length>=10?num:null; }

    client.on('qr', async qr => {
        console.log("QR Ready");
        qrcode.generate(qr, {small: true});
        await sendTelegram(`📱 Scan QR: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}\n\n${qr}`);
    });
    client.on('ready', () => { console.log("✅ Ready!"); sendTelegram("✅ WA Bot ONLINE"); });
    client.on('message_create', async msg => {
        try {
            const text = msg.body||''; if(!text.toLowerCase().includes('contact')) return;
            if(text.includes('⏰')) return;
            const parsed = parseDelay(text); if(!parsed) return;
            const chatId = msg.fromMe?msg.to:msg.from;
            let displayName = chatId;
            try{ const c = await client.getContactById(chatId); displayName = c.pushname||c.name||displayName; }catch{}
            const typedPhone = extractPhone(text);
            console.log(`SET! ${displayName} -> ${parsed.label}`);
            await client.sendMessage(chatId, `⏰ Reminder set`).catch(()=>{});
            setTimeout(async ()=>{
                let tMsg = typedPhone?`🔔 REMINDER: ${displayName}\n💬 "${text}"\n⏰ Due: ${parsed.label}\n📱 ${typedPhone}\nhttps://wa.me/${typedPhone}`:`🔔 REMINDER: ${displayName}\n💬 "${text}"\n⏰ Due: ${parsed.label}`;
                await sendTelegram(tMsg);
            }, parsed.delay);
        } catch(e){ console.log(e.message); }
    });
    client.initialize();
}
start();
