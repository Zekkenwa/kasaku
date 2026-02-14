import { PrismaClient } from '@prisma/client';
import { AuthenticationCreds, AuthenticationState, BufferJSON, initAuthCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';

/**
 * Stores Baileys authentication state in a Prisma database.
 * Compatible with Supabase/PostgreSQL.
 */
export const usePrismaAuthState = async (prisma: PrismaClient) => {
    const writeData = async (data: any, key: string) => {
        try {
            await prisma.whatsAppAuth.upsert({
                where: { key },
                update: { value: JSON.stringify(data, BufferJSON.replacer) },
                create: { key, value: JSON.stringify(data, BufferJSON.replacer) }
            });
        } catch (error) {
            console.error('Error writing auth data', error);
        }
    };

    const readData = async (key: string) => {
        try {
            const data = await prisma.whatsAppAuth.findUnique({ where: { key } });
            if (data) {
                return JSON.parse(data.value, BufferJSON.reviver);
            }
        } catch (error) {
            console.error('Error reading auth data', error);
        }
        return null;
    };

    const removeData = async (key: string) => {
        try {
            await prisma.whatsAppAuth.delete({ where: { key } });
        } catch (error) {
            // Ignore delete errors (e.g. record not found)
        }
    };

    const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type: string, ids: string[]) => {
                    const data: any = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = value;
                        }
                        if (value) {
                            data[id] = value;
                        }
                    }));
                    return data;
                },
                set: async (data: any) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        } as AuthenticationState,
        saveCreds: () => writeData(creds, 'creds')
    };
};
