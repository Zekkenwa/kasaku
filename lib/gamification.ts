import { prisma } from "./prisma";

/** Badge definitions with code, display name, unlock threshold, and difficulty level. */
export const BADGE_DEFINITIONS = [
    { code: "STARTER", name: "The Starter", description: "First transaction ever.", maxProgress: 1, level: 1 },
    { code: "WEEK_WARRIOR", name: "Week Warrior", description: "7-day streak.", maxProgress: 7, level: 1 },
    { code: "HABIT_BUILDER", name: "Habit Builder", description: "30-day streak.", maxProgress: 30, level: 2 },
    { code: "UNSTOPPABLE", name: "Unstoppable", description: "100-day streak.", maxProgress: 100, level: 3 },
    { code: "SAVERS_CLUB", name: "Savers Club", description: "First Rp 100.000 saved.", maxProgress: 100000, level: 1 },
    { code: "MILLIONAIRE_MINDSET", name: "Millionaire Mindset", description: "First Rp 1.000.000 saved.", maxProgress: 1000000, level: 2 },
    { code: "WHALE", name: "Whale", description: "Balance reaches Rp 10.000.000.", maxProgress: 10000000, level: 3 },
    { code: "BUDGET_MASTER", name: "Budget Master", description: "Stay under budget for 1 category.", maxProgress: 1, level: 1 },
    { code: "BUDGET_GOD", name: "Budget God", description: "Stay under all budgets for 3 consecutive months.", maxProgress: 3, level: 3 },
    { code: "DEBT_FREE", name: "Debt Free", description: "Pay off all loans/debts.", maxProgress: 1, level: 2 },
    { code: "TRUSTWORTHY", name: "Trustworthy", description: "Lend money to a friend (Receivable).", maxProgress: 1, level: 1 },
    { code: "GOAL_SETTER", name: "Goal Setter", description: "Create your first Goal.", maxProgress: 1, level: 1 },
    { code: "GOAL_ACHIEVER", name: "Goal Achiever", description: "Reach 100% on a Goal.", maxProgress: 1, level: 2 },
    { code: "CONSISTENT_AUTOMATOR", name: "Consistent Automator", description: "Set up 1 Routine transaction.", maxProgress: 1, level: 1 },
    { code: "BIG_SPENDER", name: "Big Spender", description: "Spend > Rp 1.000.000 in a single expense.", maxProgress: 1000000, level: 2 },
    { code: "AI_WHISPERER", name: "AI Whisperer", description: "Use the WhatsApp AI for 10 transactions.", maxProgress: 10, level: 2 },
    { code: "GENEROUS", name: "Generous", description: "Transfer money 5 times.", maxProgress: 5, level: 1 },
    { code: "THE_PLANNER", name: "The Planner", description: "Create budgets for 3+ categories.", maxProgress: 3, level: 1 },
    { code: "RESILIENT", name: "Resilient", description: "Use a Freeze Day to save a streak.", maxProgress: 1, level: 2 },
    { code: "FINANCIAL_GURU", name: "Financial Guru", description: "Reach a Financial Health Score of 90+.", maxProgress: 90, level: 3 },
];

export interface GamificationResult {
    newStreak: number;
    newFreeze: number;
    healthScore: number;
    unlockedMessages: string[];
}

/**
 * Processes a gamification tick for a user: updates streaks, freeze days,
 * calculates financial health score, and evaluates badge progress.
 */
