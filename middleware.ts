import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const token = await getToken({ req });
    const isAuthenticated = !!token;
    const isOnboarding = req.nextUrl.pathname === "/onboarding";
    const isAuthPage = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register";

    // 1. Unauthenticated users trying to access protected routes
    if (!isAuthenticated && !isAuthPage) {
        // If trying to access protected pages -> Redirect to Login
        if (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/account") || isOnboarding) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    // 2. Authenticated users
    if (isAuthenticated) {
        const hasPhone = !!token.phone;

        // If trying to access Auth pages (Login/Register) -> Redirect to Dashboard
        if (isAuthPage) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // If User has NO phone (needs onboarding)
        if (!hasPhone) {
            // Allow access to onboarding
            if (isOnboarding) return NextResponse.next();

            // Redirect everything else to onboarding
            return NextResponse.redirect(new URL("/onboarding", req.url));
        }

        // If User HAS phone (already onboarded)
        if (hasPhone) {
            // If trying to access onboarding -> Redirect to Dashboard
            if (isOnboarding) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/account/:path*",
        "/onboarding",
        "/login",
        "/register"
    ],
};
