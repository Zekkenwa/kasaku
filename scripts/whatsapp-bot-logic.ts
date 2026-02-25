import { WASocket } from '@whiskeysockets/baileys';
import { prisma } from '../lib/prisma';
import { generateBlindIndex } from '../lib/encryption';
import { parseTransactionText } from '../lib/ai';
import { processGamificationTick } from '../lib/gamification';
import { parseAmount } from '../lib/amount-parser';
import type { BotCommandResult, BotUser, ProcessCommandResult } from '../types/bot';
import Fuse from 'fuse.js';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
};

type IncomingMessagePayload = {
    messages?: Array<{
        message?: {
            conversation?: string | null;
            extendedTextMessage?: { text?: string | null } | null;
        } | null;
        key: {
            fromMe?: boolean | null;
            remoteJid?: string | null;
            remoteJidAlt?: string | null;
        };
    }>;
    type?: string;
};

// Start logic
export async function handleIncomingMessage(sock: WASocket, msg: IncomingMessagePayload, isSilenceActive: boolean = false) {
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

    // phoneHash blind index is the ONLY reliable way to search encrypted phone data.
    // Note: AES-256-GCM uses random IVs, so direct encrypted phone comparison is impossible.
    const user = await prisma.user.findUnique({
        where: { phoneHash: phoneHash }
    });

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
    const results: ProcessCommandResult[] = [];
    for (const line of lines) {
        const result = await processCommand(user, line);
        if (result) results.push(result);
    }

    if (results.length > 0) {
        let finalReply = "";

        if (results.length === 1 && results[0] && typeof results[0] === 'object') {
            const res = results[0] as BotCommandResult;
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
            const allPreFormatted = results.every(r => typeof r === 'string' && /^(✅|❌|💳|⚠️|🤖)/.test(r));

            if (allPreFormatted) {
                finalReply = results.join('\n\n') + `\n\n`;
            } else {
                finalReply = `✅ ${results.length > 1 ? 'Beberapa transaksi berhasil diproses:' : 'Berhasil!'}\n\n` +
                    results.map((r) => {
                        if (typeof r === 'string' || r === null) return r || '';
                        const amountLabel = r.amount !== undefined ? formatCurrency(r.amount) : '-';
                        const categoryLabel = r.category || '-';
                        return `• ${r.title}: ${amountLabel} (${categoryLabel})`;
                    }).join('\n') + `\n\n`;
            }
        }

        const hasTransaction = results.some((r) => r && typeof r === 'object' && r.transactionId);
        if (hasTransaction) {
            finalReply += `💡 _Ketik *undo* jika ada kesalahan._\n\n`;
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
        text += `   _Cth: keluar 20rb kopi @jajan_\n`;
        text += `   _Cth: keluar 20rb kopi @jajan via gopay_\n\n`;

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

async function saveActionHistory(userId: string, action: string, payloadObj: unknown) {
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

        const intentMap: Record<string, string> = {
            'CREATE_TRANSACTIONS': 'Catat Transaksi',
            'CREATE_CATEGORY': 'Buat Kategori',
            'DELETE_CATEGORY': 'Hapus Kategori',
            'CREATE_WALLET': 'Buat Dompet',
            'CREATE_GOAL': 'Buat Tabungan Goal',
            'CREATE_BUDGET': 'Atur Budget',
            'CREATE_RECURRING': 'Catat Rutinitas',
            'CREATE_DEBT': 'Catat Hutang/Piutang',
            'PAY_DEBT': 'Bayar Hutang/Piutang',
            'FUND_GOAL': 'Isi Saldo Goal',
            'SET_BUDGET': 'Atur Limit Budget',
            'TRANSFER': 'Transfer Antar Wallet'
        };
        const readableIntent = intentMap[lastAction.action] || lastAction.action;

        return `✅ Berhasil!\n\nAksi (*${readableIntent}*) berhasil dibatalkan.`;

    } catch (error) {
        console.error("Undo Error:", error);
        return "❌ Terjadi kesalahan saat mencoba membatalkan aksi.";
    }
}

type CommandHandler = (user: BotUser, parts: string[], text: string) => Promise<ProcessCommandResult>;

async function handleCheckHutang(user: BotUser): Promise<ProcessCommandResult> {
    const loans = await prisma.loan.findMany({
        where: { userId: user.id, status: 'ONGOING' }
    });
    if (loans.length === 0) return "✅ Tidak ada hutang/piutang aktif.";
    return "📋 *Daftar Hutang & Piutang:*\n" + loans.map((l) => `- ${l.type === 'PAYABLE' ? '🔴 Hutang' : '🟢 Piutang'} ${l.name}: ${formatCurrency(l.amount)}`).join('\n');
}

async function handleCheckSaldo(user: BotUser): Promise<ProcessCommandResult> {
    const [walletAggregate, txAggregate] = await Promise.all([
        prisma.wallet.aggregate({
            where: { userId: user.id },
            _sum: { initialBalance: true }
        }),
        prisma.transaction.groupBy({
            by: ['type'],
            where: { userId: user.id },
            _sum: { amount: true }
        })
    ]);

    const initial = walletAggregate._sum.initialBalance || 0;
    const income = txAggregate.find((t) => t.type === 'INCOME')?._sum.amount || 0;
    const expense = txAggregate.find((t) => t.type === 'EXPENSE')?._sum.amount || 0;

    return {
        title: 'Info Saldo',
        amount: initial + income - expense,
        category: 'Total Saldo',
        note: 'Ringkasan saldo semua wallet',
        date: new Date()
    };
}

async function handleCheckBudget(user: BotUser): Promise<ProcessCommandResult> {
    const budgets = await prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: true }
    });

    if (budgets.length === 0) return "⚠️ Belum ada budget yang diatur.";

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
            .filter((t) => t.categoryId === b.categoryId)
            .reduce((acc: number, t) => acc + t.amount, 0);

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

