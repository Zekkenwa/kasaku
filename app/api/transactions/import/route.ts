import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryType } from "@prisma/client";

const parseCSVLine = (line: string) => {
    // ... existing code ...
    // Find or create category
    let category = await prisma.category.findFirst({
        where: {
            userId: user.id,
            name: { equals: categoryName, mode: "insensitive" },
            type: type as CategoryType,
        },
    });

    if (!category) {
        category = await prisma.category.create({
            data: {
                userId: user.id,
                name: categoryName,
                type: type as CategoryType,
            },
        });
    }

    await prisma.transaction.create({
        data: {
            userId: user.id,
            categoryId: category.id,
            type: type as CategoryType,
            amount,
            createdAt: date,
            note: note?.replace(/^"|"$/g, "") || "",
        }
    });
    const values = [];
    let currentValue = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = "";
        } else {
            currentValue += char;
        }
    }
    values.push(currentValue.trim());
    return values;
};

// Parse DD/MM/YYYY to a Date object
const parseDateDDMMYYYY = (dateStr: string): Date | null => {
    // Try DD/MM/YYYY
    const parts = dateStr.split("/");
    if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const d = new Date(`${yyyy}-${mm}-${dd}`);
        if (!isNaN(d.getTime())) return d;
    }
    // Fallback: try ISO or other formats
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new NextResponse("No file uploaded", { status: 400 });
        }

        const text = await file.text();
        const lines = text.split("\n").filter((l) => l.trim() !== "");

        // Detect format from header
        const header = lines[0].toLowerCase();
        const isNewFormat = header.includes("tanggal") && (header.includes("pemasukan") || header.includes("pengeluaran"));
        const isOldFormat = header.includes("date") && header.includes("type") && header.includes("amount");
        const startIdx = (isNewFormat || isOldFormat) ? 1 : 0;

        let successCount = 0;
        let errorCount = 0;

        for (let i = startIdx; i < lines.length; i++) {
            try {
                const line = lines[i];
                const values = parseCSVLine(line);

                // Skip "Total" row
                if (values[0]?.toLowerCase() === "total" || values[1]?.toLowerCase() === "total") {
                    continue;
                }

                let dateStr: string, categoryName: string, amount: number, type: string, note: string;

                if (isNewFormat) {
                    // New format: No, Tanggal, Kategori, Pemasukan, Pengeluaran, Saldo, Catatan
                    const [_no, tanggal, kategori, pemasukanStr, pengeluaranStr, _saldo, catatan] = values;
                    dateStr = tanggal;
                    categoryName = kategori;
                    note = catatan || "";

                    const pemasukan = parseFloat((pemasukanStr || "0").replace(/[^0-9.-]+/g, "")) || 0;
                    const pengeluaran = parseFloat((pengeluaranStr || "0").replace(/[^0-9.-]+/g, "")) || 0;

                    if (pemasukan > 0) {
                        type = "INCOME";
                        amount = pemasukan;
                    } else if (pengeluaran > 0) {
                        type = "EXPENSE";
                        amount = pengeluaran;
                    } else {
                        errorCount++;
                        continue;
                    }
                } else {
                    // Old format: Date, Type, Category, Amount, Note
                    const [d, t, c, a, n] = values;
                    dateStr = d;
                    type = (t || "").toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";
                    categoryName = c;
                    amount = parseFloat((a || "0").replace(/[^0-9.-]+/g, ""));
                    note = n || "";
                }

                if (!dateStr || !categoryName || isNaN(amount) || amount <= 0) {
                    errorCount++;
                    continue;
                }

                const date = parseDateDDMMYYYY(dateStr);
                if (!date) {
                    errorCount++;
                    continue;
                }

                // Find or create category
                let category = await prisma.category.findFirst({
                    where: {
                        userId: user.id,
                        name: { equals: categoryName, mode: "insensitive" },
                        type: type,
                    },
                });

                if (!category) {
                    category = await prisma.category.create({
                        data: {
                            userId: user.id,
                            name: categoryName,
                            type: type as CategoryType,
                        },
                    });
                }

                await prisma.transaction.create({
                    data: {
                        userId: user.id,
                        categoryId: category.id,
                        type: type as CategoryType,
                        amount,
                        createdAt: date,
                        note: note?.replace(/^"|"$/g, "") || "",
                    }
                });

                successCount++;
            } catch (err) {
                console.error("Error parsing line", err);
                errorCount++;
            }
        }

        return NextResponse.json({ success: true, count: successCount, errors: errorCount });
    } catch (error) {
        console.error("Import error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
