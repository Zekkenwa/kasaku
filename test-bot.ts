
import { handleIncomingMessage } from './scripts/whatsapp-bot-logic';
import { prisma } from './lib/prisma';

// Mock Socket
const mockSock = {
    sendMessage: async (jid: string, content: any) => {
        console.log(`\n[BOT REPLY to ${jid}]: ${content.text}`);
    }
};

// Mock Message Helper
const createMsg = (phone: string, text: string) => ({
    messages: [{
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
        message: { conversation: text }
    }]
});

async function runTests() {
    console.log("--- STARTING BOT LOGIC TESTS ---");

    // 1. REGISTER USER MANUALLY (Since we can't OTP in test easily without modify DB)
    const testPhone = "62899999999";
    console.log(`\n1. Upserting Test User: ${testPhone}`);

    // Create dummy user
    await prisma.user.upsert({
        where: { email: 'testbot@kasaku.com' },
        update: { phone: testPhone },
        create: {
            name: "Test User",
            email: "testbot@kasaku.com",
            phone: testPhone,
            monthlyReportOptIn: true
        }
    });

    // 2. TEST GREETING
    console.log("\n2. Test Greeting");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "Halo"));

    // 3. TEST HELP
    console.log("\n3. Test Help");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "help"));

    // 4. TEST INCOME
    console.log("\n4. Test Income");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "masuk 10jt Gaji @Kerja"));

    // 5. TEST EXPENSE
    console.log("\n5. Test Expense");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "keluar 50k Makan Siang @Makan"));

    // 6. TEST DEBT
    console.log("\n6. Test Debt");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "hutang 100k @Budi Pinjam Dulu"));

    // 7. TEST CEK SALDO
    console.log("\n7. Test Cek Saldo");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "cek saldo"));

    // 8. TEST BUDGET
    console.log("\n8. Test Budget");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "budget 1jt @Makan"));

    // 9. TEST CEK BUDGET
    console.log("\n9. Test Cek Budget");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "cek budget"));

    // 10. TEST REPORT
    console.log("\n10. Test Report");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "laporan bulan"));

    // 11. TEST UNDO
    console.log("\n11. Test Undo");
    await handleIncomingMessage(mockSock as any, createMsg(testPhone, "undo"));

    console.log("\n--- TESTS COMPLETED ---");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
