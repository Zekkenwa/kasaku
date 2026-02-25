import { WASocket } from '@whiskeysockets/baileys';
import { prisma } from '../lib/prisma';
import { generateBlindIndex } from '../lib/encryption';
import { parseTransactionText } from '../lib/ai';
import { processGamificationTick } from '../lib/gamification';
import Fuse from 'fuse.js';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
};

// Helper: Parse amount string (e.g. "10k", "1.5jt", "500", "seratus ribu") to number
const parseAmount = (input: string): number | null => {
    if (!input) return null;
    let str = input.toLowerCase().trim();

    // 1. Natural Language (Indonesian) - Check if it contains words first
    const numberWords: Record<string, number> = {
        'satu': 1, 'se': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
        'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
        'sebelas': 11, 'seratus': 100, 'seribu': 1000,
        'setengah': 0.5, 'nol': 0
    };
    const magnitudes: Record<string, number> = {
        'belas': 10, 'puluh': 10, 'ratus': 100, 'ribu': 1000,
        'juta': 1000000, 'miliar': 1000000000, 'triliun': 1000000000000
    };

    const words = str.split(/[\s-]+/);
    const hasWord = words.some(w => numberWords[w] !== undefined || magnitudes[w] !== undefined);

    if (hasWord) {
        let total = 0;
        let current = 0;
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            const val = numberWords[w];
            if (val !== undefined) {
                if (w === 'se' && words[i + 1] && magnitudes[words[i + 1]]) {
                    current += 1;
                } else {
                    current += val;
                }
            } else if (magnitudes[w]) {
                if (current === 0 && (w === 'ribu' || w === 'juta' || w === 'miliar')) current = 1;

                if (w === 'belas') {
                    current += 10;
                } else if (w === 'puluh' || w === 'ratus') {
                    current = (current === 0 ? 1 : current) * magnitudes[w];
                } else {
                    total += (current === 0 ? 1 : current) * magnitudes[w];
                    current = 0;
                }
            }
        }
        return total + current;
    }

    // 2. Numeric with Suffixes (improved regex)
    // Clean currency and dots
    str = str.replace(/rp\.?|idr/g, '').replace(/\./g, '').replace(/,/g, '.').trim();

    // Match number and optional suffix: 250k, 250 k, 3rb, 3 rb, 1jt
    const regex = /^([\d.]+)\s*(k|rb|ribu|jt|juta|m|miliar)?$/i;
    const match = str.match(regex);

    if (match) {
        const num = parseFloat(match[1]);
        const suffix = match[2]?.toLowerCase();
        let multiplier = 1;

        if (suffix === 'k' || suffix === 'rb' || suffix === 'ribu') {
            multiplier = 1000;
        } else if (suffix === 'jt' || suffix === 'juta') {
            multiplier = 1000000;
        } else if (suffix === 'm' || suffix === 'miliar') {
            multiplier = 1000000000;
        }

        return isNaN(num) ? null : num * multiplier;
    }

    return null;
};

