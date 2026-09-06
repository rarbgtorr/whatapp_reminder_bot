const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const TELEGRAM_TOKEN = '8677479696:AAFHLHiW9nHufW1127t7ETiAbl-Iw9pthFI';
const TELEGRAM_CHAT_ID = '6509466127';

async function sendTelegram(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text }) });
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: { headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] }
});

function parseDelay(t){const l=t.toLowerCase();let m=l.match(/contact after (\d+)\s*min/);if(m)return{delay:parseInt(m[1])*60000,label:`${m[1]} min`};m=l.match(/contact after (\d+)\s*hrs?/);if(m)return{delay:parseInt(m[1])*3600000,label:`${m[1]} hr`};m=l.match(/contact after (\d+)\s*days?/);if(m)return{delay:parseInt(m[1])*86400000,label:`${m[1]} day`};return null;}
function extractPhone(t){let m=t.match(/\+?\d{10,15}/g);if(!m)return null;let n=m[m.length-1].replace(/[^0-9]/g,'');return n.length>=10?n:null;}

client.on('qr', async qr => { console.log("QR"); qrcode.generate(qr,{small:true}); await sendTelegram(`📱 Scan: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`); });
client.on('ready', () => { console.log("✅ Ready"); sendTelegram("✅ WA Bot ONLINE on Cloud"); });

client.on('message_create', async msg => {
    try {
        const text=msg.body||''; if(!text.toLowerCase().includes('contact'))return; if(text.includes('⏰'))return;
        const parsed=parseDelay(text); if(!parsed)return;
        const chatId=msg.fromMe?msg.to:msg.from;
        let name=chatId; try{const c=await client.getContactById(chatId);name=c.pushname||c.name||name;}catch{}
        const phone=extractPhone(text);
        console.log(`SET ${name} -> ${parsed.label}`);
        await client.sendMessage(chatId,`⏰ Reminder set`).catch(()=>{});
        setTimeout(async()=>{ let t=phone?`🔔 REMINDER: ${name}\n💬 "${text}"\n⏰ ${parsed.label}\n📱 ${phone}\nhttps://wa.me/${phone}`:`🔔 REMINDER: ${name}\n💬 "${text}"\n⏰ ${parsed.label}`; await sendTelegram(t); }, parsed.delay);
    } catch(e){console.log(e.message);}
});

client.initialize();
