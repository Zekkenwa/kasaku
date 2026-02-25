import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    if (session.user.id) return session.user.id;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    return user?.id ?? null;
}

export function withAuth(
    handler: (req: Request, userId: string) => Promise<NextResponse>
) {
    return async (req: Request) => {
        try {
            const userId = await getAuthenticatedUserId();

            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            return await handler(req, userId);
        } catch (error) {
            console.error("API Error:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    };
}