// Start logic
export async function handleIncomingMessage(sock: WASocket, msg: any, isSilenceActive: boolean = false) {
    if (!msg.messages || msg.messages.length === 0) return;

    const message = msg.messages[0];
    if (!message.message || message.key.fromMe) return;

    const remoteJid = message.key.remoteJid!;
    const text = message.message.conversation || message.message.extendedTextMessage?.text || "";

    if (!text) return;

    console.log(`Received message from ${remoteJid}: ${text}`);

    let phone = remoteJid.split('@')[0];

    // LID Resolution: If sender is @lid, try to use remoteJidAlt (which contains the real PN)
    if (remoteJid.endsWith('@lid') && message.key.remoteJidAlt) {
        const altPhone = message.key.remoteJidAlt.split('@')[0];
        console.log(`[BOT] LID ${phone} resolved using remoteJidAlt to: ${altPhone}`);
        phone = altPhone;
    }

    const phoneHash = generateBlindIndex(phone);

    let user = await prisma.user.findUnique({
        where: { phoneHash: phoneHash }
    });

    // Fallback: Self-healing for bot (if not found by hash, try plain phone)
    if (!user) {
        console.log(`[BOT] User not found by hash, trying plain phone fallback for: ${phone}`);
        // Since 'phone' is encrypted, we need to encrypt for search
        const { encrypt } = require('../lib/encryption');
        const encryptedPhone = encrypt(phone);

        user = await prisma.user.findFirst({
            where: { phone: encryptedPhone }
        });

        if (user) {
            console.log(`[BOT] Found user by plain phone. Healing phoneHash...`);
            user = await prisma.user.update({
                where: { id: user.id },
                data: { phoneHash: phoneHash }
            });
        }
    }

    // 2. Auth Check
    if (!user) {
        // If silence active or not a command, we might want to be quiet for LIDs too?
        // But for unrecognized numbers, we usually want to show the "not registered" message ONCE.
        // However, if the user requested specifically to fix the LID issue, 
        // they said: "whatsapp malah merespon begini: 👋 Halo! Nomor WhatsApp ini (*125099596353624*) belum terdaftar..."
        // This is exactly what happens when user is not found.

        // If it's a manual chat silence, we should definitely skip this.
        if (isSilenceActive) return;

        await sock.sendMessage(remoteJid, {
            text: `👋 Hallo! Nomor WhatsApp ini (*${phone}*) belum terdaftar di sistem kami.\n\nMohon pastikan nomor ini sudah sesuai dengan yang Anda masukkan di menu *Pengaturan Akun* di dashboard Kasaku.\n\n🌐 Dashboard: https://kasaku.vercel.app`
        });
        return;
    }

    // 3. Process Line by Line (Support multi-line)
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0);
    let reply = "";

    if (lines.length === 1 && (lines[0].toLowerCase() === 'help' || lines[0].toLowerCase() === 'bantuan')) {
        await sendHelp(sock, remoteJid, user.name || "Kak", false);
        return;
    }

    if (lines.length === 1 && (lines[0].toLowerCase().includes('help lengkap') || lines[0].toLowerCase().includes('full help'))) {
        await sendHelp(sock, remoteJid, user.name || "Kak", true);
        return;
    }

    // If greetings
    const greetings = ['hi', 'halo', 'hallo', 'hello', 'pagi', 'siang', 'sore', 'malam', 'tes', 'ping'];
    if (lines.length === 1 && greetings.includes(lines[0].toLowerCase())) {
        if (isSilenceActive) return; // Skip greeting if silence active
        await sock.sendMessage(remoteJid, { text: `Hallo ${user.name}! 👋\nSaya siap membantu mencatat keuanganmu.\n\nKetik *help* untuk melihat cara penggunaan.` });
        return;
    }

    // Process commands
    const results: any[] = [];
    for (const line of lines) {
        const result = await processCommand(user, line);
        if (result) results.push(result);
    }

    if (results.length > 0) {
        let finalReply = "";

        if (results.length === 1 && typeof results[0] === 'object') {
            const res = results[0] as any;
            const timeStr = res.date.toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'Asia/Jakarta'
            });

            finalReply = `📝 *${res.title}*\n` +
                `---------------------------\n` +
                (res.amount !== undefined ? `💰 *Jumlah*: ${formatCurrency(res.amount)}\n` : '') +
                (res.category ? `🏷️ *Kategori*: ${res.category}\n` : '') +
                `📄 *Keterangan*:\n${res.note}\n` +
                `📅 *Waktu*: ${timeStr}\n\n`;
        } else {
            finalReply = `✅ ${results.length > 1 ? 'Beberapa transaksi berhasil diproses:' : 'Berhasil!'}\n\n` +
                results.map(r => typeof r === 'string' ? r : `• ${r.title}: ${formatCurrency(r.amount)} (${r.category})`).join('\n') + `\n\n`;
        }

        // --- GAMIFICATION TICK ---
        try {
            const gamification = await processGamificationTick(user.id);
            if (gamification) {
                if (gamification.newStreak > 1) {
                    finalReply += `🔥 *Streak Hari ke-${gamification.newStreak}!*\n`;
                }
                if (gamification.unlockedMessages && gamification.unlockedMessages.length > 0) {
                    finalReply += `\n` + gamification.unlockedMessages.join('\n') + `\n`;
                }
            }
        } catch (e) {
            console.error("[BOT] Gamification Error:", e);
        }

        finalReply += `_Terima kasih sudah menggunakan Kasaku!_`;

        await sock.sendMessage(remoteJid, { text: finalReply });
    } else {
        // If NO command recognized in single line, send hint
        if (lines.length === 1) {
            if (isSilenceActive) return; // SKIP HINT IF SILENCE ACTIVE
            await sock.sendMessage(remoteJid, { text: "Maaf, saya tidak mengerti maksud Anda. Ketik *help* untuk bantuan." });
        }
    }
}

async function sendHelp(sock: WASocket, jid: string, name: string, full: boolean) {
    let text = `🤖 *KASAKU BOT HELP*\n\nHallo ${name}! 👋\nSaya siap membantu mencatat keuanganmu.\n\n`;

    if (!full) {
        text += `📝 *Perintah Cepat:*\n`;
        text += `• *Catat Pengeluaran:*\n`;
        text += `  \`keluar 15k bakso @makan\`\n`;
        text += `• *Catat Pemasukan:*\n`;
        text += `  \`masuk 5jt gaji @kerja\`\n`;
        text += `• *Cek Saldo:*\n`;
        text += `  \`cek saldo\`\n\n`;
        text += `ℹ️ Ketik *help lengkap* untuk fitur hutang, budget, goal, dll.`;
    } else {
        text += `📋 *DAFTAR PERINTAH LENGKAP*\n\n`;

        text += `1️⃣ *TRANSAKSI*\n`;
        text += `• \`keluar [jml] [ket] @[kategori]\`\n`;
        text += `• \`masuk [jml] [ket] @[kategori]\`\n`;
        text += `   _Cth: keluar 20rb kopi @jajan_\n\n`;

        text += `2️⃣ *HUTANG / PIUTANG*\n`;
        text += `• \`hutang [jml] @[nama] [ket]\` (Kita hutang)\n`;
        text += `• \`piutang [jml] @[nama] [ket]\` (Org hutang)\n`;
        text += `• \`bayar [jml] @[nama]\`\n`;
        text += `• \`lunas @[nama]\`\n`;
        text += `• \`cek hutang\`\n\n`;

        text += `3️⃣ *GOALS (CELENGAN)*\n`;
        text += `• \`goal [nama] [target]\`\n`;
        text += `• \`isi goal [jml] @[nama]\`\n`;
        text += `• \`cek goal\`\n\n`;

        text += `4️⃣ *BUDGET & LAPORAN*\n`;
        text += `• \`budget [jml] @[kategori]\`\n`;
        text += `• \`cek budget\`\n`;
        text += `• \`laporan [hari/minggu/bulan]\`\n`;
        text += `   _Cth: laporan bulan_\n\n`;

        text += `5️⃣ *LAINNYA*\n`;
        text += `• \`cek wallet\` (Lihat saldo per dompet)\n`;
        text += `• \`transfer [jml] dari @[A] ke @[B]\`\n`;
        text += `• \`undo\` (Batalkan aksi terakhir)\n\n`;

        text += `💡 *Tips:* Gunakan singkatan *k* (ribu) dan *jt* (juta). Cth: *50k*, *1.5jt*`;
    }

    await sock.sendMessage(jid, { text });
}

// --- UNIVERSAL UNDO HELPERS ---

