
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const email = "chalsinglalim@gmail.com";
    console.log(`Seeding transactions for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { categories: true, wallets: true },
    });

    if (!user) {
        console.error("User not found!");
        return;
    }

    let walletId = user.wallets[0]?.id;
    if (!walletId) {
        console.log("No wallet found, creating one...");
        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                name: "Tunai",
                type: "CASH",
                initialBalance: 0,
            },
        });
        walletId = wallet.id;
    }

    const expenseCategories = user.categories.filter((c) => c.type === "EXPENSE");
    const incomeCategories = user.categories.filter((c) => c.type === "INCOME");

    if (expenseCategories.length === 0 || incomeCategories.length === 0) {
        console.error("User needs at least one income and expense category.");
        // fast create if needed
        if (expenseCategories.length === 0) {
            const c = await prisma.category.create({ data: { userId: user.id, name: "Makan", type: "EXPENSE" } });
            expenseCategories.push(c);
        }
        if (incomeCategories.length === 0) {
            const c = await prisma.category.create({ data: { userId: user.id, name: "Gaji", type: "INCOME" } });
            incomeCategories.push(c);
        }
    }

    const startDate = new Date("2026-01-31T00:00:00Z");
    const endDate = new Date("2026-02-14T23:59:59Z");

    for (let i = 0; i < 20; i++) {
        const isExpense = Math.random() > 0.4; // 60% expense
        const type = isExpense ? "EXPENSE" : "INCOME";
        const categories = isExpense ? expenseCategories : incomeCategories;
        const category = categories[Math.floor(Math.random() * categories.length)];

        // Random date
        const date = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

        // Random amount similar to real life
        const amount = isExpense
            ? Math.floor(Math.random() * 500) * 1000 + 10000 // 10k - 500k
            : Math.floor(Math.random() * 5000) * 1000 + 1000000; // 1m - 6m

        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount,
                type,
                categoryId: category.id,
                walletId,
                createdAt: date,
                note: `Test txn ${i + 1}`,
            },
        });

        console.log(`Created ${type} ${amount} on ${date.toISOString().slice(0, 10)} (${category.name})`);
    }

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