async function handleCheckGoal(user: BotUser): Promise<ProcessCommandResult> {
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

async function handleCheckWallet(user: BotUser): Promise<ProcessCommandResult> {
    const wallets = await prisma.wallet.findMany({ where: { userId: user.id } });
    if (wallets.length === 0) return "⚠️ Belum ada wallet.";

    const walletIds = wallets.map((wallet) => wallet.id);
    const txSummary = await prisma.transaction.groupBy({
        by: ['walletId', 'type'],
        where: {
            userId: user.id,
            walletId: { in: walletIds }
        },
        _sum: { amount: true }
    });

    const summaryMap = new Map<string, { income: number; expense: number }>();
    for (const summary of txSummary) {
        if (!summary.walletId) continue;

        const existing = summaryMap.get(summary.walletId) || { income: 0, expense: 0 };
        const amount = summary._sum.amount || 0;

        if (summary.type === 'INCOME') {
            existing.income = amount;
        } else {
            existing.expense = amount;
        }

        summaryMap.set(summary.walletId, existing);
    }

    let msg = "💳 *Saldo Wallet:*\n";
    for (const w of wallets) {
        const totals = summaryMap.get(w.id) || { income: 0, expense: 0 };
        const income = totals.income;
        const expense = totals.expense;
        const balance = w.initialBalance + income - expense;
        msg += `- ${w.name}: ${formatCurrency(balance)}\n`;
    }
    return msg;
}

const checkCommandHandlers: Record<string, CommandHandler> = {
    hutang: async (user) => handleCheckHutang(user),
    saldo: async (user) => handleCheckSaldo(user),
    budget: async (user) => handleCheckBudget(user),
    goal: async (user) => handleCheckGoal(user),
    wallet: async (user) => handleCheckWallet(user),
};

async function handleLaporan(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const periodAlias: Record<string, 'hari' | 'minggu' | 'bulan'> = {
        today: 'hari',
        week: 'minggu',
        month: 'bulan',
    };
    const rawPeriod = parts[1] || 'hari';
    const period = periodAlias[rawPeriod] || rawPeriod;

    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'hari') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === 'minggu') {
        const monday = new Date(now);
        const daysSinceMonday = (monday.getDay() + 6) % 7;
        monday.setDate(monday.getDate() - daysSinceMonday);

        start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
    } else if (period === 'bulan') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
        return "❌ Periode tidak valid. Gunakan: hari, minggu, bulan.";
    }

    const grouped = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
            userId: user.id,
            createdAt: { gte: start, lte: end }
        },
        _sum: { amount: true }
    });

    const income = grouped.find((t) => t.type === 'INCOME')?._sum.amount || 0;
    const expense = grouped.find((t) => t.type === 'EXPENSE')?._sum.amount || 0;
    const periodTitle: Record<'hari' | 'minggu' | 'bulan', string> = {
        hari: 'Hari',
        minggu: 'Minggu',
        bulan: 'Bulan',
    };

    return {
        title: `Laporan ${periodTitle[period as 'hari' | 'minggu' | 'bulan']}`,
        amount: income - expense,
        category: 'Financial Report',
        note: `📈 Masuk: ${formatCurrency(income)}\n📉 Keluar: ${formatCurrency(expense)}`,
        date: new Date()
    };
}