export async function processGamificationTick(userId: string): Promise<GamificationResult | null> {
    let engagement = await prisma.userEngagement.findUnique({ where: { userId } });
    if (!engagement) {
        engagement = await prisma.userEngagement.create({
            data: { userId, currentStreak: 1, highestStreak: 1, freezeDays: 7, lastLogDate: new Date() }
        });

        const unlockedMessages = await evaluateBadges(userId, { newStreak: 1, usedFreeze: false, score: 50, income: 0, expense: 0 });
        return { newStreak: 1, newFreeze: 7, healthScore: 50, unlockedMessages };
    } else {
        const now = new Date();
        const lastDate = engagement.lastLogDate || new Date(0);

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastLog = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

        const diffTime = Math.abs(today.getTime() - lastLog.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let newStreak = engagement.currentStreak;
        let newHighest = engagement.highestStreak;
        let newFreeze = engagement.freezeDays;
        let newLastLog = engagement.lastLogDate;
        let usedFreeze = false;

        const txToday = await prisma.transaction.findFirst({
            where: { userId, createdAt: { gte: today } }
        });

        if (txToday) {
            if (diffDays === 1) {
                newStreak += 1;
                newLastLog = now;
            } else if (diffDays > 1) {
                const missedDays = diffDays - 1;
                if (newFreeze >= missedDays) {
                    newFreeze -= missedDays;
                    newStreak += 1;
                    usedFreeze = true;
                    newLastLog = now;
                } else {
                    newStreak = 1;
                    newLastLog = now;
                }
            } else if (diffDays === 0 && !engagement.lastLogDate) {
                newStreak = 1;
                newLastLog = now;
            }

            if (newStreak > newHighest) newHighest = newStreak;

            if (diffDays >= 1 && newStreak % 7 === 0) {
                newFreeze = Math.min(30, newFreeze + 1);
            }
        }

        // Health Score: 30% Savings + 30% Budget + 20% Debt + 20% Goals
        let score = 50;

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const txs = await prisma.transaction.findMany({
            where: { userId, createdAt: { gte: startOfMonth } }
        });

        const income = txs.filter((t: any) => t.type === 'INCOME').reduce((sum: number, t: any) => sum + t.amount, 0);
        const expense = txs.filter((t: any) => t.type === 'EXPENSE').reduce((sum: number, t: any) => sum + t.amount, 0);

        // Savings Rate (+30 points max)
        if (income > 0) {
            const savingsRate = ((income - expense) / income) * 100;
            if (savingsRate > 20) score += 30;
            else if (savingsRate > 10) score += 15;
            else if (savingsRate < 0) score -= 10;
        }

        // Budget Adherence (+30 points max)
        const budgets = await prisma.budget.findMany({ where: { userId } });
        if (budgets.length > 0) {
            let overBudgetCount = 0;
            for (const b of budgets) {
                const spent = txs.filter((t: any) => t.categoryId === b.categoryId).reduce((s: number, t: any) => s + t.amount, 0);
                if (spent > b.limitAmount) overBudgetCount++;
            }
            if (overBudgetCount === 0) score += 30;
            else if ((overBudgetCount / budgets.length) >= 0.5) score -= 10;
        }

        // Debt Load (-15 penalty or +20 bonus)
        const loans = await prisma.loan.findMany({ where: { userId, status: 'ONGOING' } });
        let totalDebt = loans.filter((l: any) => l.type === 'PAYABLE').reduce((s: number, l: any) => s + l.amount, 0);
        if (totalDebt === 0) score += 20;
        else if (income > 0 && totalDebt > (income * 0.3)) score -= 15;

        // Goal Progress (+20 points)
        const goals = await prisma.goal.findMany({ where: { userId } });
        const fundedGoalsThisMonth = await prisma.botActionHistory.findFirst({
            where: { userId, action: 'FUND_GOAL', createdAt: { gte: startOfMonth } }
        });
        if (fundedGoalsThisMonth || goals.some((g: any) => g.currentAmount >= g.targetAmount)) {
            score += 20;
        }

        score = Math.max(0, Math.min(100, score)); // Clamp 0-100

        await prisma.userEngagement.update({
            where: { id: engagement.id },
            data: { currentStreak: newStreak, highestStreak: newHighest, freezeDays: newFreeze, lastLogDate: newLastLog, healthScore: score }
        });

        const unlockedMessages = await evaluateBadges(userId, { newStreak, usedFreeze, score, income, expense });

        return {
            newStreak,
            newFreeze,
            healthScore: score,
            unlockedMessages
        };
    }
}

/**
 * Evaluates all badge definitions against the user's current progress
 * and unlocks any newly achieved badges.
 */
async function evaluateBadges(userId: string, context: any): Promise<string[]> {
    const existingBadges = await prisma.badge.findMany({ where: { userId } });
    const badgeMap = new Map<string, any>(existingBadges.map((b: any) => [b.code, b]));

    const unlockedMessages: string[] = [];

    const checkBadge = async (code: string, currentProgress: number) => {
        const def = BADGE_DEFINITIONS.find(d => d.code === code);
        if (!def) return;

        const existing = badgeMap.get(code);
        const isUnlocked = currentProgress >= def.maxProgress;

        if (existing) {
            if (!existing.isUnlocked && isUnlocked) {
                await prisma.badge.update({ where: { id: existing.id }, data: { isUnlocked: true, progress: def.maxProgress } });
                unlockedMessages.push(`🏅 Badge Unlocked! ${def.name}`);
            } else if (!existing.isUnlocked) {
                await prisma.badge.update({ where: { id: existing.id }, data: { progress: currentProgress } });
            }
        } else {
            await prisma.badge.create({
                data: { userId, code, name: def.name, description: def.description, maxProgress: def.maxProgress, progress: isUnlocked ? def.maxProgress : currentProgress, isUnlocked, level: def.level }
            });
            if (isUnlocked) unlockedMessages.push(`🏅 Badge Unlocked! ${def.name}`);
        }
    };

    // 1. STARTER
    const txCount = await prisma.transaction.count({ where: { userId } });
    await checkBadge('STARTER', txCount > 0 ? 1 : 0);

    // 2-4. STREAKS
    await checkBadge('WEEK_WARRIOR', context.newStreak);
    await checkBadge('HABIT_BUILDER', context.newStreak);
    await checkBadge('UNSTOPPABLE', context.newStreak);

    // Wealth badges: net lifetime savings
    const lifetimeIncome = await prisma.transaction.aggregate({ where: { userId, type: 'INCOME' }, _sum: { amount: true } });
    const lifetimeExpense = await prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE' }, _sum: { amount: true } });
    const netWealth = (lifetimeIncome._sum.amount || 0) - (lifetimeExpense._sum.amount || 0);
    await checkBadge('SAVERS_CLUB', netWealth);
    await checkBadge('MILLIONAIRE_MINDSET', netWealth);
    await checkBadge('WHALE', netWealth);

    // Budget badges
    const budgetCount = await prisma.budget.count({ where: { userId } });
    await checkBadge('BUDGET_MASTER', budgetCount > 0 ? 1 : 0);
    await checkBadge('BUDGET_GOD', budgetCount >= 3 ? 3 : budgetCount);
    await checkBadge('THE_PLANNER', budgetCount);

    // Debt & trust badges
    const receivableCount = await prisma.loan.count({ where: { userId, type: 'RECEIVABLE' } });
    await checkBadge('TRUSTWORTHY', receivableCount);

    const payableCount = await prisma.loan.count({ where: { userId, type: 'PAYABLE', status: 'ONGOING' } });
    await checkBadge('DEBT_FREE', (payableCount === 0 && txCount > 0) ? 1 : 0);

    // Goal badges
    const goalCount = await prisma.goal.count({ where: { userId } });
    await checkBadge('GOAL_SETTER', goalCount);
    const achievedGoal = await prisma.goal.findFirst({ where: { userId, currentAmount: { gte: 1 } } });
    const allGoals = await prisma.goal.findMany({ where: { userId } });
    const hasAchievedGoal = allGoals.some((g: any) => g.currentAmount >= g.targetAmount);
    await checkBadge('GOAL_ACHIEVER', hasAchievedGoal ? 1 : 0);

    // Routine badge
    const routineCount = await prisma.recurringTransaction.count({ where: { userId } });
    await checkBadge('CONSISTENT_AUTOMATOR', routineCount);

    // Generosity badge
    const generousTxs = await prisma.transaction.count({ where: { userId, type: 'EXPENSE', category: { name: { contains: 'Transfer', mode: 'insensitive' } } } });
    await checkBadge('GENEROUS', generousTxs);

    // Resilience badge
    if (context.usedFreeze) await checkBadge('RESILIENT', 1);

    // Financial Guru badge
    await checkBadge('FINANCIAL_GURU', context.score);

    // AI usage badge
    const aiTx = await prisma.botActionHistory.count({ where: { userId, action: 'CREATE_TRANSACTIONS' } });
    await checkBadge('AI_WHISPERER', aiTx);

    // Big Spender badge
    const maxTx = await prisma.transaction.findFirst({ where: { userId, type: 'EXPENSE' }, orderBy: { amount: 'desc' } });
    await checkBadge('BIG_SPENDER', maxTx ? maxTx.amount : 0);

    return unlockedMessages;
}
