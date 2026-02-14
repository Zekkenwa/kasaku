import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        // Check if phone exists (and verified)
        // In our schema, 'phone' is the verified phone column. 'tempPhone' is unverified.
        // We only block if it's already a verified phone for someone else.
        const user = await prisma.user.findFirst({
            where: { phone },
        });

        return NextResponse.json({ exists: !!user });
    } catch (error) {
        console.error("Check Phone Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
