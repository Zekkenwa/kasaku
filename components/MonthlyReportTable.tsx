"use client";

import { useMemo } from "react";

type Transaction = {
    id: string;
    type: "INCOME" | "EXPENSE";
    category: string;
    amount: number;
    note?: string;
    date: string;
};

type Budget = {
    categoryId: string;
    categoryName: string;
    limitAmount: number;
};

type Goal = {
    id: string;
    title: string;
    targetAmount: number;
    savedAmount: number;
    deadline?: string; // ISO String
};

type Props = {
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    currentMonth: number;
    currentYear: number;
};

const currency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

export default function MonthlyReportTable({
    transactions,
    budgets,
    goals,
    currentMonth,
    currentYear,
}: Props) {
    // Filter transactions for the selected month/year
    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            const d = new Date(t.date); // Provided date is YYYY-MM-DD string
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, currentMonth, currentYear]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce(
            (acc, t) => {
                if (t.type === "INCOME") acc.income += t.amount;
                else acc.expense += t.amount;
                return acc;
            },
            { income: 0, expense: 0 }
        );
    }, [filteredTransactions]);

    // Calculate Budget usage
    const budgetStatus = useMemo(() => {
        const usage: Record<string, number> = {};
        filteredTransactions
            .filter((t) => t.type === "EXPENSE")
            .forEach((t) => {
                usage[t.category] = (usage[t.category] || 0) + t.amount;
            });

        return budgets.map((b) => {
            const used = usage[b.categoryName] || 0;
            const remaining = b.limitAmount - used;
            const isOver = used > b.limitAmount;
            return {
                ...b,
                used,
                remaining,
                isOver,
            };
        });
    }, [filteredTransactions, budgets]);

    // Check Goals Reached this month
    const reachedGoals = useMemo(() => {
        return goals.filter((g) => {
            const isCompleted = g.savedAmount >= g.targetAmount;
            // We ideally want to know WHEN it was completed, but for now we show if it's completed
            // and asking user to mark it "done" effectively by deleting it next month or archiving.
            // The user requirement: "muncul di bulan tsb pas dia tercapai 100%, next month targetnya dihapus dari laporan"
            // Since we don't have historical goal states, we will just show completed goals.
            return isCompleted;
        });
    }, [goals]);

    return (
        <div className="space-y-8 bg-white dark:bg-gray-800 card-fix p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white dark:text-white">Laporan Bulanan</h2>
                <div className="text-right">
                    <span className="block text-sm text-gray-600 dark:text-gray-400">Periode</span>
                    <span className="font-medium text-white dark:text-gray-200">{new Date(currentYear, currentMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {/* 1. Transaction Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-white dark:text-gray-200 font-semibold border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="py-3 px-4">No</th>
                            <th className="py-3 px-4">Tanggal</th>
                            <th className="py-3 px-4">Kategori</th>
                            <th className="py-3 px-4 text-right">Pengeluaran</th>
                            <th className="py-3 px-4 text-right">Pemasukan</th>
                            <th className="py-3 px-4">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredTransactions.map((t, idx) => (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <td className="py-2 px-4 text-gray-700 dark:text-gray-400">{idx + 1}</td>
                                <td className="py-2 px-4 text-white dark:text-gray-200">{t.date}</td>
                                <td className="py-2 px-4">
                                    <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-white dark:text-gray-300">
                                        {t.category}
                                    </span>
                                </td>
                                <td className="py-2 px-4 text-right text-red-600 dark:text-red-400">
                                    {t.type === "EXPENSE" ? currency(t.amount) : "-"}
                                </td>
                                <td className="py-2 px-4 text-right text-green-600 dark:text-green-400">
                                    {t.type === "INCOME" ? currency(t.amount) : "-"}
                                </td>
                                <td className="py-2 px-4 text-white dark:text-gray-400 italic">
                                    {t.note || "-"}
                                </td>
                            </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-400 italic">Tidak ada transaksi bulan ini</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 font-bold bg-gray-50 dark:bg-gray-700 text-white dark:text-white">
                        <tr>
                            <td colSpan={3} className="py-3 px-4 text-right">TOTAL</td>
                            <td className="py-3 px-4 text-right text-red-700 dark:text-red-400">{currency(totals.expense)}</td>
                            <td className="py-3 px-4 text-right text-green-700 dark:text-green-400">{currency(totals.income)}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td colSpan={3} className="py-3 px-4 text-right">SELISIH (Sisa)</td>
                            <td colSpan={2} className={`py-3 px-4 text-center ${totals.income - totals.expense >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                {currency(totals.income - totals.expense)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* 2. Budget Report */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-white dark:text-white border-b dark:border-gray-700 pb-2">Status Budget</h3>
                    <div className="space-y-3">
                        {budgetStatus.map((b) => (
                            <div key={b.categoryId} className="flex justify-between items-center text-sm p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                <div>
                                    <p className="font-medium capitalize text-white dark:text-gray-200">{b.categoryName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Limit: {currency(b.limitAmount)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${b.isOver ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                                        {b.isOver ? "Over Budget" : "Aman"}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {b.isOver ? (
                                            <span>Lebih: {currency(Math.abs(b.remaining))}</span>
                                        ) : (
                                            <span>Sisa: {currency(b.remaining)}</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {budgetStatus.length === 0 && <p className="text-gray-500 text-sm italic">Belum ada budget yang diatur.</p>}
                    </div>
                </div>

                {/* 3. Goal Milestones */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-white dark:text-white border-b dark:border-gray-700 pb-2">Target Tercapai 🎉</h3>
                    <div className="space-y-3">
                        {reachedGoals.map(g => (
                            <div key={g.id} className="bg-brand-yellow/20 border border-brand-yellow p-4 rounded-lg flex items-center gap-3">
                                <div className="text-2xl">🏆</div>
                                <div>
                                    <p className="font-bold text-white dark:text-white">{g.title}</p>
                                    <p className="text-sm text-gray-700 dark:text-white">Tercapai 100%! ({currency(g.savedAmount)})</p>
                                </div>
                            </div>
                        ))}
                        {reachedGoals.length === 0 && (
                            <p className="text-gray-500 text-sm italic border-dashed border dark:border-gray-700 p-4 rounded text-center">
                                Belum ada target keuangan yang tercapai penuh bulan ini. Semangat!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
