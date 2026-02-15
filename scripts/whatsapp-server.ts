import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
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

// Track manual chat to silence bot (JID -> timestamp)
const lastManualChat = new Map<string, number>();
const SILENCE_DURATION = 5 * 60 * 1000; // 5 minutes

async function connectToWhatsApp() {
    const { state, saveCreds } = await usePrismaAuthState(prisma);

    // Create socket
    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }) as any,
    });

    sock = socket;

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return; // Only handle notifications

        for (const msg of m.messages) {
            // If message is from ME (the owner manually chatting), update silence timer
            if (msg.key.fromMe) {
                const jid = msg.key.remoteJid;
                if (jid) {
                    lastManualChat.set(jid, Date.now());
                    console.log(`[BOT] Manual chat detected for ${jid}. Silencing auto-replies for 5m.`);
                }
                continue;
            }

            // Check if silence is active for this sender
            const lastManual = lastManualChat.get(msg.key.remoteJid!);
            const isSilenceActive = lastManual ? (Date.now() - lastManual < SILENCE_DURATION) : false;

            console.log(`[BOT] New message received from ${msg.key.remoteJid}${isSilenceActive ? ' (SILENCE ACTIVE)' : ''}`);

            try {
                await handleIncomingMessage(socket, { messages: [msg], type: m.type }, isSilenceActive);
            } catch (error: any) {
                console.error('[BOT ERROR] Error handling message:', error.message || error);
            }
        }
    });

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            latestQR = qr;
            console.log('\nQR Code updated! Scan via browser: http://localhost:' + PORT + '/qr');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.error('Connection closed due to:', lastDisconnect?.error);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Device logged out. Clearing session and restarting...');
                await clearSession();
                connectToWhatsApp();
            } else if (shouldReconnect) {
                console.log('Reconnecting...');
                // Do NOT clear latestQR here, so user can still see it if it was just a blip?
                // Actually, if we are reconnecting, the old QR might be invalid if the conn closed.
                // But usually connection close doesn't invalidate QR immediately unless timed out.
                // Safest to leave it or clear it if we want to force wait.
                // If we clear it, the user sees "Connected" which is wrong.
                // Let's NOT clear it here.
                setTimeout(connectToWhatsApp, 3000);
            }
        }
        else if (connection === 'open') {
            latestQR = null;
            console.log('WhatsApp connection opened!');
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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

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
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
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
                    h1 { margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; }
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
                </style>
            </head>
            <body>
                <div class="container">
                    ${content}
                </div>
                <script>
                    async function logout() {
                        if(confirm("Yakin ingin mereset koneksi? Ini akan melogout bot.")) {
                            const btn = document.querySelector('button');
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
    console.log(`WhatsApp Server running on http://localhost:${PORT}`);
});
