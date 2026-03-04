import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as http from 'http';
import * as qrcode from 'qrcode-terminal';
import pino from 'pino';
import { prisma } from '../lib/prisma';
import { usePrismaAuthState } from '../lib/auth-baileys';
import { normalizePhone } from '../lib/encryption';

import { handleIncomingMessage } from './whatsapp-bot-logic';

// Configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
// const AUTH_FOLDER = 'auth_info_baileys'; // Deprecated in favor of DB

// Global socket variable
let sock: any = undefined;
let latestQR: string | null = null;

// Reconnection management
let retryCount = 0;
const MAX_RETRY_DELAY = 60 * 1000; // 1 minute

// Track manual chat to silence bot (JID -> timestamp)
const lastManualChat = new Map<string, number>();
const SILENCE_DURATION = 5 * 60 * 1000; // 5 minutes
const SILENCE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

const ALLOWED_ORIGINS = [
    'https://kasaku.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL,
].filter((origin): origin is string => Boolean(origin));

const createCorsHeaders = (req: http.IncomingMessage) => {
    const requestOrigin = req.headers.origin || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0] || '';

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
    };
};

setInterval(() => {
    const now = Date.now();
    for (const [jid, timestamp] of lastManualChat.entries()) {
        if (now - timestamp > SILENCE_DURATION) {
            lastManualChat.delete(jid);
        }
    }
}, SILENCE_CLEANUP_INTERVAL).unref();

async function connectToWhatsApp() {
    const { state, saveCreds } = await usePrismaAuthState(prisma);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[BOT] Using WhatsApp version ${version.join('.')}, isLatest: ${isLatest}`);

    // Create socket
    const socket = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }) as any,
        browser: Browsers.macOS('Desktop'),
    });

    sock = socket;

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return; // Only handle notifications

        for (const msg of m.messages) {
            try {
                if (!msg || !msg.key || !msg.key.remoteJid) continue;

                // If message is from ME (the owner manually chatting), update silence timer
                if (msg.key.fromMe) {
                    const jid = msg.key.remoteJid;
                    lastManualChat.set(jid, Date.now());
                    console.log(`[BOT] Manual chat detected for ${jid}. Silencing auto-replies for 5m.`);
                    continue;
                }

                // Check if sender is in the block list (resolve LID if needed)
                let senderPhone = msg.key.remoteJid!.split('@')[0];
                if (msg.key.remoteJid!.endsWith('@lid') && (msg.key as any).remoteJidAlt) {
                    senderPhone = (msg.key as any).remoteJidAlt.split('@')[0];
                }
                const isBlocked = await prisma.botBlockList.findUnique({
                    where: { phone: senderPhone }
                });
                if (isBlocked) {
                    console.log(`[BOT] Message from ${senderPhone} BLOCKED (in block list). Ignoring.`);
                    continue;
                }

                // Check if silence is active for this sender
                const lastManual = lastManualChat.get(msg.key.remoteJid);
                const isSilenceActive = lastManual ? (Date.now() - lastManual < SILENCE_DURATION) : false;

                console.log(`[BOT] New message received from ${msg.key.remoteJid}${isSilenceActive ? ' (SILENCE ACTIVE)' : ''}`);

                await handleIncomingMessage(socket, { messages: [msg], type: m.type }, isSilenceActive);
            } catch (error: any) {
                console.error('[BOT ERROR] Critical error processing individual message in loop:', error.message || error);
            }
        }
    });

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            latestQR = qr;
            console.log(`\n[SERVER] QR Code updated! View it at: /qr (Admin Secret required)`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.error(`[SERVER] Connection closed (code: ${statusCode}). Error:`, lastDisconnect?.error);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('[SERVER] Device logged out. Clearing session and restarting...');
                await clearSession();
                retryCount = 0;
                connectToWhatsApp();
            } else if (shouldReconnect) {
                retryCount++;
                const delay = Math.min(retryCount * 5000, MAX_RETRY_DELAY);
                console.log(`[SERVER] Reconnecting in ${delay / 1000}s (Retry #${retryCount})...`);

                // If it's code 515, it might be a stream error that needs a fresh start
                if (statusCode === 515) {
                    console.log('[SERVER] Stream Errored (515) detected. Ensuring clean state.');
                }

                setTimeout(connectToWhatsApp, delay);
            }
        }
        else if (connection === 'open') {
            latestQR = null;
            retryCount = 0;
            console.log('[SERVER] WhatsApp connection opened!');
        }
    });
}

async function clearSession() {
    try {
        console.log('Clearing WhatsApp session from database...');
        await prisma.whatsAppAuth.deleteMany({});
        sock = undefined;
        latestQR = null;
        console.log('Session cleared.');
    } catch (e) {
        console.error('Error clearing session:', e);
    }
}



