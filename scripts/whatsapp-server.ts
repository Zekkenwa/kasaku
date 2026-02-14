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
    // const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { state, saveCreds } = await usePrismaAuthState(prisma);

    // Create socket
    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Enable terminal QR for initial setup
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

    socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            latestQR = qr;
            console.log('\nQR Code updated! Scan via browser: http://localhost:' + PORT + '/qr');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.error('Connection closed due to:', lastDisconnect?.error);

            // Force reconnect for most errors during dev
            if (shouldReconnect || (lastDisconnect?.error as Boom)?.message === 'Connection Failure') {
                console.log('Reconnecting...');
                setTimeout(connectToWhatsApp, 3000); // Wait 3s before reconnecting
            } else {
                console.log('Not reconnecting. If this is unexpected, delete "auth_info_baileys" and try again.');
            }
        }
        else if (connection === 'open') {
            latestQR = null; // Clear QR once connected
            console.log('WhatsApp connection opened!');
        }
    });
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
        if (!latestQR) {
            res.end(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#111;color:#fff">
                <div style="text-align:center">
                    <h1>✅ WhatsApp Bot Connected</h1>
                    <p>No QR code needed — already authenticated!</p>
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
