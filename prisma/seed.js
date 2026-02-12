const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const name = process.env.SEED_USER_NAME || "User";

  if (!email) {
    throw new Error("SEED_USER_EMAIL belum diisi di .env");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
    select: { id: true },
  });

  // bersihkan data lama user ini
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.loan.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });

  // kategori
  const categories = await prisma.category.createMany({
    data: [
      { userId: user.id, name: "Gaji", type: "INCOME" },
      { userId: user.id, name: "Bonus", type: "INCOME" },
      { userId: user.id, name: "Freelance", type: "INCOME" },
      { userId: user.id, name: "Makan", type: "EXPENSE" },
      { userId: user.id, name: "Transport", type: "EXPENSE" },
      { userId: user.id, name: "Belanja", type: "EXPENSE" },
      { userId: user.id, name: "Sewa", type: "EXPENSE" },
      { userId: user.id, name: "Hiburan", type: "EXPENSE" },
    ],
  });

  const allCategories = await prisma.category.findMany({
    where: { userId: user.id },
  });

  const byName = (name) => allCategories.find((c) => c.name === name)?.id;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        type: "INCOME",
        amount: 15000000,
        categoryId: byName("Gaji"),
        createdAt: new Date(y, m, 1),
        note: "Gaji bulanan",
      },
      {
        userId: user.id,
        type: "INCOME",
        amount: 3500000,
        categoryId: byName("Freelance"),
        createdAt: new Date(y, m, 5),
        note: "Project freelance",
      },
      {
        userId: user.id,
        type: "INCOME",
        amount: 1000000,
        categoryId: byName("Bonus"),
        createdAt: new Date(y, m, 10),
        note: "Bonus",
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 350000,
        categoryId: byName("Makan"),
        createdAt: new Date(y, m, 2),
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 250000,
        categoryId: byName("Transport"),
        createdAt: new Date(y, m, 3),
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 900000,
        categoryId: byName("Belanja"),
        createdAt: new Date(y, m, 8),
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 4500000,
        categoryId: byName("Sewa"),
        createdAt: new Date(y, m, 1),
      },
      {
        userId: user.id,
        type: "EXPENSE",
        amount: 500000,
        categoryId: byName("Hiburan"),
        createdAt: new Date(y, m, 6),
      },
    ],
  });

  await prisma.loan.createMany({
    data: [
      {
        userId: user.id,
        name: "Pinjaman Motor",
        amount: 12000000,
        dueDate: new Date(y, m + 7, 10),
        status: "ONGOING",
      },
      {
        userId: user.id,
        name: "Cicilan Laptop",
        amount: 8000000,
        dueDate: new Date(y, m + 1, 5),
        status: "ONGOING",
      },
    ],
  });

  console.log("Seed data berhasil.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });