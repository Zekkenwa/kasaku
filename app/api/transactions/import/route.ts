import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryType } from "@prisma/client";

const parseCSVLine = (line: string, delimiter: string) => {
    const values = [];
    let currentValue = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
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
    const parts = dateStr.split(/[\/\-]/); // Split by / or -
    let d: Date | null = null;

    if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        // Check if YYYY is first (YYYY-MM-DD)
        if (dd.length === 4) {
            d = new Date(`${dd}-${mm}-${yyyy}`);
        } else {
            d = new Date(`${yyyy}-${mm}-${dd}`);
        }
    } else {
        d = new Date(dateStr);
    }

    if (!d || isNaN(d.getTime())) return null;

    // Set current time to avoid sorting issues (all at midnight)
    // Only if the date is "today", otherwise standard time is fine.
    // Actually, let's just add current time to ALL imports to preserve import order relative to creation
    const now = new Date();
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    return d;
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

        if (lines.length === 0) return NextResponse.json({ success: true, count: 0, errors: 0 });

        // Detect format from header
        const header = lines[0].toLowerCase();

        // Detect delimiter: count commas vs semicolons
        const commaCount = (header.match(/,/g) || []).length;
        const semiCount = (header.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ";" : ",";

        const isNewFormat = header.includes("tanggal") && (header.includes("pemasukan") || header.includes("pengeluaran"));
        const isOldFormat = header.includes("date") && header.includes("type") && header.includes("amount");
        const startIdx = (isNewFormat || isOldFormat) ? 1 : 0;

        let successCount = 0;
        let errorCount = 0;

        for (let i = startIdx; i < lines.length; i++) {
            try {
                const line = lines[i];
                if (!line.trim()) continue;

                const values = parseCSVLine(line, delimiter);

                // Skip "Total" row (case insensitive)
                if (values[0]?.toLowerCase().includes("total") || values[1]?.toLowerCase().includes("total")) {
                    continue;
                }

                let dateStr: string, categoryName: string, amount: number, type: string, note: string;

                if (isNewFormat) {
                    // New format: No, Tanggal, Kategori, Pemasukan, Pengeluaran, Catatan
                    // Handle potential extra columns slightly gracefully
                    const [_no, tanggal, kategori, pemasukanStr, pengeluaranStr, catatan] = values;

                    if (!tanggal || !kategori) {
                        errorCount++;
                        continue;
                    }

                    dateStr = tanggal;
                    categoryName = kategori;
                    note = catatan || "";

                    // Helper to clean currency strings (e.g. "Rp 12.000,00" -> 12000)
                    const cleanNumber = (str: string) => {
                        if (!str) return 0;
                        // Remove Rp, dots, spaces. Replace comma with dot for decimal.
                        // But if format is 10.000 (ID) -> 10000. 10,000 (US) -> 10000.
                        // Simple approach: Remove everything except digits, minus, and comma/dot.
                        // If delimiter is semicolon, decimal is likely comma.
                        let clean = str.replace(/[^0-9,\.-]+/g, "");
                        if (delimiter === ";") {
                            clean = clean.replace(/\./g, "").replace(",", "."); // 10.000,00 -> 10000.00
                        } else {
                            clean = clean.replace(/,/g, ""); // 10,000.00 -> 10000.00
                        }
                        return parseFloat(clean) || 0;
                    };

                    const pemasukan = cleanNumber(pemasukanStr);
                    const pengeluaran = cleanNumber(pengeluaranStr);

                    if (pemasukan > 0) {
                        type = "INCOME";
                        amount = pemasukan;
                    } else if (pengeluaran > 0) {
                        type = "EXPENSE";
                        amount = pengeluaran;
                    } else {
                        // Both 0 is skip
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
