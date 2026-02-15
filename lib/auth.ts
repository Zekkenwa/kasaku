import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { encode } from "next-auth/jwt";
import { generateBlindIndex } from "./encryption";

export const authOptions: NextAuthOptions = {
  // Use any to bypass Prisma extension type mismatch with next-auth adapter
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        // 1. Phone + OTP Login
        if (credentials?.phone && credentials?.otp) {
          const phone = credentials.phone.replace(/\D/g, "");
          const phoneHash = generateBlindIndex(phone);
          const user = await prisma.user.findFirst({ where: { phoneHash } });

          // Allow basic match
          if (!user || user.otpCode !== credentials.otp) return null;

          // Check Expiry
          if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new Error("OTP Kadaluarsa");
          }

          // Clear OTP
          await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiresAt: null }
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            phone: user.phone,
            passwordHash: user.passwordHash,
          };
        }

        // 2. Email/Phone + Password Login
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const identifier = credentials.email;
        const user = await prisma.user.findUnique({ where: { email: identifier } });
        if (!user || !user.passwordHash) return null;
        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone,
          passwordHash: user.passwordHash,
        };
      }
    })
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {

        // 1. Conflict Detection
        if (profile?.email && user.email !== profile.email) {
          const conflictingUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });

          if (conflictingUser) {
            const secret = process.env.NEXTAUTH_SECRET || "secret";
            const conflictToken = await encode({
              token: {
                googleId: account.providerAccountId,
                googleEmail: profile.email,
                conflictUserId: conflictingUser.id,
                targetUserId: user.id,
              } as any,
              secret,
            });
            return `/account/link-conflict?token=${conflictToken}`;
          }
        }

        // 2. Metadata Update (Only on matching email)
        if (!profile?.email || profile.email === user.email) {
          const dbUser = user as any;
          const profileName = profile?.name;
          const profileImage = (profile as any)?.picture;

          const shouldUpdate =
            dbUser.deleteRequestedAt ||
            dbUser.deleteScheduledAt ||
            (profileName && dbUser.name !== profileName) ||
            (profileImage && dbUser.image !== profileImage);

          if (shouldUpdate) {
            await prisma.user.update({
              where: { email: user.email },
              data: {
                deleteRequestedAt: null,
                deleteScheduledAt: null,
                name: profileName || user.name,
                image: profileImage || user.image,
              },
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone;
        token.hasPassword = !!(user as any).passwordHash;
      }
      if (trigger === "update" && session) {
        if (session.phone !== undefined) token.phone = session.phone;
        if (session.hasPassword !== undefined) token.hasPassword = session.hasPassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string | null;
        session.user.hasPassword = token.hasPassword as boolean;
      }
      return session;
    }
  },
};
