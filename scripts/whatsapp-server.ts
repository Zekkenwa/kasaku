import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as http from 'http';
import * as qrcode from 'qrcode-terminal';
import pino from 'pino';
import { prisma } from '../lib/prisma';
import { usePrismaAuthState } from '../lib/auth-baileys';

import { handleIncomingMessage } from './whatsapp-bot-logic';

// Configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
// const AUTH_FOLDER = 'auth_info_baileys'; // Deprecated in favor of DB

// Global socket variable
let sock: any = undefined;
let latestQR: string | null = null;

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
        try {
            await handleIncomingMessage(socket, m);
        } catch (error) {
            console.error('Error handling message:', error);
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

    if (req.url === '/logout' && req.method === 'POST') {
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

                // Format phone (ensure it ends with @s.whatsapp.net)
                const jid = phone + '@s.whatsapp.net';

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
    } else if (req.url === '/qr' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html', ...headers });
        const resetBtn = `
            <div style="margin-top: 20px;">
                <button onclick="logout()" style="padding: 10px 20px; background: #e11d48; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    Reset Connection / Logout
                </button>
            </div>
            <script>
                async function logout() {
                    if(confirm("Are you sure you want to reset the connection? This will log you out.")) {
                        const res = await fetch('/logout', { method: 'POST' });
                        const data = await res.json();
                        if(data.success) {
                            alert('Session reset. Page will reload in 5 seconds.');
                            setTimeout(() => location.reload(), 5000);
                        } else {
                            alert('Failed: ' + data.error);
                        }
                    }
                }
            </script>
        `;

        if (!latestQR) {
            res.end(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#111;color:#fff">
                <div style="text-align:center">
                    <h1>✅ WhatsApp Bot Connected</h1>
                    <p>No QR code needed — already authenticated!</p>
                    ${resetBtn}
                </div>
            </body></html>`);
        } else {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQR)}`;
            res.end(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#111;color:#fff">
                <div style="text-align:center">
                    <h1>📱 Scan QR Code</h1>
                    <p>Buka WhatsApp → Linked Devices → Link a Device</p>
                    <img src="${qrImageUrl}" alt="QR Code" style="margin:20px auto;border-radius:12px;background:#fff;padding:16px" />
                    <p style="color:#888;font-size:14px">QR code akan refresh otomatis setiap 20 detik</p>
                    ${resetBtn}
                    <script>setTimeout(() => location.reload(), 20000);</script>
                </div>
            </body></html>`);
        }
    } else if (req.url === '/' && req.method === 'GET') {
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
