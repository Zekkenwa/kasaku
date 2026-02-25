export type TransactionType = "INCOME" | "EXPENSE";
export type LoanStatus = "ONGOING" | "PAID";
export type LoanType = "PAYABLE" | "RECEIVABLE";
export type WalletType = "CASH" | "BANK" | "EWALLET";

export interface Transaction {
    id: string;
    type: TransactionType;
    category: string;
    amount: number;
    note?: string;
    date: string;
    walletId?: string;
    walletName?: string;
}

export interface LoanPayment {
    id: string;
    amount: number;
    date: string;
    note?: string;
}

export interface Loan {
    id: string;
    name: string;
    amount: number;
    remaining: number;
    createdAt: string;
    dueDate?: string;
    status: LoanStatus;
    type: LoanType;
    payments: LoanPayment[];
}

export interface Budget {
    id: string;
    categoryId: string;
    categoryName: string;
    limitAmount: number;
    period?: string;
}

export interface Wallet {
    id: string;
    name: string;
    type: WalletType;
    initialBalance: number;
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    notes?: string;
}

export interface Engagement {
    id: string;
    currentStreak: number;
    highestStreak: number;
    freezeDays: number;
    healthScore: number;
    lastLogDate: string | null;
}

export interface Badge {
    id: string;
    code: string;
    name: string;
    description: string;
    progress: number;
    maxProgress: number;
    isUnlocked: boolean;
    level: number;
    earnedAt: string;
}
