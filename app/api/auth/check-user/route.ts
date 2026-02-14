
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { identifier } = await req.json();

        if (!identifier) {
            return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
        }

        let user = null;
        let isPhone = false;

        // Simple heuristic: If it contains '@', treat as email. Otherwise, treat as phone.
        if (identifier.includes('@')) {
            user = await prisma.user.findUnique({
                where: { email: identifier },
            });
        } else {
            isPhone = true;
            // Sanitize phone (remove non-digits)
            const cleanPhone = identifier.replace(/\D/g, "");
            user = await prisma.user.findFirst({
                where: { phone: cleanPhone },
            });
        }

        return NextResponse.json({
            exists: !!user,
            provider: isPhone ? 'phone' : 'email'
        });

    } catch (error) {
        console.error("Check User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
