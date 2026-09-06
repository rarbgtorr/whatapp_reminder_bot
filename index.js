const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const TELEGRAM_TOKEN = '8677479696:AAFHLHiW9nHufW1127t7ETiAbl-Iw9pthFI';
const TELEGRAM_CHAT_ID = '6509466127';

async function sendTelegram(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text }) });
}

async function sendTelegramQR(qr) {
    // Send QR as text - you can scan from qr generator site
    await sendTelegram(`📱 Scan this QR to login WhatsApp:\n\nGo to https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300\n\nOr copy this:\n${qr}`);
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
    }
});

function parseDelay(text) {
    const lower = text.toLowerCase(); const now = new Date();
    let m = lower.match(/contact after (\d+)\s*min/); if (m) return { delay: parseInt(m[1])*60000, label: `${m[1]} min` };
    m = lower.match(/contact after (\d+)\s*hrs?/); if (m) return { delay: parseInt(m[1])*3600000, label: `${m[1]} hr` };
    m = lower.match(/contact after (\d+)\s*days?/); if (m) return { delay: parseInt(m[1])*86400000, label: `${m[1]} day` };
    m = lower.match(/contact after (\d+)\s*weeks?/); if (m) return { delay: parseInt(m[1])*604800000, label: `${m[1]} week` };
    m = lower.match(/contact on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (m) {
        const days = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
        const target = days[m[1].toLowerCase()]; const result = new Date(); result.setHours(9,0,0,0);
        let diff = target - new Date().getDay(); if (diff <= 0) diff += 7;
        result.setDate(new Date().getDate() + diff);
        return { delay: result - now, label: `on ${m[1]}` };
    }
    if (lower.includes('next month first week')) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1, 9,0,0);
        let day = nextMonth.getDay(); let add = day===0?1:day===1?0:8-day;
        nextMonth.setDate(1+add);
        return { delay: nextMonth-now, label: `next month first week` };
    }
    return null;
}

function extractPhone(text) {
    let m = text.match(/\+?\d{10,15}/g); if(!m) return null;
    let num = m[m.length-1].replace(/[^0-9]/g,'');
    return num.length>=10?num:null;
}

client.on('qr', async qr => {
    console.log("QR Generated");
    qrcode.generate(qr, {small: true});
    await sendTelegramQR(qr);
});

client.on('ready', () => { console.log("✅ Ready!"); sendTelegram("✅ WA Bot is online on Cloud!"); });
client.on('auth_failure', () => sendTelegram("❌ Auth failed - need re-scan"));

client.on('message_create', async msg => {
    try {
        const text = msg.body||''; if(!text.toLowerCase().includes('contact')) return;
        if(text.includes('⏰')||text.includes('🔔')) return;
        const parsed = parseDelay(text); if(!parsed) return;
        const chatId = msg.fromMe?msg.to:msg.from;
        let displayName = chatId;
        try{ const c = await client.getContactById(chatId); displayName = c.pushname||c.name||displayName; }catch{}
        const typedPhone = extractPhone(text);
        console.log(`SET! ${displayName} -> ${parsed.label}`);
        await client.sendMessage(chatId, `⏰ Reminder set`).catch(()=>{});
        setTimeout(async ()=>{
            let telegramMsg = typedPhone?`🔔 REMINDER: ${displayName}\n\n💬 "${text}"\n⏰ Due: ${parsed.label}\n\n📱 Number: ${typedPhone}\nOpen: https://wa.me/${typedPhone}`:`🔔 REMINDER: ${displayName}\n\n💬 "${text}"\n⏰ Due: ${parsed.label}`;
            if(chatId.includes('@c.us') &&!typedPhone){
                telegramMsg = `🔔 REMINDER: ${displayName}\n\n💬 "${text}"\n⏰ Due: ${parsed.label}\n\nOpen: https://wa.me/${chatId.replace('@c.us','')}`;
            }
            await sendTelegram(telegramMsg);
        }, parsed.delay);
    } catch(e){ console.log(e.message); }
});

client.initialize();
