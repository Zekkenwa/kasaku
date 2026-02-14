import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            phone: string | null;
            hasPassword: boolean;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        phone: string | null;
        passwordHash: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        phone: string | null;
        hasPassword: boolean;
    }
}