async function handleTransfer(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
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

    const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { walletId: w1.id, type: 'INCOME' }
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { walletId: w1.id, type: 'EXPENSE' }
        })
    ]);

    const currentBalance = w1.initialBalance + (incomeAgg._sum.amount || 0) - (expenseAgg._sum.amount || 0);

    if (currentBalance < amount) {
        return `❌ Gagal: Saldo ${w1.name} tidak cukup.\nSaldo: ${formatCurrency(currentBalance)}\nTransfer: ${formatCurrency(amount)}`;
    }

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

async function handleRutin(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
    if (amountIdx === -1) return "❌ Jumlah tidak ditemukan.";
    const amount = parseAmount(parts[amountIdx])!;

    const typeStr = parts.find((p) => ['masuk', 'in', 'keluar', 'out'].includes(p));
    if (!typeStr) return "❌ Tipe (masuk/keluar) tidak ditemukan.";
    const type = ['masuk', 'in'].includes(typeStr) ? 'INCOME' : 'EXPENSE';

    const intervalStr = parts.find((p) => ['harian', 'mingguan', 'bulanan'].includes(p));
    if (!intervalStr) return "❌ Interval (harian/mingguan/bulanan) tidak ditemukan.";

    let freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY';
    if (intervalStr === 'harian') freq = 'DAILY';
    if (intervalStr === 'mingguan') freq = 'WEEKLY';

    const nameParts = parts.filter((p, i) => i > 0 && i !== amountIdx && p !== typeStr && p !== intervalStr);
    const name = nameParts.join(' ');

    const defaultCategory = await prisma.category.findFirst({ where: { userId: user.id, type: type } });
    if (!defaultCategory) return "❌ Buat minimal satu kategori di dashboard dulu.";

    const newRecurring = await prisma.recurringTransaction.create({
        data: {
            userId: user.id,
            name: name || 'Rutin',
            amount: amount,
            type: type,
            categoryId: defaultCategory.id,
            frequency: freq,
            startDate: new Date(),
            nextRun: new Date()
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

async function handleBudget(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
    if (amountIdx === -1) return "❌ Gagal: Jumlah budget tidak ditemukan";
    const amount = parseAmount(parts[amountIdx])!;

    const categoryPart = parts.find((p) => p.startsWith('@'));
    if (!categoryPart) return "❌ Gagal: Kategori wajib pakai @ (cth: @Makan)";
    const categoryName = categoryPart.substring(1).replace(/_/g, ' ');

    const category = await prisma.category.findFirst({
        where: { userId: user.id, name: { equals: categoryName, mode: 'insensitive' } }
    });
    if (!category) return `❌ Gagal: Kategori '${categoryName}' tidak ditemukan.`;

    const existingBudget = await prisma.budget.findFirst({
        where: { userId: user.id, categoryId: category.id }
    });

    if (existingBudget) {
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

async function handleGoalCreate(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
    if (amountIdx === -1) return "❌ Target tidak ditemukan (cth: 1jt).";
    const target = parseAmount(parts[amountIdx])!;

    const nameParts = parts.filter((p, i) => i > 0 && i !== amountIdx && !p.startsWith('@'));
    const name = nameParts.join(' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

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

async function handleGoalFund(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const amountIdx = parts.findIndex((p, i) => i > 1 && parseAmount(p) !== null);
    if (amountIdx === -1) return "❌ Jumlah tidak ditemukan.";
    const amount = parseAmount(parts[amountIdx])!;

    const goalPart = parts.find((p) => p.startsWith('@'));
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

async function handleDebtCreate(user: BotUser, normalizedCmd: string, parts: string[]): Promise<ProcessCommandResult> {
    const type = normalizedCmd === 'piutang' ? 'RECEIVABLE' : 'PAYABLE';

    const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
    if (amountIdx === -1) return "❌ Gagal: Jumlah tidak ditemukan";
    const amount = parseAmount(parts[amountIdx])!;

    const personPart = parts.find((p) => p.startsWith('@'));
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

async function handleDebtSettle(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const personPart = parts.find((p) => p.startsWith('@'));
    if (!personPart) return "❌ Gagal: Nama orang wajib pakai @ (cth: @Budi)";
    const personName = personPart.substring(1).replace(/_/g, ' ');

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

async function handleDebtPayment(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const amountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null);
    if (amountIdx === -1) return "❌ Gagal: Jumlah pembayaran tidak ditemukan.";
    const amount = parseAmount(parts[amountIdx])!;

    const personPart = parts.find((p) => p.startsWith('@'));
    if (!personPart) return "❌ Gagal: Nama wajib pakai @ (cth: @Budi)";
    const personName = personPart.substring(1).replace(/_/g, ' ');

    const loan = await prisma.loan.findFirst({
        where: { userId: user.id, name: { equals: personName, mode: 'insensitive' }, status: 'ONGOING' }
    });

    if (!loan) return `❌ Tidak ada hutang aktif dengan ${personName}.`;

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

async function handleDeleteCategory(user: BotUser, parts: string[]): Promise<ProcessCommandResult> {
    const namePart = parts.filter((p, i) => i > 1 && !p.startsWith('@')).join(' ');
    const typePart = parts.find((p) => p === '@masuk' || p === '@keluar' || p === '@in' || p === '@out');

    if (!namePart) return "❌ Gagal: Nama kategori belum diisi.";

    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';
    if (typePart && (typePart === '@masuk' || typePart === '@in')) type = 'INCOME';

    const category = await prisma.category.findFirst({
        where: {
            userId: user.id,
            name: { equals: namePart, mode: 'insensitive' },
            type: type
        }
    });

    if (!category) return `❌ Gagal: Kategori '${namePart}' tidak ditemukan.`;

    const usageCount = await prisma.transaction.count({ where: { categoryId: category.id } });
    if (usageCount > 0) return `⚠️ Gagal: Kategori ini dipakai di ${usageCount} transaksi. Hapus transaksi dulu.`;

    const recurringCount = await prisma.recurringTransaction.count({ where: { categoryId: category.id } });
    if (recurringCount > 0) return `⚠️ Gagal: Kategori ini dipakai di ${recurringCount} rutinitas aktif. Hapus rutinitas dulu.`;

    await prisma.category.delete({ where: { id: category.id } });
    await saveActionHistory(user.id, 'DELETE_CATEGORY', { categoryData: category });

    return `✅ Kategori '${category.name}' (${type}) berhasil dihapus.`;
}

async function handleManualTransaction(user: BotUser, normalizedCmd: 'keluar' | 'masuk', parts: string[]): Promise<ProcessCommandResult> {
    const type = normalizedCmd === 'masuk' ? 'INCOME' : 'EXPENSE';

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

    const categoryIdx = parts.findIndex((p) => p.startsWith('@'));
    const viaIdx = parts.findIndex((p) => p === 'via');

    let explicitWalletName: string | undefined;
    if (viaIdx !== -1 && viaIdx < parts.length - 1) {
        explicitWalletName = parts.slice(viaIdx + 1).join(' ').toLowerCase();
    }

    const descParts: string[] = [];
    for (let i = 1; i < parts.length; i++) {
        if (i >= amountStartIndex && i < amountEndIndex) continue;
        if (categoryIdx !== -1 && i === categoryIdx) continue;
        if (viaIdx !== -1 && i >= viaIdx) continue;
        descParts.push(parts[i]);
    }

    let categoryName = 'Umum';
    const categoryPart = parts.find((p) => p.startsWith('@'));
    if (categoryPart) {
        categoryName = categoryPart.substring(1).replace(/_/g, ' ');
    }

    const description = descParts.join(' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

    const wallets = await prisma.wallet.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' }
    });

    let explicitWalletId: string | undefined;
    let matchedWallet: (typeof wallets)[number] | undefined;

    if (explicitWalletName) {
        matchedWallet = wallets.find((wallet) => wallet.name.toLowerCase() === explicitWalletName || wallet.name.toLowerCase().includes(explicitWalletName));
        if (!matchedWallet && explicitWalletName !== 'saldo utama') {
            return `⚠️ Anda tidak memiliki dompet bernama '${explicitWalletName}'.\nMohon buat dulu di web: https://kasaku.vercel.app`;
        }
        if (matchedWallet) {
            explicitWalletId = matchedWallet.id;
        }
    }

    if (type === 'EXPENSE') {
        let targetWalletToCheck = matchedWallet;
        if (!targetWalletToCheck && wallets.length === 1) {
            targetWalletToCheck = wallets[0];
        }

        if (targetWalletToCheck) {
            const [incomeSum, expenseSum] = await Promise.all([
                prisma.transaction.aggregate({
                    where: { userId: user.id, walletId: targetWalletToCheck.id, type: 'INCOME' },
                    _sum: { amount: true }
                }),
                prisma.transaction.aggregate({
                    where: { userId: user.id, walletId: targetWalletToCheck.id, type: 'EXPENSE' },
                    _sum: { amount: true }
                })
            ]);

            const currentBalance = targetWalletToCheck.initialBalance + (incomeSum._sum.amount || 0) - (expenseSum._sum.amount || 0);
            if (amount > currentBalance) {
                return `⚠️ *Saldo Tidak Mencukupi!*\n\n💰 Saldo ${targetWalletToCheck.name}: ${formatCurrency(currentBalance)}\n💸 Pengeluaran diminta: ${formatCurrency(amount)}\n❌ Kurang: ${formatCurrency(amount - currentBalance)}\n\n💡 _Silakan isi ulang dompet ini atau ubah jumlah transaksi._`;
            }
        }
    }

    if (!explicitWalletId && explicitWalletName !== 'saldo utama' && wallets.length > 1) {
        await prisma.pendingBotTransaction.deleteMany({ where: { userId: user.id } });

        await prisma.pendingBotTransaction.create({
            data: {
                userId: user.id,
                type: type,
                amount: amount,
                categoryName: categoryName,
                description: description
            }
        });

        let options = wallets.map((wallet, index) => `${index + 1}. ${wallet.name}`).join('\n');
        options += `\n${wallets.length + 1}. Saldo Utama`;

        return `💳 Anda memiliki beberapa dompet aktif. Dompet mana yang ingin digunakan?\n\n${options}\n\n_Balas dengan angka (contoh: 1)_`;
    }

    const defaultWalletId = (wallets.length === 1 && !explicitWalletName) ? wallets[0].id : explicitWalletId;

    const txResult = await executeTransaction(user, type, amount, categoryName, description, new Date(), defaultWalletId);
    if (typeof txResult === 'object' && txResult.transactionId) {
        await saveActionHistory(user.id, 'CREATE_TRANSACTIONS', { transactionIds: [txResult.transactionId] });
        if (matchedWallet) {
            txResult.note = `${txResult.note} (via ${matchedWallet.name})`;
        }
    }

    return txResult;
}

const directCommandHandlers: Record<string, CommandHandler> = {
    laporan: async (user, parts) => handleLaporan(user, parts),
    transfer: async (user, parts) => handleTransfer(user, parts),
    rutin: async (user, parts) => handleRutin(user, parts),
    budget: async (user, parts) => handleBudget(user, parts),
    goal: async (user, parts) => handleGoalCreate(user, parts),
    hutang: async (user, parts) => handleDebtCreate(user, 'hutang', parts),
    piutang: async (user, parts) => handleDebtCreate(user, 'piutang', parts),
    lunas: async (user, parts) => handleDebtSettle(user, parts),
    bayar: async (user, parts) => handleDebtPayment(user, parts),
    keluar: async (user, parts) => handleManualTransaction(user, 'keluar', parts),
    masuk: async (user, parts) => handleManualTransaction(user, 'masuk', parts),
};

const compoundCommandHandlers: Record<string, CommandHandler> = {
    'isi goal': async (user, parts) => handleGoalFund(user, parts),
    'hapus kategori': async (user, parts) => handleDeleteCategory(user, parts),
};

async function processCommand(user: BotUser, text: string): Promise<ProcessCommandResult> {
    const lower = text.toLowerCase().trim();
    const parts = lower.split(/\s+/);
    const cmd = parts[0];
    const commandAliases: Record<string, string> = {
        out: 'keluar',
        expense: 'keluar',
        in: 'masuk',
        income: 'masuk',
        debt: 'hutang',
        loan: 'piutang',
        report: 'laporan',
        cancel: 'batal',
    };
    const normalizedCmd = commandAliases[cmd] || cmd;

    // --- PENDING TRANSACTION INTERCEPTOR (MULTI-WALLET SELECTION) ---
    const isJustNumber = /^\d+$/.test(lower);
    if (isJustNumber && lower.length < 3) { // Assume max wallet count is reasonable (< 100)
        const pendingTx = await prisma.pendingBotTransaction.findFirst({
            where: { userId: user.id }
        });

        if (pendingTx) {
            const index = parseInt(lower) - 1;
            const wallets = await prisma.wallet.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'asc' }
            });

            // If selected 'Saldo Utama' (index === wallets.length) or within valid range
            if (index >= 0 && index <= wallets.length) {
                const selectedWalletId = index === wallets.length ? undefined : wallets[index].id;
                const walletNameForMessage = index === wallets.length ? "Saldo utama" : wallets[index].name;

                const txResult = await executeTransaction(
                    user,
                    pendingTx.type,
                    pendingTx.amount,
                    pendingTx.categoryName,
                    pendingTx.description,
                    new Date(),
                    selectedWalletId
                );

                await prisma.pendingBotTransaction.delete({ where: { id: pendingTx.id } });

                if (typeof txResult === 'object' && txResult.transactionId) {
                    await saveActionHistory(user.id, 'CREATE_TRANSACTIONS', { transactionIds: [txResult.transactionId] });
                    // Explicitly state the wallet to reassure the user
                    txResult.note = `${txResult.note} (via ${walletNameForMessage})`;
                }
                return txResult;
            } else {
                return "❌ Pilihan tidak valid. Silakan balas dengan angka yang sesuai dengan opsi dompet di atas, atau ketik 'batal' untuk membatalkan.";
            }
        }
        // If it's a number but there's NO pending transaction, let it fall through 
        // to the default AI intent handler so we don't accidentally corrupt data.
    }

    // --- BATAL PENDING TRANSACTION ---
    if (normalizedCmd === 'batal') {
        const pendingTx = await prisma.pendingBotTransaction.findFirst({
            where: { userId: user.id }
        });
        if (pendingTx) {
            await prisma.pendingBotTransaction.delete({ where: { id: pendingTx.id } });
            return "✅ Transaksi dibatalkan.";
        }
    }

    if (cmd === 'cek' && parts[1]) {
        const checkHandler = checkCommandHandlers[parts[1]];
        if (checkHandler) {
            return checkHandler(user, parts, text);
        }
    }

    const directHandler = directCommandHandlers[normalizedCmd] || directCommandHandlers[cmd];
    if (directHandler) {
        return directHandler(user, parts, text);
    }

    const compoundCmd = `${normalizedCmd} ${parts[1] || ''}`;
    const compoundHandler = compoundCommandHandlers[compoundCmd] || compoundCommandHandlers[`${cmd} ${parts[1] || ''}`];
    if (compoundHandler) {
        return compoundHandler(user, parts, text);
    }

    // --- UNDO (Universal Multi-step) ---
    if (cmd === 'undo' || normalizedCmd === 'batal') {
        return await executeUndo(user.id);
    }


    return handleAIFallback(user, text);
}

async function handleAIFallback(user: BotUser, text: string): Promise<ProcessCommandResult> {
    const parsed = await parseTransactionText(text);
    if (!(parsed && parsed.isValidCommand && parsed.actions && parsed.actions.length > 0)) {
        return null;
    }

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

                        const wallets = await prisma.wallet.findMany({
                            where: { userId: user.id },
                            orderBy: { createdAt: 'asc' }
                        });

                        let explicitWalletId: string | undefined;
                        let matchedWallet: (typeof wallets)[number] | undefined;

                        if (item.walletName) {
                            matchedWallet = wallets.find(w => w.name.toLowerCase() === item.walletName!.toLowerCase() || w.name.toLowerCase().includes(item.walletName!.toLowerCase()));
                            if (!matchedWallet && item.walletName.toLowerCase() !== 'saldo utama') {
                                results.push(`⚠️ AI: Anda tidak memiliki dompet bernama '${item.walletName}'. Mohon buat dulu di web.`);
                                break;
                            }
                            if (matchedWallet) {
                                explicitWalletId = matchedWallet.id;
                            }
                        }

                        if (item.type === 'EXPENSE') {
                            let targetWalletToCheck = matchedWallet;
                            if (!targetWalletToCheck && wallets.length === 1) {
                                targetWalletToCheck = wallets[0];
                            }

                            if (targetWalletToCheck) {
                                const incomeSum = await prisma.transaction.aggregate({
                                    where: { userId: user.id, walletId: targetWalletToCheck.id, type: 'INCOME' },
                                    _sum: { amount: true }
                                });
                                const expenseSum = await prisma.transaction.aggregate({
                                    where: { userId: user.id, walletId: targetWalletToCheck.id, type: 'EXPENSE' },
                                    _sum: { amount: true }
                                });

                                const currentBalance = targetWalletToCheck.initialBalance + (incomeSum._sum.amount || 0) - (expenseSum._sum.amount || 0);

                                if (item.amount > currentBalance) {
                                    results.push(`⚠️ *Saldo Tidak Mencukupi!*\n\n💰 Saldo ${targetWalletToCheck.name}: ${formatCurrency(currentBalance)}\n💸 Pengeluaran diminta: ${formatCurrency(item.amount)}\n❌ Kurang: ${formatCurrency(item.amount - currentBalance)}`);
                                    break;
                                }
                            }
                        }

                        if (!explicitWalletId && (!item.walletName || item.walletName.toLowerCase() !== 'saldo utama') && wallets.length > 1) {
                            await prisma.pendingBotTransaction.deleteMany({ where: { userId: user.id } });
                            await prisma.pendingBotTransaction.create({
                                data: {
                                    userId: user.id,
                                    type: item.type,
                                    amount: item.amount,
                                    categoryName: categoryName,
                                    description: description + (txDate.toDateString() !== new Date().toDateString() ? ` [${txDate.toISOString()}]` : "")
                                }
                            });

                            let options = wallets.map((w, index) => `${index + 1}. ${w.name}`).join('\n');
                            options += `\n${wallets.length + 1}. Saldo Utama`;
                            results.push(`💳 Anda memiliki beberapa dompet aktif. Dompet mana yang ingin digunakan untuk transaksi AI ini?\n\n${options}\n\n_Balas dengan angka (contoh: 1)_`);
                            break;
                        }

                        const defaultWalletId = (wallets.length === 1 && !item.walletName) ? wallets[0].id : explicitWalletId;

                        const txResult = await executeTransaction(user, item.type, item.amount, categoryName, description, txDate, defaultWalletId);
                        if (typeof txResult === 'object') {
                            if (txResult.transactionId) await saveActionHistory(user.id, 'CREATE_TRANSACTIONS', { transactionIds: [txResult.transactionId] });
                            if (matchedWallet) {
                                txResult.note = `${txResult.note} (via ${matchedWallet.name})`;
                            }
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

    if (results.length === 1) {
        const first = results[0];
        if (typeof first === 'object') return first;
        return first;
    }

    if (results.length > 1) {
        return results
            .map((item) => {
                if (typeof item === 'string') return item;
                const amountLabel = item.amount !== undefined ? formatCurrency(item.amount) : '-';
                const categoryLabel = item.category || '-';
                return `• ${item.title}: ${amountLabel} (${categoryLabel})`;
            })
            .join('\n');
    }

    return null;
}

// Helper function to execute transaction logic internally
async function executeTransaction(user: BotUser, type: 'INCOME' | 'EXPENSE', amount: number, categoryName: string, description: string, date: Date = new Date(), explicitWalletId?: string) {
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

    let finalWalletId = explicitWalletId;
    if (finalWalletId === undefined) {
        // Fallback to first wallet if no specific wallet ID is provided and the user has wallets
        const wallet = await prisma.wallet.findFirst({
            where: { userId: user.id },
            select: { id: true }
        });
        if (wallet) {
            finalWalletId = wallet.id;
        }
    }

    if (!category) return "❌ Gagal: Kategori tidak ditemukan atau tidak dapat dibuat.";

    const tx = await prisma.transaction.create({
        data: {
            userId: user.id,
            amount: amount,
            type: type,
            categoryId: category.id,
            walletId: finalWalletId,
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
