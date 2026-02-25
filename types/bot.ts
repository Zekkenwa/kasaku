export interface BotUser {
    id: string;
    name: string | null;
    phone?: string | null;
    email?: string | null;
}

export interface BotCommandResult {
    title: string;
    amount?: number;
    category?: string;
    note: string;
    date: Date;
    transactionId?: string;
}

export type ProcessCommandResult = string | BotCommandResult | null;
