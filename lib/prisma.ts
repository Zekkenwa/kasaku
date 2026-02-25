/**
 * Prisma Client singleton with automatic field-level encryption.
 *
 * Extends PrismaClient with middleware that:
 * - Encrypts `access_token`, `refresh_token` (Account) on writes
 * - Encrypts `phone`, `tempPhone` (User) on writes and generates `phoneHash` blind index
 * - Decrypts all encrypted fields transparently on reads
 *
 * @module prisma
 */
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, generateBlindIndex } from "./encryption";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
let url = process.env.DATABASE_URL;

// Append connection pool limits if not already configured in DATABASE_URL
if (url && !url.includes('connection_limit')) {
  const defaultLimit = process.env.PRISMA_CONNECTION_LIMIT || '15';
  url += (url.includes('?') ? '&' : '?') + `connection_limit=${defaultLimit}&pool_timeout=30`;
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: url
      }
    }
  });

export const prisma = basePrisma.$extends({
  query: {
    account: {
      async $allOperations({ operation, args, query }) {
        // --- 1. ENCRYPTION (Writes) ---
        if (["create", "update", "upsert", "createMany"].includes(operation)) {
          const encryptToken = (token: string | null | undefined) => {
            if (!token || token.includes(":")) return token;
            return encrypt(token);
          };

          if (operation === "create" || operation === "update") {
            const data = (args as any).data;
            if (data) {
              if (data.access_token) data.access_token = encryptToken(data.access_token);
              if (data.refresh_token) data.refresh_token = encryptToken(data.refresh_token);
            }
          } else if (operation === "upsert") {
            const create = (args as any).create;
            const update = (args as any).update;
            if (create) {
              if (create.access_token) create.access_token = encryptToken(create.access_token);
              if (create.refresh_token) create.refresh_token = encryptToken(create.refresh_token);
            }
            if (update) {
              if (update.access_token) update.access_token = encryptToken(update.access_token);
              if (update.refresh_token) update.refresh_token = encryptToken(update.refresh_token);
            }
          }
        }

        const result = await query(args);

        // --- 2. DECRYPTION (Reads) ---
        if (result && (operation.startsWith("find") || operation === "update" || operation === "create")) {
          const decryptToken = (token: string | null | undefined) => {
            if (!token) return token;
            try { return decrypt(token); } catch (e) { return token; }
          };

          const decryptAccount = (account: any) => {
            if (account) {
              if (account.access_token) account.access_token = decryptToken(account.access_token);
              if (account.refresh_token) account.refresh_token = decryptToken(account.refresh_token);
            }
            return account;
          };

          return Array.isArray(result) ? result.map(decryptAccount) : decryptAccount(result);
        }

        return result;
      }
    },
    user: {
      async $allOperations({ operation, args, query }) {
        // --- 1. ENCRYPTION & HASHING (Writes) ---
        if (["create", "update", "upsert", "createMany"].includes(operation)) {
          const encryptField = (val: string | null | undefined) => {
            if (!val || val.includes(":")) return val;
            return encrypt(val);
          };

          const processUserData = (data: any) => {
            if (data) {
              if (data.phone) {
                data.phoneHash = generateBlindIndex(data.phone);
                data.phone = encryptField(data.phone);
              }
              if (data.tempPhone) data.tempPhone = encryptField(data.tempPhone);
            }
          };

          if (operation === "create" || operation === "update") {
            processUserData((args as any).data);
          } else if (operation === "upsert") {
            processUserData((args as any).create);
            processUserData((args as any).update);
          }
        }

        const result = await query(args);

        // --- 2. DECRYPTION (Reads) ---
        if (result && (operation.startsWith("find") || operation === "update" || operation === "create")) {
          const decryptField = (val: string | null | undefined) => {
            if (!val) return val;
            try { return decrypt(val); } catch (e) { return val; }
          };

          const decryptUser = (user: any) => {
            if (user) {
              if (user.phone) user.phone = decryptField(user.phone);
              if (user.tempPhone) user.tempPhone = decryptField(user.tempPhone);
            }
            return user;
          };

          return Array.isArray(result) ? result.map(decryptUser) : decryptUser(result);
        }

        return result;
      }
    }
  }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
