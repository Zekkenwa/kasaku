import { WASocket } from '@whiskeysockets/baileys';
import { prisma } from '../lib/prisma';
import { generateBlindIndex } from '../lib/encryption';

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

    const phone = remoteJid.split('@')[0];
    const phoneHash = generateBlindIndex(phone);

    if (remoteJid.endsWith('@lid')) {
        console.log(`[BOT] Received message from LID: ${remoteJid}`);
        // Attempt to resolve phone from LID if possible
        // Baileys sometimes provides 'pushName' or other handles
        console.log(`[BOT] Message object detail:`, JSON.stringify(message, null, 2));
    }

    console.log(`[BOT] Checking user for phone: ${phone} (hash: ${phoneHash.substring(0, 10)}...)`);

    let user = await prisma.user.findUnique({
        where: { phoneHash: phoneHash },
        include: { wallets: true, categories: true }
    });

    // Fallback: Self-healing for bot (if not found by hash, try plain phone)
    if (!user) {
        console.log(`[BOT] User not found by hash, trying plain phone fallback for: ${phone}`);
        // Since 'phone' is encrypted, we need to encrypt for search
        const { encrypt } = require('../lib/encryption');
        const encryptedPhone = encrypt(phone);

        user = await prisma.user.findFirst({
            where: { phone: encryptedPhone },
            include: { wallets: true, categories: true }
        });

        if (user) {
            console.log(`[BOT] Found user by plain phone. Healing phoneHash...`);
            user = await prisma.user.update({
                where: { id: user.id },
                data: { phoneHash: phoneHash },
                include: { wallets: true, categories: true }
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
            text: `👋 Halo! Nomor WhatsApp ini (*${phone}*) belum terdaftar di sistem kami.\n\nMohon pastikan nomor ini sudah sesuai dengan yang Anda masukkan di menu *Pengaturan Akun* di dashboard Kasaku.\n\n🌐 Dashboard: https://kasaku.vercel.app`
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
    const greetings = ['hi', 'halo', 'hello', 'pagi', 'siang', 'sore', 'malam', 'tes', 'ping'];
    if (lines.length === 1 && greetings.includes(lines[0].toLowerCase())) {
        if (isSilenceActive) return; // Skip greeting if silence active
        await sock.sendMessage(remoteJid, { text: `Halo ${user.name}! 👋\nSaya siap membantu mencatat keuanganmu.\n\nKetik *help* untuk melihat cara penggunaan.` });
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
                `📅 *Waktu*: ${timeStr}\n\n` +
                `_Terima kasih sudah menggunakan Kasaku!_`;
        } else {
            finalReply = `✅ ${results.length > 1 ? 'Beberapa transaksi berhasil diproses:' : 'Berhasil!'}\n\n` +
                results.map(r => typeof r === 'string' ? r : `• ${r.title}: ${formatCurrency(r.amount)} (${r.category})`).join('\n');
        }

        await sock.sendMessage(remoteJid, { text: finalReply });
    } else {
        // If NO command recognized in single line, send hint
        if (lines.length === 1) {
            if (isSilenceActive) return; // SKIP HINT IF SILENCE ACTIVE
            await sock.sendMessage(remoteJid, { text: "Maaf, saya tidak mengerti perintah tersebut. Ketik *help* untuk bantuan." });
        }
    }
}

async function sendHelp(sock: WASocket, jid: string, name: string, full: boolean) {
    let text = `🤖 *KASAKU BOT HELP*\n\nHalo ${name}! 👋\nSaya siap membantu mencatat keuanganmu.\n\n`;

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
        return `✅ Kategori '${category.name}' (${type}) berhasil dihapus.`;
    }

    // --- TRANSACTION (keluar/masuk) ---
    if (['keluar', 'out', 'expense', 'masuk', 'in', 'income'].includes(cmd)) {
        const type = ['masuk', 'in', 'income'].includes(cmd) ? 'INCOME' : 'EXPENSE';

        // Find amount (first string that looks like number)
        // Find amount: could be one word (15k) or multiple (seratus ribu)
        // We try to join parts and parse? Or iterate?
        // Simple strategy: Try to parse each part. If fail, try to join 2 parts, 3 parts...
        // But natural language is hard to identify boundaries. 
        // "keluar seratus ribu makan" -> "seratus ribu" is amount.
        // "keluar 15k makan" -> "15k" is amount.

        let amount = 0;
        let amountStartIndex = -1;
        let amountEndIndex = -1;

        // Try single token match first (numeric or simple shortcuts)
        const simpleAmountIdx = parts.findIndex((p, i) => i > 0 && parseAmount(p) !== null && !isNaN(parseFloat(p.replace(/[^0-9]/g, ''))));
        // logic above is flawed for 'seratus'. parseFloat('seratus') is NaN.

        // Better: Scan for number words or digits
        // find longest sequence of "amount-like" words?

        for (let i = 1; i < parts.length; i++) {
            // Check if parts[i] starts a number
            // Try increasing window size
            for (let j = parts.length; j > i; j--) {
                const sub = parts.slice(i, j).join(' ');
                const val = parseAmount(sub);
                if (val !== null && val > 0) {
                    // Found a match!
                    // But check if it's just a common word? 'satu' might be 'jam satu'.
                    // Usually user puts amount early or clearly. 
                    // Let's assume longest match is amount.
                    amount = val;
                    amountStartIndex = i;
                    amountEndIndex = j;
                    break;
                }
            }
            if (amount > 0) break;
        }

        if (amount === 0) return "❌ Gagal: Jumlah tidak ditemukan (cth: 15k, seratus ribu)";

        // Description is everything else NOT in the amount range
        // And not category part
        const categoryIdx = parts.findIndex(p => p.startsWith('@'));

        let descParts = [];
        for (let i = 1; i < parts.length; i++) {
            if (i >= amountStartIndex && i < amountEndIndex) continue;
            if (categoryIdx !== -1 && i === categoryIdx) continue;
            // Also skip if part is "masuk"/"keluar" command itself (index 0)
            descParts.push(parts[i]);
        }

        // ... rest of logic uses `amount` and `descParts`
        // Category logic
        let categoryName = "Umum";
        const categoryPart = parts.find(p => p.startsWith('@'));
        if (categoryPart) {
            categoryName = categoryPart.substring(1).replace(/_/g, ' ');
        }

        const description = descParts.join(' ').replace(/\b\w/g, l => l.toUpperCase());

        // Handle Category (Find or Create)
        let category = user.categories.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type);
        if (!category) {
            // Create new category if not exists
            try {
                // Ensure unique name per user+type
                // If name exists but different type, we might want to distinguish.
                // For simplicity, just create. Prisma @@unique([userId, name, type]) handles duplicate check.
                category = await prisma.category.create({
                    data: {
                        userId: user.id,
                        name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
                        type: type
                    }
                });
            } catch (e) {
                // If collision (race condition or existing), just refetch
                category = await prisma.category.findFirst({ where: { userId: user.id, name: categoryName, type } });
            }
        }

        // Wallet (Default to first)
        const wallet = user.wallets.length > 0 ? user.wallets[0] : null; // Should handle 'no wallet' case if needed

        // Execute Transaction
        const tx = await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: amount,
                type: type,
                categoryId: category.id,
                walletId: wallet?.id,
                note: description || (type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
                createdAt: new Date()
            }
        });

        // Update Wallet Balance (Optional if backend relies on sum queries, but good if we tracking balance field)
        // Kasaku seems to use sum queries on fly? DashboardClient calculates totals from transactions prop.
        // Wait, DashboardClient props: totals: { balance... }. 
        // Dashboard server component likely calculates it.
        // If we want real-time balance update in wallet table (if it exists):
        if (wallet) {
            // Check if wallet model has balance field? Wallet model: initialBalance int.
            // Balance is calculated dynamically. So no update needed on Wallet table.
        }

        return {
            title: type === 'INCOME' ? 'Pemasukan Baru' : 'Pengeluaran Baru',
            amount: amount,
            category: category.name,
            note: description || (type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
            date: new Date()
        };
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

        await prisma.loan.create({
            data: {
                userId: user.id,
                name: personName,
                amount: amount,
                type: type,
                status: 'ONGOING',
                createdAt: new Date()
            }
        });

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

    // --- UNDO (Smart) ---
    if (cmd === 'undo' || cmd === 'batal') {
        const lastTx = await prisma.transaction.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
        const lastLoan = await prisma.loan.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
        const lastGoal = await prisma.goal.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });

        const items = [
            { type: 'TX', date: lastTx?.createdAt, data: lastTx },
            { type: 'LOAN', date: lastLoan?.createdAt, data: lastLoan },
            { type: 'GOAL', date: lastGoal?.createdAt, data: lastGoal }
        ].filter(i => i.date !== undefined);

        if (items.length === 0) return "❌ Tidak ada aktivitas baru-baru ini.";

        items.sort((a, b) => b.date!.getTime() - a.date!.getTime());
        const latest = items[0];

        if (latest.type === 'TX') {
            const tx = latest.data as any;
            await prisma.transaction.delete({ where: { id: tx.id } });
            return `✅ Undo: Transaksi ${formatCurrency(tx.amount)} dibatalkan.`;
        } else if (latest.type === 'LOAN') {
            const loan = latest.data as any;
            await prisma.loan.delete({ where: { id: loan.id } });
            return `✅ Undo: Hutang/Piutang ${loan.name} dibatalkan.`;
        } else if (latest.type === 'GOAL') {
            const goal = latest.data as any;
            await prisma.goal.delete({ where: { id: goal.id } });
            return `✅ Undo: Goal '${goal.name}' dihapus.`;
        }
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
        const category = user.categories.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!category) return `❌ Gagal: Kategori '${categoryName}' tidak ditemukan.`;

        // Upsert Budget
        // Prisma doesn't support upsert on composite unique key directly easily without where clause matching exact unique constraint name or fields.
        // But we have @@unique([userId, categoryId])
        const existingBudget = await prisma.budget.findFirst({
            where: { userId: user.id, categoryId: category.id }
        });

        if (existingBudget) {
            await prisma.budget.update({
                where: { id: existingBudget.id },
                data: { limitAmount: amount }
            });
        } else {
            await prisma.budget.create({
                data: {
                    userId: user.id,
                    categoryId: category.id,
                    limitAmount: amount,
                    period: 'MONTHLY'
                }
            });
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

        await prisma.goal.create({
            data: {
                userId: user.id,
                name: name,
                targetAmount: target,
                currentAmount: 0
            }
        });
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
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: amount,
                type: 'EXPENSE',
                walletId: w1.id,
                note: `Transfer ke ${w2.name}`
            }
        });
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: amount,
                type: 'INCOME',
                walletId: w2.id,
                note: `Transfer dari ${w1.name}`
            }
        });

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

        await prisma.recurringTransaction.create({
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

        return {
            title: 'Rutinitas Baru',
            amount: amount,
            category: 'Rutin',
            note: `${name || 'Rutin'} (${intervalStr})`,
            date: new Date()
        };
    }

    return null;
}
