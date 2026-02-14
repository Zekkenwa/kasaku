import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as http from 'http';
import * as qrcode from 'qrcode-terminal';
import pino from 'pino';
import { prisma } from '../lib/prisma';
import { usePrismaAuthState } from '../lib/auth-baileys';

import { handleIncomingMessage } from './whatsapp-bot-logic';

// Configuration
const PORT = 3001;
// const AUTH_FOLDER = 'auth_info_baileys'; // Deprecated in favor of DB

// Global socket variable
let sock: any = undefined;

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
            console.log('\nScan this QR code with your WhatsApp:');
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    } else {
        res.writeHead(404, headers);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`WhatsApp Server running on http://localhost:${PORT}`);
});