async function saveActionHistory(userId: string, action: string, payloadObj: any) {
    await prisma.botActionHistory.create({
        data: {
            userId,
            action,
            payload: JSON.stringify(payloadObj),
            createdAt: new Date()
        }
    });
}

async function executeUndo(userId: string): Promise<string> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get the most recent action history for this user
    const lastAction = await prisma.botActionHistory.findFirst({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' }
    });

    if (!lastAction) return "❌ Tidak ada aksi terbaru yang bisa di-undo (maks 7 hari).";

    try {
        const payload = JSON.parse(lastAction.payload);

        switch (lastAction.action) {
            case 'CREATE_TRANSACTIONS':
                if (payload.transactionIds && payload.transactionIds.length > 0) {
                    await prisma.transaction.deleteMany({ where: { id: { in: payload.transactionIds } } });
                }
                break;
            case 'CREATE_DEBT':
                if (payload.loanId) await prisma.loan.delete({ where: { id: payload.loanId } });
                break;
            case 'PAY_DEBT':
                if (payload.loanId && payload.oldStatus) {
                    // Revert loan status to ONGOING
                    await prisma.loan.update({ where: { id: payload.loanId }, data: { status: payload.oldStatus } });
                }
                break;
            case 'CREATE_GOAL':
                if (payload.goalId) await prisma.goal.delete({ where: { id: payload.goalId } });
                break;
            case 'FUND_GOAL':
                if (payload.goalId && payload.amount) {
                    // Reduce current amount
                    await prisma.goal.update({
                        where: { id: payload.goalId },
                        data: { currentAmount: { decrement: payload.amount } }
                    });
                }
                break;
            case 'CREATE_RECURRING':
                if (payload.recurringId) await prisma.recurringTransaction.delete({ where: { id: payload.recurringId } });
                break;
            case 'SET_BUDGET':
                if (payload.budgetId) {
                    if (payload.isNew) {
                        await prisma.budget.delete({ where: { id: payload.budgetId } });
                    } else if (payload.oldAmount !== undefined) {
                        await prisma.budget.update({ where: { id: payload.budgetId }, data: { limitAmount: payload.oldAmount } });
                    }
                }
                break;
            case 'CREATE_CATEGORY':
                if (payload.categoryId) {
                    await prisma.category.delete({ where: { id: payload.categoryId } });
                }
                break;
            case 'DELETE_CATEGORY':
                if (payload.categoryData) {
                    await prisma.category.create({ data: payload.categoryData });
                }
                break;
            case 'TRANSFER':
                if (payload.incomeTxId && payload.expenseTxId) {
                    await prisma.transaction.deleteMany({ where: { id: { in: [payload.incomeTxId, payload.expenseTxId] } } });
                }
                break;
            default:
                return `❌ Tipe undo '${lastAction.action}' tidak didukung.`;
        }

        // Delete the history record so user can undo multiple times sequentially
        await prisma.botActionHistory.delete({ where: { id: lastAction.id } });
        return `✅ Aksi (${lastAction.action}) berhasil dibatalkan.`;

    } catch (error) {
        console.error("Undo Error:", error);
        return "❌ Terjadi kesalahan saat mencoba membatalkan aksi.";
    }
}