// Start WhatsApp Connection
connectToWhatsApp();

// Start HTTP Server (Only Once)
const server = http.createServer(async (req, res) => {
    const headers = createCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const secret = url.searchParams.get('secret');
    const adminSecret = process.env.WHATSAPP_ADMIN_SECRET || 'changeme';

    if (req.url?.startsWith('/logout') && req.method === 'POST') {
        if (secret !== adminSecret) {
            res.writeHead(403, headers);
            res.end(JSON.stringify({ error: 'Forbidden: Invalid secret' }));
            return;
        }
        try {
            if (sock) {
                sock.end(undefined);
            }
            await clearSession();
            connectToWhatsApp();
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ success: true, message: 'Session cleared. Reconnecting...' }));
        } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    if (req.url === '/send-otp' && req.method === 'POST') {
        console.log(`[SERVER] Incoming /send-otp request | Origin: ${req.headers.origin || 'N/A'} | UA: ${req.headers['user-agent']}`);
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                if (!sock) {
                    throw new Error('WhatsApp not connected yet');
                }

                const { phone, otp } = JSON.parse(body);

                if (!phone || !otp) {
                    res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ error: 'Missing phone or otp' }));
                    return;
                }

                // Format phone: normalize first, then ensure it ends with @s.whatsapp.net
                const cleanPhone = normalizePhone(phone);
                const jid = cleanPhone + '@s.whatsapp.net';

                await sock.sendMessage(jid, {
                    text: `*KASAKU OTP*\n\nKode verifikasi Anda adalah: *${otp}*\n\nJangan berikan kode ini kepada siapapun.`
                });

                console.log(`Sent OTP ${otp} to ${phone}`);

                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
                console.error('Error sending message:', err.message || err);
                res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ error: 'Failed to send message: ' + (err.message || 'Unknown error') }));
            }
        });
    } else if (req.url === '/send-message' && req.method === 'POST') {
        console.log(`[SERVER] Incoming /send-message request | Origin: ${req.headers.origin || 'N/A'} | UA: ${req.headers['user-agent']}`);
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                if (!sock) {
                    throw new Error('WhatsApp not connected yet');
                }

                const { phone, text } = JSON.parse(body);

                if (!phone || !text) {
                    res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ error: 'Missing phone or text' }));
                    return;
                }

                const cleanPhone = normalizePhone(phone);
                const jid = cleanPhone + '@s.whatsapp.net';

                await sock.sendMessage(jid, { text });

                console.log(`Sent message to ${phone}`);

                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
                console.error('Error sending message:', err.message || err);
                res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ error: 'Failed to send message: ' + (err.message || 'Unknown error') }));
            }
        });
    } else if (req.url?.startsWith('/blocklist') && req.method === 'GET') {
        if (secret !== adminSecret) {
            res.writeHead(403, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: 'Forbidden: Invalid secret' }));
            return;
        }
        try {
            const blocklist = await prisma.botBlockList.findMany({ orderBy: { createdAt: 'desc' } });
            res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ blocklist }));
        } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: err.message }));
        }
    } else if (req.url?.startsWith('/blocklist') && req.method === 'POST') {
        if (secret !== adminSecret) {
            res.writeHead(403, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: 'Forbidden: Invalid secret' }));
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { phone: rawPhone, label } = JSON.parse(body);
                if (!rawPhone) {
                    res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ error: 'Missing phone' }));
                    return;
                }
                const phone = normalizePhone(rawPhone);
                const entry = await prisma.botBlockList.create({ data: { phone, label: label ? label : null } });
                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true, entry }));
            } catch (err: any) {
                if (err.code === 'P2002') {
                    res.writeHead(409, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ error: 'Phone number already in block list' }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ error: err.message }));
                }
            }
        });
    } else if (req.url?.startsWith('/blocklist') && req.method === 'DELETE') {
        if (secret !== adminSecret) {
            res.writeHead(403, { 'Content-Type': 'application/json', ...headers });
            res.end(JSON.stringify({ error: 'Forbidden: Invalid secret' }));
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                if (!id) {
                    res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
                    res.end(JSON.stringify({ error: 'Missing id' }));
                    return;
                }
                await prisma.botBlockList.delete({ where: { id } });
                res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else if (req.url?.startsWith('/qr') && req.method === 'GET') {
        if (secret !== adminSecret) {
            res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
            res.end(`
                <body style="background:#0f172a; color:#f8fafc; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif">
                    <div style="text-align:center; padding:2rem; background:#1e293b; border-radius:1rem; border:1px solid #334155">
                        <h1 style="color:#e11d48">🚫 Access Denied</h1>
                        <p style="color:#94a3b8">Halaman ini dilindungi. Silakan gunakan kunci rahasia.</p>
                    </div>
                </body>
            `);
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...headers });

        const htmlContent = (content: string) => `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Kasaku WhatsApp Bot</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 100vh;
                        padding: 2rem 0;
                        gap: 1.5rem;
                        margin: 0;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        background: #0f172a; /* Slate 900 */
                        color: #f8fafc; /* Slate 50 */
                    }
                    .container {
                        text-align: center;
                        background: #1e293b; /* Slate 800 */
                        padding: 2rem;
                        border-radius: 1.5rem;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        max-width: 90%;
                        width: 380px;
                        border: 1px solid #334155;
                    }
                    .blocklist-container {
                        background: #1e293b;
                        padding: 2rem;
                        border-radius: 1.5rem;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        max-width: 90%;
                        width: 420px;
                        border: 1px solid #334155;
                    }
                    h1 { margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; }
                    h2 { margin-bottom: 0.25rem; font-size: 1.25rem; font-weight: 700; }
                    p { color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.5; font-size: 0.95rem; }
                    .qr-wrapper {
                        background: white;
                        padding: 1rem;
                        border-radius: 1rem;
                        display: inline-block;
                        margin: 0.5rem 0 1.5rem;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    }
                    img { display: block; width: 100%; height: auto; max-width: 250px; }
                    button {
                        background: #e11d48; /* Rose 600 */
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.75rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 0.9rem;
                        width: 100%;
                        margin-top: 0.5rem;
                    }
                    button:hover { background: #be123c; transform: translateY(-1px); }
                    button:active { transform: translateY(0); }
                    .status-badge {
                        background: #10b981;
                        color: #064e3b;
                         padding: 0.35rem 1rem;
                        border-radius: 9999px;
                        font-size: 0.875rem;
                        font-weight: 600;
                        display: inline-block;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
                    }
                    .bl-form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
                    .bl-input {
                        background: #0f172a;
                        border: 1px solid #334155;
                        border-radius: 0.5rem;
                        color: #f8fafc;
                        padding: 0.6rem 0.75rem;
                        font-size: 0.9rem;
                        outline: none;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .bl-input:focus { border-color: #64748b; }
                    .bl-add-btn {
                        background: #16a34a;
                        color: white;
                        border: none;
                        padding: 0.65rem 1rem;
                        border-radius: 0.5rem;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.9rem;
                        width: 100%;
                        margin-top: 0;
                        transition: background 0.2s;
                    }
                    .bl-add-btn:hover { background: #15803d; transform: none; }
                    .bl-list { margin-top: 0.75rem; }
                    .bl-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0.6rem 0.75rem;
                        border: 1px solid #334155;
                        border-radius: 0.5rem;
                        margin-bottom: 0.4rem;
                        font-size: 0.875rem;
                        gap: 0.5rem;
                    }
                    .bl-item-info { flex: 1; text-align: left; }
                    .bl-item-phone { font-weight: 600; color: #f8fafc; }
                    .bl-item-label { color: #94a3b8; font-size: 0.8rem; }
                    .bl-item-date { color: #64748b; font-size: 0.75rem; }
                    .bl-remove-btn {
                        background: #e11d48;
                        color: white;
                        border: none;
                        padding: 0.3rem 0.7rem;
                        border-radius: 0.4rem;
                        cursor: pointer;
                        font-size: 0.8rem;
                        font-weight: 600;
                        width: auto;
                        margin-top: 0;
                        transition: background 0.2s;
                        flex-shrink: 0;
                    }
                    .bl-remove-btn:hover { background: #be123c; transform: none; }
                    .bl-empty { color: #64748b; font-size: 0.875rem; text-align: center; padding: 1rem 0; }
                    .bl-error { color: #f87171; font-size: 0.875rem; margin-top: 0.25rem; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${content}
                </div>
                <div class="blocklist-container">
                    <h2>🚫 Block List</h2>
                    <p style="margin-bottom:1rem;">Nomor yang diblokir tidak akan mendapat respons bot sama sekali.</p>
                    <div class="bl-form">
                        <input id="bl-phone" class="bl-input" type="text" placeholder="6281234567890" />
                        <input id="bl-label" class="bl-input" type="text" placeholder="Label (opsional)" />
                        <button class="bl-add-btn" onclick="addToBlocklist()">Tambah</button>
                        <div id="bl-form-error" class="bl-error"></div>
                    </div>
                    <div class="bl-list" id="bl-list"></div>
                </div>
                <script>
                    const SECRET = '${secret}';

                    async function loadBlocklist() {
                        const listEl = document.getElementById('bl-list');
                        listEl.innerHTML = '<div class="bl-empty">Memuat...</div>';
                        try {
                            const res = await fetch('/blocklist?secret=' + SECRET);
                            const data = await res.json();
                            renderBlocklist(data.blocklist || []);
                        } catch (e) {
                            listEl.innerHTML = '<div class="bl-error">Gagal memuat daftar blokir.</div>';
                        }
                    }

                    function renderBlocklist(list) {
                        const listEl = document.getElementById('bl-list');
                        if (!list.length) {
                            listEl.innerHTML = '<div class="bl-empty">Belum ada nomor yang diblokir.</div>';
                            return;
                        }
                        listEl.innerHTML = list.map(entry => \`
                            <div class="bl-item">
                                <div class="bl-item-info">
                                    <div class="bl-item-phone">\${entry.phone}</div>
                                    \${entry.label ? \`<div class="bl-item-label">\${entry.label}</div>\` : ''}
                                    <div class="bl-item-date">\${new Date(entry.createdAt).toLocaleString('id-ID')}</div>
                                </div>
                                <button class="bl-remove-btn" onclick="removeFromBlocklist('\${entry.id}')">Hapus</button>
                            </div>
                        \`).join('');
                    }

                    async function addToBlocklist() {
                        const phone = document.getElementById('bl-phone').value.trim();
                        const label = document.getElementById('bl-label').value.trim();
                        const errEl = document.getElementById('bl-form-error');
                        errEl.textContent = '';
                        if (!phone) { errEl.textContent = 'Nomor telepon wajib diisi.'; return; }
                        try {
                            const res = await fetch('/blocklist?secret=' + SECRET, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phone, label: label || undefined })
                            });
                            const data = await res.json();
                            if (!res.ok) { errEl.textContent = data.error || 'Gagal menambahkan.'; return; }
                            document.getElementById('bl-phone').value = '';
                            document.getElementById('bl-label').value = '';
                            loadBlocklist();
                        } catch (e) {
                            errEl.textContent = 'Gagal menambahkan nomor.';
                        }
                    }

                    async function removeFromBlocklist(id) {
                        if (!confirm('Hapus nomor ini dari daftar blokir?')) return;
                        try {
                            const res = await fetch('/blocklist?secret=' + SECRET, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id })
                            });
                            const data = await res.json();
                            if (!res.ok) { alert(data.error || 'Gagal menghapus.'); return; }
                            loadBlocklist();
                        } catch (e) {
                            alert('Gagal menghapus nomor.');
                        }
                    }

                    async function logout() {
                        if(confirm("Yakin ingin mereset koneksi? Ini akan melogout bot.")) {
                            const btn = document.querySelector('.container button');
                            btn.disabled = true;
                            btn.innerText = 'Resetting...';
                            try {
                                const res = await fetch('/logout?secret=${secret}', { method: 'POST' });
                                const data = await res.json();
                                if(data.success) {
                                    alert('Sesi direset. Halaman akan dimuat ulang.');
                                    setTimeout(() => location.reload(), 1000);
                                } else {
                                    alert('Gagal: ' + data.error);
                                    btn.disabled = false;
                                    btn.innerText = 'Reset Connection / Logout';
                                }
                            } catch (e) {
                                alert('Error: ' + e.message);
                                btn.disabled = false;
                            }
                        }
                    }

                    loadBlocklist();
                </script>
            </body>
            </html>
        `;

        if (!latestQR) {
            res.end(htmlContent(`
                <div class="status-badge" style="background:#dcfce7; color:#166534">✅ Connected</div>
                <h1>WhatsApp Terhubung</h1>
                <p>Bot Kasaku sudah aktif dan siap menerima pesan.</p>
                <button onclick="logout()">Reset Connection / Logout</button>
            `));
        } else {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQR)}`;
            res.end(htmlContent(`
                <h1>📱 Scan QR Code</h1>
                <p>Buka WhatsApp &rarr; Perangkat Tertaut &rarr; Tautkan Perangkat</p>
                <div class="qr-wrapper">
                    <img src="${qrImageUrl}" alt="Scan QR Code" />
                </div>
                <p style="font-size: 0.8rem; margin-bottom: 0;">QR code refresh otomatis tiap 20 detik</p>
                <script>setTimeout(() => location.reload(), 20000);</script>
                <br/>
                <button onclick="logout()">Reset Connection / Logout</button>
            `));
        }
    }
    else if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
        res.end(JSON.stringify({ status: 'ok', connected: !!sock, qrAvailable: !!latestQR }));
    } else {
        res.writeHead(404, headers);
        res.end();
    }
});


server.listen(PORT, () => {
    console.log(`[SERVER] Bot Server listening on port ${PORT}`);
});
