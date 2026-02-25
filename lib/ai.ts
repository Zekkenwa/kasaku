import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const botActionItemSchema = {
    type: Type.OBJECT,
    properties: {
        intent: {
            type: Type.STRING,
            enum: [
                "CREATE_TRANSACTION",
                "CREATE_CATEGORY",
                "CREATE_DEBT",
                "PAY_DEBT",
                "TRANSFER",
                "CREATE_GOAL",
                "FUND_GOAL",
                "CREATE_RECURRING",
                "SET_BUDGET",
                "DELETE_CATEGORY"
            ],
            description: "The intended action the user wants to take.",
        },
        type: {
            type: Type.STRING,
            enum: ["INCOME", "EXPENSE"],
            description: "Used for Transactions, Categories, or Routines to specify Income or Expense.",
        },
        amount: {
            type: Type.INTEGER,
            description: "The monetary amount involved, if any.",
        },
        categoryName: {
            type: Type.STRING,
            description: "The category name. Keep it short (1-2 words).",
        },
        targetName: {
            type: Type.STRING,
            description: "The target name for Debts (person), Goals (goal name), or Transfers (wallet name).",
        },
        fromWallet: {
            type: Type.STRING,
            description: "The source wallet name for transfers.",
        },
        note: {
            type: Type.STRING,
            description: "Extra context or description.",
        },
        date: {
            type: Type.STRING,
            description: "ISO 8601 date, if past time specified.",
        },
        interval: {
            type: Type.STRING,
            enum: ["DAILY", "WEEKLY", "MONTHLY"],
            description: "The frequency for recurring actions.",
        },
    },
    required: ["intent"]
};

const botActionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        isValidCommand: {
            type: Type.BOOLEAN,
            description: "True if the user is giving a bot command. False if just chatting.",
        },
        actions: {
            type: Type.ARRAY,
            items: botActionItemSchema,
            description: "An array of identified bot actions.",
        }
    },
    required: ["isValidCommand"]
};

export type ParsedBotActionItem = {
    intent: 'CREATE_TRANSACTION' | 'CREATE_CATEGORY' | 'CREATE_DEBT' | 'PAY_DEBT' | 'TRANSFER' | 'CREATE_GOAL' | 'FUND_GOAL' | 'CREATE_RECURRING' | 'SET_BUDGET' | 'DELETE_CATEGORY';
    type?: 'INCOME' | 'EXPENSE';
    amount?: number;
    categoryName?: string;
    targetName?: string;
    fromWallet?: string;
    note?: string;
    date?: string;
    interval?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
};

export type ParsedBotActionResult = {
    isValidCommand: boolean;
    actions?: ParsedBotActionItem[];
};

export async function parseTransactionText(text: string): Promise<ParsedBotActionResult | null> {
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
                systemInstruction: `You are the core AI parser for the Kasaku personal finance WhatsApp bot.
          Your job is to read Indonesian natural language and extract ALL intents into an array of actions.
          Current local time: ${today}
          
          Intents & Rules:
          - CREATE_TRANSACTION: Spending money (EXPENSE) or getting money (INCOME). Include amount, type, categoryName, note, and date (if past).
          - CREATE_CATEGORY: User explicitly asks to make a new category. Provide categoryName and type.
          - CREATE_DEBT: Loaning money to someone (piutang / RECEIVABLE / type: EXPENSE context) or borrowing from someone (hutang / PAYABLE / type: INCOME context). targetName is the person. amount required.
          - PAY_DEBT: Paying off a debt / someone paying you back. targetName is the person. amount required.
          - TRANSFER: Moving money between accounts. amount, fromWallet, targetName (to wallet) required.
          - CREATE_GOAL: Setting a new savings goal. targetName is goal name, amount is the target targetAmount.
          - FUND_GOAL: Adding money to a goal. targetName is goal name, amount required.
          - CREATE_RECURRING: Setting up a routine transaction. targetName is routine name, amount, type, and interval (DAILY/WEEKLY/MONTHLY) required.
          - SET_BUDGET: Setting a budget limit. amount, categoryName required.
          - DELETE_CATEGORY: Removing a category. categoryName, type required.
          
          General Rules:
          1. Extract exact amounts in Indonesian Rupiah (calculate 10k+2k if needed).
          2. Parse context intelligently. "Bikin kategori pengeluaran konser" -> CREATE_CATEGORY, type: EXPENSE, categoryName: Konser.
          3. Calculate ISO 8601 dates for words like "kemaren", "2 hari lalu". Default to null if today.`,
                responseMimeType: 'application/json',
                responseSchema: botActionSchema,
                temperature: 0.1,
            }
        });

        const output = response.text;
        if (!output) return null;

        return JSON.parse(output) as ParsedBotActionResult;
    } catch (error) {
        console.error("AI Parsing Error:", error);
        return null;
    }
}