async function processCommand(user: any, text: string): Promise<string | any | null> {
    const lower = text.toLowerCase().trim();
    const parts = lower.split(/\s+/);
    const cmd = parts[0];

    // --- CATEGORY DELETION ---
    if (cmd === 'hapus' && parts[1] === 'kategori') {
        const namePart = parts.filter((p, i) => i > 1 && !p.startsWith('@')).join(' ');
        const typePart = parts.find(p => p === '@masuk' || p === '@keluar' || p === '@in' || p === '@out');

        if (!namePart) return "❌ Gagal: Nama kategori belum diisi.";

        let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';
        if (typePart && (typePart === '@masuk' || typePart === '@in')) type = 'INCOME';

        // Check exist
        const category = await prisma.category.findFirst({
            where: {
                userId: user.id,
                name: { equals: namePart, mode: 'insensitive' },
                type: type
            }
        });

        if (!category) return `❌ Gagal: Kategori '${namePart}' tidak ditemukan.`;

        // Check usage in Transactions
        const usageCount = await prisma.transaction.count({ where: { categoryId: category.id } });
        if (usageCount > 0) return `⚠️ Gagal: Kategori ini dipakai di ${usageCount} transaksi. Hapus transaksi dulu.`;

        // Check usage in Recurring Transactions
        const recurringCount = await prisma.recurringTransaction.count({ where: { categoryId: category.id } });
        if (recurringCount > 0) return `⚠️ Gagal: Kategori ini dipakai di ${recurringCount} rutinitas aktif. Hapus rutinitas dulu.`;

        await prisma.category.delete({ where: { id: category.id } });

        await saveActionHistory(user.id, 'DELETE_CATEGORY', { categoryData: category });

        return `✅ Kategori '${category.name}' (${type}) berhasil dihapus.`;
    }

    // --- TRANSACTION (keluar/masuk) ---
    if (['keluar', 'out', 'expense', 'masuk', 'in', 'income'].includes(cmd)) {
        const type = ['masuk', 'in', 'income'].includes(cmd) ? 'INCOME' : 'EXPENSE';

        // Find amount (first string that looks like number)
        let amount = 0;
        let amountStartIndex = -1;
        let amountEndIndex = -1;

        for (let i = 1; i < parts.length; i++) {
            for (let j = parts.length; j > i; j--) {
                const sub = parts.slice(i, j).join(' ');
                const val = parseAmount(sub);
                if (val !== null && val > 0) {
                    amount = val;
                    amountStartIndex = i;
                    amountEndIndex = j;
                    break;
                }
            }
            if (amount > 0) break;
        }

        if (amount === 0) return "❌ Gagal: Jumlah tidak ditemukan (cth: 15k, seratus ribu)";

        const categoryIdx = parts.findIndex(p => p.startsWith('@'));

        let descParts = [];
        for (let i = 1; i < parts.length; i++) {
            if (i >= amountStartIndex && i < amountEndIndex) continue;
            if (categoryIdx !== -1 && i === categoryIdx) continue;
            descParts.push(parts[i]);
        }

        let categoryName = "Umum";
        const categoryPart = parts.find(p => p.startsWith('@'));
        if (categoryPart) {
            categoryName = categoryPart.substring(1).replace(/_/g, ' ');
        }

        const description = descParts.join(' ').replace(/\b\w/g, l => l.toUpperCase());

        const txResult = await executeTransaction(user, type, amount, categoryName, description, new Date());
        if (typeof txResult === 'object' && txResult.transactionId) {
            await saveActionHistory(user.id, 'CREATE_TRANSACTIONS', { transactionIds: [txResult.transactionId] });
        }
        return txResult;
    }

    // --- DEBT (hutang/piutang) ---
    if (['hutang', 'debt', 'piutang', 'loan'].includes(cmd)) {
        const type = ['piutang', 'loan'].includes(cmd) ? 'RECEIVABLE' : 'PAYABLE'; // Piutang = Orang hutang ke kita (Receivable)
        // Hutang = Kita hutang ke orang (Payable)

        const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Gagal: Jumlah tidak ditemukan";
        const amount = parseAmount(parts[amountIdx])!;

        const personPart = parts.find(p => p.startsWith('@'));
        if (!personPart) return "❌ Gagal: Nama orang wajib pakai @ (cth: @Budi)";
        const personName = personPart.substring(1).replace(/_/g, ' ');

        const descParts = parts.filter((p, i) => i !== 0 && i !== amountIdx && !p.startsWith('@'));
        const note = descParts.join(' ');

        const loan = await prisma.loan.create({
            data: {
                userId: user.id,
                name: personName,
                amount: amount,
                type: type,
                status: 'ONGOING',
                createdAt: new Date()
            }
        });

        await saveActionHistory(user.id, 'CREATE_DEBT', { loanId: loan.id });

        return {
            title: `Pencatatan ${type === 'PAYABLE' ? 'Hutang' : 'Piutang'}`,
            amount: amount,
            category: type === 'PAYABLE' ? 'Hutang (Kita Pinjam)' : 'Piutang (Kita Pinjamkan)',
            note: `Ke/Dari ${personName} ${note ? `- ${note}` : ''}`,
            date: new Date()
        };
    }

    // --- LUNAS (Mark as paid) ---
    if (cmd === 'lunas') {
        const personPart = parts.find(p => p.startsWith('@'));
        if (!personPart) return "❌ Gagal: Nama orang wajib pakai @ (cth: @Budi)";
        const personName = personPart.substring(1).replace(/_/g, ' ');

        // Find active loan
        const loan = await prisma.loan.findFirst({
            where: {
                userId: user.id,
                name: { equals: personName, mode: 'insensitive' },
                status: 'ONGOING'
            }
        });

        if (!loan) return `❌ Tidak ada hutang/piutang aktif dengan ${personName}.`;

        await prisma.loan.update({
            where: { id: loan.id },
            data: { status: 'PAID' }
        });

        await saveActionHistory(user.id, 'PAY_DEBT', { loanId: loan.id, oldStatus: loan.status });

        return {
            title: 'Hutang/Piutang Lunas',
            amount: loan.amount,
            category: 'Hutang/Piutang',
            note: `Lunas dengan ${personName}`,
            date: new Date()
        };
    }

    if (cmd === 'cek' && parts[1] === 'hutang') {
        const loans = await prisma.loan.findMany({
            where: { userId: user.id, status: 'ONGOING' }
        });
        if (loans.length === 0) return "✅ Tidak ada hutang/piutang aktif.";
        return "📋 *Daftar Hutang & Piutang:*\n" + loans.map((l: any) => `- ${l.type === 'PAYABLE' ? '🔴 Hutang' : '🟢 Piutang'} ${l.name}: ${formatCurrency(l.amount)}`).join('\n');
    }

    // --- QUERY (cek saldo) ---
    if (cmd === 'cek' && parts[1] === 'saldo') {
        const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
        const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });

        let initial = wallets.reduce((acc: number, w: any) => acc + w.initialBalance, 0);
        let income = transactions.filter((t: any) => t.type === 'INCOME').reduce((acc: number, t: any) => acc + t.amount, 0);
        let expense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + t.amount, 0);

        return {
            title: 'Info Saldo',
            amount: initial + income - expense,
            category: 'Total Saldo',
            note: 'Ringkasan saldo semua wallet',
            date: new Date()
        };
    }

    // --- UNDO (Universal Multi-step) ---
    if (cmd === 'undo' || cmd === 'batal') {
        return await executeUndo(user.id);
    }

    // --- LOAN PAYMENT (Cicil) ---
    if (cmd === 'bayar') {
        const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Gagal: Jumlah pembayaran tidak ditemukan.";
        const amount = parseAmount(parts[amountIdx])!;

        const personPart = parts.find(p => p.startsWith('@'));
        if (!personPart) return "❌ Gagal: Nama wajib pakai @ (cth: @Budi)";
        const personName = personPart.substring(1).replace(/_/g, ' ');

        const loan = await prisma.loan.findFirst({
            where: { userId: user.id, name: { equals: personName, mode: 'insensitive' }, status: 'ONGOING' }
        });

        if (!loan) return `❌ Tidak ada hutang aktif dengan ${personName}.`;

        // Update amount (decrease debt amount? or keep original and track processed? 
        // Schema has 'amount'. Usually means remaining or total. 
        // PaymentHistory table exists. Let's use it.
        // And we should decrease loan amount? Or does loan amount represent Initial Principal?
        // If create loan = 100k. Pay 50k. If we decrease amount to 50k, we lose history of original.
        // But for simple "Hutang" tracking, usually 'amount' = 'how much is owed'.
        // Let's assume 'amount' is remaining balance. 

        if (amount > loan.amount) return `⚠️ Pembayaran (${formatCurrency(amount)}) melebihi sisa hutang (${formatCurrency(loan.amount)}).`;

        const newAmount = loan.amount - amount;
        await prisma.loan.update({
            where: { id: loan.id },
            data: {
                amount: newAmount,
                status: newAmount === 0 ? 'PAID' : 'ONGOING'
            }
        });

        await prisma.paymentHistory.create({
            data: {
                loanId: loan.id,
                amount: amount,
                note: 'Pembayaran via WA'
            }
        });

        return {
            title: 'Cicilan Hutang/Piutang',
            amount: amount,
            category: 'Pembayaran',
            note: `Diterima dari/untuk ${personName}. Sisa: ${formatCurrency(newAmount)}`,
            date: new Date()
        };
    }


    // --- BUDGET ---
    if (cmd === 'budget') {
        const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Gagal: Jumlah budget tidak ditemukan";
        const amount = parseAmount(parts[amountIdx])!;

        const categoryPart = parts.find(p => p.startsWith('@'));
        if (!categoryPart) return "❌ Gagal: Kategori wajib pakai @ (cth: @Makan)";
        const categoryName = categoryPart.substring(1).replace(/_/g, ' ');

        // Find Category
        const category = await prisma.category.findFirst({
            where: { userId: user.id, name: { equals: categoryName, mode: 'insensitive' } }
        });
        if (!category) return `❌ Gagal: Kategori '${categoryName}' tidak ditemukan.`;

        // Upsert Budget
        // Prisma doesn't support upsert on composite unique key directly easily without where clause matching exact unique constraint name or fields.
        // But we have @@unique([userId, categoryId])
        const existingBudget = await prisma.budget.findFirst({
            where: { userId: user.id, categoryId: category.id }
        });

        let budgetId;
        if (existingBudget) {
            budgetId = existingBudget.id;
            await prisma.budget.update({
                where: { id: existingBudget.id },
                data: { limitAmount: amount }
            });
            await saveActionHistory(user.id, 'SET_BUDGET', { budgetId: existingBudget.id, isNew: false, oldAmount: existingBudget.limitAmount });
        } else {
            const newBudget = await prisma.budget.create({
                data: {
                    userId: user.id,
                    categoryId: category.id,
                    limitAmount: amount,
                    period: 'MONTHLY'
                }
            });
            budgetId = newBudget.id;
            await saveActionHistory(user.id, 'SET_BUDGET', { budgetId: newBudget.id, isNew: true });
        }

        return {
            title: 'Budget Diatur',
            amount: amount,
            category: category.name,
            note: `Batas pengeluaran bulanan diatur`,
            date: new Date()
        };
    }

    if (cmd === 'cek' && parts[1] === 'budget') {
        const budgets = await prisma.budget.findMany({
            where: { userId: user.id },
            include: { category: true }
        });

        if (budgets.length === 0) return "⚠️ Belum ada budget yang diatur.";

        // Calculate usage for this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: user.id,
                type: 'EXPENSE',
                createdAt: { gte: startOfMonth, lte: endOfMonth }
            }
        });

        let msg = "";
        for (const b of budgets) {
            const spent = transactions
                .filter((t: any) => t.categoryId === b.categoryId)
                .reduce((acc: number, t: any) => acc + t.amount, 0);

            const pct = Math.round((spent / b.limitAmount) * 100);
            const statusIcon = pct >= 100 ? "🔴" : pct >= 80 ? "⚠️" : "🟢";

            msg += `${statusIcon} ${b.category.name}: ${Math.min(pct, 100)}% (${formatCurrency(spent)} / ${formatCurrency(b.limitAmount)})\n`;
        }

        return {
            title: 'Status Budget',
            category: 'Budget Bulanan',
            note: msg.trim(),
            date: new Date()
        };
    }

    // --- LAPORAN ---
    if (cmd === 'laporan' || cmd === 'report') {
        const period = parts[1] || 'hari'; // default hari
        const now = new Date();
        let start, end;

        if (period === 'hari' || period === 'today') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (period === 'minggu' || period === 'week') {
            const day = now.getDay() || 7; // Get current day number, make Sunday 7
            if (day !== 1) now.setHours(-24 * (day - 1)); // Go back to Monday
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59);
        } else if (period === 'bulan' || period === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        } else {
            return "❌ Periode tidak valid. Gunakan: hari, minggu, bulan.";
        }

        const txs = await prisma.transaction.findMany({
            where: {
                userId: user.id,
                createdAt: { gte: start, lte: end }
            }
        });

        const income = txs.filter((t: any) => t.type === 'INCOME').reduce((acc: number, t: any) => acc + t.amount, 0);
        const expense = txs.filter((t: any) => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + t.amount, 0);

        return {
            title: `Laporan ${period.charAt(0).toUpperCase() + period.slice(1)}`,
            amount: income - expense,
            category: 'Financial Report',
            note: `📈 Masuk: ${formatCurrency(income)}\n📉 Keluar: ${formatCurrency(expense)}`,
            date: new Date()
        };
    }

    // --- GOALS ---
    if (cmd === 'goal') {
        // goal [nama] [target]
        const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Target tidak ditemukan (cth: 1jt).";
        const target = parseAmount(parts[amountIdx])!;

        const nameParts = parts.filter((p, i) => i > 0 && i !== amountIdx && !p.startsWith('@'));
        const name = nameParts.join(' ').replace(/\b\w/g, l => l.toUpperCase());

        if (!name) return "❌ Nama goal belum diisi.";

        const newGoal = await prisma.goal.create({
            data: {
                userId: user.id,
                name: name,
                targetAmount: target,
                currentAmount: 0
            }
        });

        await saveActionHistory(user.id, 'CREATE_GOAL', { goalId: newGoal.id });

        return {
            title: 'Goal Baru Dibuat',
            amount: target,
            category: 'Tabungan',
            note: `Target baru: ${name}`,
            date: new Date()
        };
    }

    if (cmd === 'isi' && parts[1] === 'goal') {
        // isi goal [jml] @[nama]
        const amountIdx = parts.findIndex((p, i) => i > 1 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Jumlah tidak ditemukan.";
        const amount = parseAmount(parts[amountIdx])!;

        const goalPart = parts.find(p => p.startsWith('@'));
        if (!goalPart) return "❌ Nama goal harus pakai @.";
        const goalName = goalPart.substring(1).replace(/_/g, ' ');

        const goal = await prisma.goal.findFirst({ where: { userId: user.id, name: { equals: goalName, mode: 'insensitive' } } });
        if (!goal) return `❌ Goal '${goalName}' tidak ditemukan.`;

        await prisma.goal.update({
            where: { id: goal.id },
            data: { currentAmount: { increment: amount } }
        });

        await saveActionHistory(user.id, 'FUND_GOAL', { goalId: goal.id, amount: amount });

        return {
            title: 'Tabungan Goal',
            amount: amount,
            category: 'Tabungan',
            note: `Berhasil nabung ke '${goal.name}'. Terkumpul: ${formatCurrency(goal.currentAmount + amount)} (${Math.round((goal.currentAmount + amount) / goal.targetAmount * 100)}%)`,
            date: new Date()
        };
    }

    if (cmd === 'cek' && parts[1] === 'goal') {
        const goals = await prisma.goal.findMany({ where: { userId: user.id } });
        if (goals.length === 0) return "⚠️ Belum ada goal.";

        let msg = "";
        for (const g of goals) {
            const pct = Math.round(g.currentAmount / g.targetAmount * 100);
            msg += `• ${g.name}: ${formatCurrency(g.currentAmount)} / ${formatCurrency(g.targetAmount)} (${pct}%)\n`;
        }

        return {
            title: 'Daftar Goal',
            category: 'Tabungan',
            note: msg.trim(),
            date: new Date()
        };
    }

    // --- WALLETS ---
    if (cmd === 'cek' && parts[1] === 'wallet') {
        const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });
        if (wallets.length === 0) return "⚠️ Belum ada wallet.";

        // Calculate real balances (Initial + Income - Expense) per wallet
        // This is expensive if we do it every time. Checking if backend maintains balance...
        // Schema has 'initialBalance'. Transactions have 'walletId'.

        let msg = "💳 *Saldo Wallet:*\n";
        for (const w of wallets) {
            const txs = await prisma.transaction.findMany({ where: { walletId: w.id } });
            const income = txs.filter((t: any) => t.type === 'INCOME').reduce((acc: any, t: any) => acc + t.amount, 0);
            const expense = txs.filter((t: any) => t.type === 'EXPENSE').reduce((acc: any, t: any) => acc + t.amount, 0);
            const balance = w.initialBalance + income - expense;
            msg += `- ${w.name}: ${formatCurrency(balance)}\n`;
        }
        return msg;
    }

    if (cmd === 'transfer') {
        // transfer [jml] dari @[A] ke @[B]
        const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Jumlah tidak ditemukan.";
        const amount = parseAmount(parts[amountIdx])!;

        const fromPart = parts.find((p, i) => p.startsWith('@') && parts[i - 1] === 'dari');
        const toPart = parts.find((p, i) => p.startsWith('@') && parts[i - 1] === 'ke');

        if (!fromPart || !toPart) return "❌ Format salah. Gunakan: transfer [jml] dari @[A] ke @[B]";

        const fromName = fromPart.substring(1).replace(/_/g, ' ');
        const toName = toPart.substring(1).replace(/_/g, ' ');
        const noteParts = parts.filter((p, i) => i > amountIdx && !p.startsWith('@') && p !== 'dari' && p !== 'ke');
        const note = noteParts.join(' ');

        const w1 = await prisma.wallet.findFirst({ where: { userId: user.id, name: { equals: fromName, mode: 'insensitive' } } });
        const w2 = await prisma.wallet.findFirst({ where: { userId: user.id, name: { equals: toName, mode: 'insensitive' } } });

        if (!w1 || !w2) return "❌ Salah satu wallet tidak ditemukan.";

        // Check Balance of Source Wallet
        const incomeAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { walletId: w1.id, type: 'INCOME' }
        });
        const expenseAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { walletId: w1.id, type: 'EXPENSE' }
        });

        const currentBalance = w1.initialBalance + (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0);

        if (currentBalance < amount) {
            return `❌ Gagal: Saldo ${w1.name} tidak cukup.\nSaldo: ${formatCurrency(currentBalance)}\nTransfer: ${formatCurrency(amount)}`;
        }

        // Execute Transfer (Expense from W1, Income to W2)
        const baseNote = note ? `- ${note}` : '';
        const txExpense = await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: amount,
                type: 'EXPENSE',
                walletId: w1.id,
                note: `Transfer ke ${w2.name} ${baseNote}`.trim()
            }
        });
        const txIncome = await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: amount,
                type: 'INCOME',
                walletId: w2.id,
                note: `Transfer dari ${w1.name} ${baseNote}`.trim()
            }
        });

        await saveActionHistory(user.id, 'TRANSFER', { incomeTxId: txIncome.id, expenseTxId: txExpense.id });

        return {
            title: 'Transfer Saldo',
            amount: amount,
            category: 'Transfer',
            note: `Dari ${w1.name} ke ${w2.name}`,
            date: new Date()
        };
    }

    // --- RECURRING (Rutinitas) ---
    if (cmd === 'rutin') {
        // rutin [nama] [jml] [masuk/keluar] [harian/mingguan/bulanan]
        // Example: rutin Netflix 180k keluar bulanan

        const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
        if (amountIdx === -1) return "❌ Jumlah tidak ditemukan.";
        const amount = parseAmount(parts[amountIdx])!;

        const typeStr = parts.find(p => ['masuk', 'in', 'keluar', 'out'].includes(p));
        if (!typeStr) return "❌ Tipe (masuk/keluar) tidak ditemukan.";
        const type = ['masuk', 'in'].includes(typeStr) ? 'INCOME' : 'EXPENSE';

        const intervalStr = parts.find(p => ['harian', 'mingguan', 'bulanan'].includes(p));
        if (!intervalStr) return "❌ Interval (harian/mingguan/bulanan) tidak ditemukan.";

        let freq = 'MONTHLY';
        if (intervalStr === 'harian') freq = 'DAILY';
        if (intervalStr === 'mingguan') freq = 'WEEKLY';

        const nameParts = parts.filter((p, i) => i > 0 && i !== amountIdx && p !== typeStr && p !== intervalStr);
        const name = nameParts.join(' ');

        // Need category... default to General? Or ask user to use @?
        // Let's force @ for category if we want it. Or default.
        // Schema: RecurringTransaction needs categoryId.
        const defaultCategory = await prisma.category.findFirst({ where: { userId: user.id, type: type } });
        if (!defaultCategory) return "❌ Buat minimal satu kategori di dashboard dulu.";

        const newRecurring = await prisma.recurringTransaction.create({
            data: {
                userId: user.id,
                name: name || 'Rutin',
                amount: amount,
                type: type,
                categoryId: defaultCategory.id,
                frequency: freq as any,
                startDate: new Date(),
                nextRun: new Date() // Logic usually handles next run calculation
            }
        });

        await saveActionHistory(user.id, 'CREATE_RECURRING', { recurringId: newRecurring.id });

        return {
            title: 'Rutinitas Baru',
            amount: amount,
            category: 'Rutin',
            note: `${name || 'Rutin'} (${intervalStr})`,
            date: new Date()
        };
    }

    // --- AI FALLBACK (Natural Language Parsing) ---
    const parsed = await parseTransactionText(text);
    if (parsed && parsed.isValidCommand && parsed.actions && parsed.actions.length > 0) {
        const results = [];

        for (const item of parsed.actions) {
            let txDate = new Date();
            if (item.date) {
                const parsedDate = new Date(item.date);
                if (!isNaN(parsedDate.getTime())) txDate = parsedDate;
            }

            try {
                switch (item.intent) {
                    case 'CREATE_TRANSACTION':
                        if (item.type && item.amount) {
                            let categoryName = item.categoryName || "Umum";
                            const userCategories = await prisma.category.findMany({ where: { userId: user.id, type: item.type } });
                            if (userCategories.length > 0) {
                                const fuse = new Fuse(userCategories, { keys: ['name'], threshold: 0.4 });
                                const searchResult = fuse.search(categoryName);
                                if (searchResult.length > 0) categoryName = searchResult[0].item.name;
                            }
                            const description = item.note || (item.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran');
                            const txResult = await executeTransaction(user, item.type, item.amount, categoryName, description, txDate);
                            if (typeof txResult === 'object') {
                                if (txResult.transactionId) await saveActionHistory(user.id, 'CREATE_TRANSACTIONS', { transactionIds: [txResult.transactionId] });
                                txResult.title = `🤖 AI: ${txResult.title}`;
                                results.push(txResult);
                            } else {
                                results.push(`❌ AI Error: ${txResult}`);
                            }
                        }
                        break;
                    case 'CREATE_CATEGORY':
                        if (item.categoryName && item.type) {
                            const newCat = await prisma.category.create({
                                data: { userId: user.id, name: item.categoryName, type: item.type }
                            });
                            await saveActionHistory(user.id, 'CREATE_CATEGORY', { categoryId: newCat.id });
                            results.push(`🤖 AI: ✅ Kategori '${newCat.name}' berhasil dibuat.`);
                        }
                        break;
                    case 'DELETE_CATEGORY':
                        if (item.categoryName && item.type) {
                            const delCat = await prisma.category.findFirst({ where: { userId: user.id, name: { equals: item.categoryName, mode: 'insensitive' }, type: item.type } });
                            if (delCat) {
                                await prisma.category.delete({ where: { id: delCat.id } });
                                await saveActionHistory(user.id, 'DELETE_CATEGORY', { categoryData: delCat });
                                results.push(`🤖 AI: ✅ Kategori '${delCat.name}' dihapus.`);
                            }
                        }
                        break;
                    case 'CREATE_DEBT':
                        if (item.targetName && item.amount && item.type) {
                            const newLoan = await prisma.loan.create({
                                data: { userId: user.id, name: item.targetName, amount: item.amount, type: item.type === 'EXPENSE' ? 'RECEIVABLE' : 'PAYABLE', status: 'ONGOING', createdAt: txDate }
                            });
                            await saveActionHistory(user.id, 'CREATE_DEBT', { loanId: newLoan.id });
                            results.push(`🤖 AI: ✅ Hutang/Piutang dengan ${item.targetName} dicatat.`);
                        }
                        break;
                    case 'PAY_DEBT':
                        if (item.targetName && item.amount) {
                            const activeLoan = await prisma.loan.findFirst({ where: { userId: user.id, name: { equals: item.targetName, mode: 'insensitive' }, status: 'ONGOING' } });
                            if (activeLoan) {
                                const newAmount = Math.max(0, activeLoan.amount - item.amount);
                                await prisma.loan.update({ where: { id: activeLoan.id }, data: { amount: newAmount, status: newAmount === 0 ? 'PAID' : 'ONGOING' } });
                                await saveActionHistory(user.id, 'PAY_DEBT', { loanId: activeLoan.id, oldStatus: activeLoan.status });
                                results.push(`🤖 AI: ✅ Cicilan Hutang/Piutang ${item.targetName} dicatat.`);
                            }
                        }
                        break;
                    case 'TRANSFER':
                        if (item.fromWallet && item.targetName && item.amount) {
                            const w1 = await prisma.wallet.findFirst({ where: { userId: user.id, name: { equals: item.fromWallet, mode: 'insensitive' } } });
                            const w2 = await prisma.wallet.findFirst({ where: { userId: user.id, name: { equals: item.targetName, mode: 'insensitive' } } });
                            if (w1 && w2) {
                                const txE = await prisma.transaction.create({ data: { userId: user.id, amount: item.amount, type: 'EXPENSE', walletId: w1.id, note: `Transfer ke ${w2.name}` } });
                                const txI = await prisma.transaction.create({ data: { userId: user.id, amount: item.amount, type: 'INCOME', walletId: w2.id, note: `Transfer dari ${w1.name}` } });
                                await saveActionHistory(user.id, 'TRANSFER', { incomeTxId: txI.id, expenseTxId: txE.id });
                                results.push(`🤖 AI: ✅ Transfer ${formatCurrency(item.amount)} dari ${w1.name} ke ${w2.name} berhasil.`);
                            }
                        }
                        break;
                    case 'CREATE_GOAL':
                        if (item.targetName && item.amount) {
                            const ng = await prisma.goal.create({ data: { userId: user.id, name: item.targetName, targetAmount: item.amount, currentAmount: 0 } });
                            await saveActionHistory(user.id, 'CREATE_GOAL', { goalId: ng.id });
                            results.push(`🤖 AI: ✅ Goal Baru '${item.targetName}' dibuat.`);
                        }
                        break;
                    case 'FUND_GOAL':
                        if (item.targetName && item.amount) {
                            const fg = await prisma.goal.findFirst({ where: { userId: user.id, name: { equals: item.targetName, mode: 'insensitive' } } });
                            if (fg) {
                                await prisma.goal.update({ where: { id: fg.id }, data: { currentAmount: { increment: item.amount } } });
                                await saveActionHistory(user.id, 'FUND_GOAL', { goalId: fg.id, amount: item.amount });
                                results.push(`🤖 AI: ✅ Berhasil menabung ${formatCurrency(item.amount)} ke Goal '${item.targetName}'.`);
                            }
                        }
                        break;
                    case 'CREATE_RECURRING':
                        if (item.targetName && item.amount && item.type && item.interval) {
                            const rCat = await prisma.category.findFirst({ where: { userId: user.id, type: item.type } });
                            if (rCat) {
                                const nr = await prisma.recurringTransaction.create({ data: { userId: user.id, name: item.targetName, amount: item.amount, type: item.type, categoryId: rCat.id, frequency: item.interval, startDate: txDate, nextRun: txDate } });
                                await saveActionHistory(user.id, 'CREATE_RECURRING', { recurringId: nr.id });
                                results.push(`🤖 AI: ✅ Rutinitas '${item.targetName}' berhasil dibuat.`);
                            }
                        }
                        break;
                    case 'SET_BUDGET':
                        if (item.categoryName && item.amount) {
                            const bCat = await prisma.category.findFirst({ where: { userId: user.id, name: { equals: item.categoryName, mode: 'insensitive' } } });
                            if (bCat) {
                                const existingB = await prisma.budget.findFirst({ where: { userId: user.id, categoryId: bCat.id } });
                                if (existingB) {
                                    await prisma.budget.update({ where: { id: existingB.id }, data: { limitAmount: item.amount } });
                                    await saveActionHistory(user.id, 'SET_BUDGET', { budgetId: existingB.id, isNew: false, oldAmount: existingB.limitAmount });
                                } else {
                                    const nb = await prisma.budget.create({ data: { userId: user.id, categoryId: bCat.id, limitAmount: item.amount, period: 'MONTHLY' } });
                                    await saveActionHistory(user.id, 'SET_BUDGET', { budgetId: nb.id, isNew: true });
                                }
                                results.push(`🤖 AI: ✅ Budget '${bCat.name}' berhasil diatur ke ${formatCurrency(item.amount)}.`);
                            }
                        }
                        break;
                    default:
                        results.push(`🤖 AI: Intent tidak dikenal (${item.intent})`);
                }
            } catch (e) {
                console.error("AI execution error for intent", item.intent, e);
                results.push(`❌ AI gagal memproses aksi: ${item.intent}`);
            }
        }

        if (results.length === 1 && typeof results[0] === 'object') return results[0];
        if (results.length > 0) return results;
    }

    return null;
}

// Helper function to execute transaction logic internally
async function executeTransaction(user: any, type: 'INCOME' | 'EXPENSE', amount: number, categoryName: string, description: string, date: Date = new Date()) {
    let category = await prisma.category.findFirst({
        where: {
            userId: user.id,
            name: { equals: categoryName, mode: 'insensitive' },
            type: type
        }
    });

    if (!category) {
        try {
            category = await prisma.category.create({
                data: {
                    userId: user.id,
                    name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
                    type: type
                }
            });
        } catch (e) {
            category = await prisma.category.findFirst({ where: { userId: user.id, name: categoryName, type } });
        }
    }

    const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id },
        select: { id: true }
    });

    if (!category) return "❌ Gagal: Kategori tidak ditemukan atau tidak dapat dibuat.";

    const tx = await prisma.transaction.create({
        data: {
            userId: user.id,
            amount: amount,
            type: type,
            categoryId: category.id,
            walletId: wallet?.id,
            note: description,
            createdAt: date
        }
    });

    return {
        transactionId: tx.id,
        title: type === 'INCOME' ? 'Pemasukan Baru' : 'Pengeluaran Baru',
        amount: amount,
        category: category.name,
        note: description,
        date: date
    };
}
