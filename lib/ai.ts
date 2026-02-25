import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const transactionItemSchema = {
    type: Type.OBJECT,
    properties: {
        type: {
            type: Type.STRING,
            enum: ["INCOME", "EXPENSE"],
            description: "Whether this is money coming in (INCOME) or money going out (EXPENSE).",
        },
        amount: {
            type: Type.INTEGER,
            description: "The absolute monetary amount of the transaction. E.g. '50k' -> 50000, 'sepuluh ribu' -> 10000. If math is used like 10k+20k, calculate the sum if they are for the same category, or separate them into multiple items if they are different.",
        },
        categoryName: {
            type: Type.STRING,
            description: "A short, 1-2 word category for this transaction. E.g., 'Makan', 'Transport', 'Gaji', 'Jajan', 'Listrik'. Capitalize the first letter.",
        },
        note: {
            type: Type.STRING,
            description: "A short description of what the transaction was for. Extract this from the user's sentence. Leave empty if none provided.",
        },
        date: {
            type: Type.STRING,
            description: "ISO 8601 string of the transaction date if the user mentions a specific time in the past (like 'kemaren' or 'tgl 23 feb lalu'). If they don't mention a time, leave this null or omitted.",
        }
    },
    required: ["type", "amount"]
};

const transactionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isTransaction: {
            type: Type.BOOLEAN,
            description: "True if the user is trying to record financial transactions. False if they are just chatting or asking a general question.",
        },
        transactions: {
            type: Type.ARRAY,
            items: transactionItemSchema,
            description: "An array of the identified transactions.",
        }
    },
    required: ["isTransaction"]
};

export type ParsedTransactionItem = {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    categoryName?: string;
    note?: string;
    date?: string;
};

export type ParsedTransactionResult = {
    isTransaction: boolean;
    transactions?: ParsedTransactionItem[];
};

export async function parseTransactionText(text: string): Promise<ParsedTransactionResult | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not set. Skipping AI parsing.");
        return null;
    }

    try {
        const today = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: text,
            config: {
                systemInstruction: `You are a helpful personal finance assistant for the Kasaku app. 
          Your job is to read Indonesian natural language sentences and extract an array of transaction details.
          Current local time: ${today}
          
          Guidelines:
          1. If the sentence implies spending money (e.g., 'beli', 'bayar', 'keluar', 'jajan', 'abis'), it's an EXPENSE.
          2. If receiving money (e.g., 'dapet', 'masuk', 'gaji', 'dikasih'), it's an INCOME.
          3. Extract exact amounts in Indonesian Rupiah. Evaluate simple math like "10k+30k" if they belong to the same category.
          4. If the user lists multiple distinct items (e.g., "10k es krim, 30k bensin"), extract multiple transaction objects into the array.
          5. If the user mentions past dates ("kemaren", "tgl 23 feb"), calculate or assign the IS0 8601 string to the date field. Otherwise leave it null.
          6. Guess short, unified category names (e.g. 'Makan', 'Bensin', 'Belanja', 'Kebutuhan').
          7. Extract extra context as the note.`,
                responseMimeType: 'application/json',
                responseSchema: transactionSchema,
                temperature: 0.1, // Keep it deterministic
            }
        });

        const output = response.text;
        if (!output) return null;

        return JSON.parse(output) as ParsedTransactionResult;
    } catch (error) {
        console.error("AI Parsing Error:", error);
        return null;
    }
}
