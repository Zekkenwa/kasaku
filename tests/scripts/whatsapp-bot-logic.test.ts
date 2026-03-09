import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, parseTransactionTextMock } = vi.hoisted(() => ({
    prismaMock: {
        pendingBotTransaction: {
            findFirst: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
            create: vi.fn(),
        },
        wallet: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
        },
        category: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        transaction: {
            create: vi.fn(),
        },
        botActionHistory: {
            create: vi.fn(),
        },
    },
    parseTransactionTextMock: vi.fn(),
}));

vi.mock("../../lib/prisma", () => ({
    prisma: prismaMock,
}));

vi.mock("../../lib/ai", () => ({
    parseTransactionText: parseTransactionTextMock,
}));

import { parseTransactionText } from "../../lib/ai";
import { processCommand } from "../../scripts/whatsapp-bot-logic";
import type { BotUser } from "../../types/bot";

const user: BotUser = {
    id: "user-1",
    name: "Tester",
};

describe("processCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("handles cancel alias by clearing pending transaction", async () => {
        prismaMock.pendingBotTransaction.findFirst.mockResolvedValue({
            id: "pending-1",
            userId: user.id,
        });
        prismaMock.pendingBotTransaction.delete.mockResolvedValue({ id: "pending-1" });

        const result = await processCommand(user, "cancel");

        expect(result).toBe("✅ Transaksi dibatalkan.");
        expect(prismaMock.pendingBotTransaction.findFirst).toHaveBeenCalledWith({ where: { userId: user.id } });
        expect(prismaMock.pendingBotTransaction.delete).toHaveBeenCalledWith({ where: { id: "pending-1" } });
    });

    it("returns invalid option message for out-of-range wallet selection", async () => {
        prismaMock.pendingBotTransaction.findFirst.mockResolvedValue({
            id: "pending-2",
            userId: user.id,
            type: "EXPENSE",
            amount: 10000,
            categoryName: "Makan",
            description: "Siang",
        });
        prismaMock.wallet.findMany.mockResolvedValue([
            { id: "wallet-1", name: "Cash" },
        ]);

        const result = await processCommand(user, "3");

        expect(typeof result).toBe("string");
        expect(result).toContain("Pilihan tidak valid");
    });

    it("returns null when AI parser does not detect a valid command", async () => {
        vi.mocked(parseTransactionText).mockResolvedValue({
            isValidCommand: false,
            actions: [],
        } as never);

        const result = await processCommand(user, "teks bebas yang bukan command");

        expect(result).toBeNull();
        expect(parseTransactionText).toHaveBeenCalledWith("teks bebas yang bukan command");
    });

    it("corrects typo 'kelaur' to 'keluar' via fuzzy matching", async () => {
        prismaMock.wallet.findMany.mockResolvedValue([]);
        prismaMock.wallet.findFirst.mockResolvedValue(null);
        prismaMock.category.findFirst.mockResolvedValue(null);
        prismaMock.category.create.mockResolvedValue({ id: "cat-1", name: "Jajan", type: "EXPENSE", userId: user.id });
        prismaMock.transaction.create.mockResolvedValue({ id: "tx-1" });
        prismaMock.botActionHistory.create.mockResolvedValue({ id: "history-1" });

        const result = await processCommand(user, "kelaur 15k kopi @jajan");

        // Should attempt to process as "keluar 15k kopi @jajan"
        // The exact result depends on wallet setup, but it should NOT be null (i.e., should not fall through to AI)
        expect(result).not.toBeNull();
    });

    it("corrects typo 'kluear' to 'keluar' via fuzzy matching", async () => {
        prismaMock.wallet.findMany.mockResolvedValue([]);
        prismaMock.wallet.findFirst.mockResolvedValue(null);
        prismaMock.category.findFirst.mockResolvedValue(null);
        prismaMock.category.create.mockResolvedValue({ id: "cat-1", name: "Makan", type: "EXPENSE", userId: user.id });
        prismaMock.transaction.create.mockResolvedValue({ id: "tx-2" });
        prismaMock.botActionHistory.create.mockResolvedValue({ id: "history-2" });

        const result = await processCommand(user, "kluear 20k nasi @makan");

        // Should auto-correct and process as "keluar 20k nasi @makan"
        expect(result).not.toBeNull();
        // Should NOT have called AI fallback since typo was corrected
        expect(parseTransactionText).not.toHaveBeenCalled();
    });

    it("returns FAQ answer for 'kamu bisa apa'", async () => {
        const result = await processCommand(user, "kamu bisa apa");

        expect(typeof result).toBe("string");
        expect(result as string).toContain("Transaksi");
        // Should NOT call AI since FAQ matched
        expect(parseTransactionText).not.toHaveBeenCalled();
    });

    it("returns FAQ answer for question about saldo", async () => {
        const result = await processCommand(user, "cara cek saldo");

        expect(typeof result).toBe("string");
        expect(result as string).toContain("cek saldo");
        expect(parseTransactionText).not.toHaveBeenCalled();
    });

    it("returns FAQ answer explaining saldo awal is not real transfer", async () => {
        const result = await processCommand(user, "apa itu saldo awal");

        expect(typeof result).toBe("string");
        expect(result as string).toContain("BUKAN");
        expect(parseTransactionText).not.toHaveBeenCalled();
    });

    it("returns FAQ answer for question about amount suffixes", async () => {
        const result = await processCommand(user, "singkatan angka");

        expect(typeof result).toBe("string");
        expect(result as string).toContain("ribu");
        expect(result as string).toContain("juta");
        expect(parseTransactionText).not.toHaveBeenCalled();
    });
});

