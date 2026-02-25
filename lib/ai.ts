import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const transactionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isTransaction: {
            type: Type.BOOLEAN,
            description: "True if the user is trying to record a financial transaction (income or expense). False if they are just chatting or asking a general question.",
        },
        type: {
            type: Type.STRING,
            enum: ["INCOME", "EXPENSE"],
            description: "Whether this is money coming in (INCOME) or money going out (EXPENSE).",
        },
        amount: {
            type: Type.INTEGER,
            description: "The absolute monetary amount of the transaction. E.g. '50k' -> 50000, 'sepuluh ribu' -> 10000.",
        },
        categoryName: {
            type: Type.STRING,
            description: "A short, 1-2 word category for this transaction. E.g., 'Makan', 'Transport', 'Gaji', 'Jajan'. Capitalize the first letter.",
        },
        note: {
            type: Type.STRING,
            description: "A short description of what the transaction was for. Extract this from the user's sentence. Leave empty if none provided.",
        }
    },
    required: ["isTransaction"]
};

export type ParsedTransaction = {
    isTransaction: boolean;
    type?: 'INCOME' | 'EXPENSE';
    amount?: number;
    categoryName?: string;
    note?: string;
};

export async function parseTransactionText(text: string): Promise<ParsedTransaction | null> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not set. Skipping AI parsing.");
        return null;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: text,
            config: {
                systemInstruction: `You are a helpful personal finance assistant for the Kasaku app. 
          Your job is to read Indonesian natural language sentences and extract transaction details.
          If the sentence implies spending money (e.g., 'beli', 'bayar', 'keluar', 'jajan', 'abis'), it's an EXPENSE.
          If the sentence implies receiving money (e.g., 'dapet', 'masuk', 'gaji', 'dikasih'), it's an INCOME.
          Extract the exact amount in Indonesian Rupiah (convert words/k/jt to numbers).
          Guess a short, appropriate category name (e.g. 'Makan', 'Bensin', 'Belanja', 'Gaji').
          Extract any remaining context as the note.`,
                responseMimeType: 'application/json',
                responseSchema: transactionSchema,
                temperature: 0.1, // Keep it deterministic
            }
        });

        const output = response.text;
        if (!output) return null;

        return JSON.parse(output) as ParsedTransaction;
    } catch (error) {
        console.error("AI Parsing Error:", error);
        return null;
    }
}
