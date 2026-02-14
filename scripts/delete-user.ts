import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'chalsinglalim@gmail.com';
    const phone = '6285173270427';

    console.log(`Deleting user with email: ${email} ...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log('User not found by email.');
            // Try finding by phone just in case email was different
            const userByPhone = await prisma.user.findFirst({
                where: { phone },
            });

            if (userByPhone) {
                console.log(`Found user by phone ${phone}. Deleting...`);
                await prisma.user.delete({ where: { id: userByPhone.id } });
                console.log('User deleted successfully.');
            } else {
                console.log('User not found by phone either.');
            }
            return;
        }

        await prisma.user.delete({
            where: { id: user.id },
        });

        console.log('User deleted successfully.');
    } catch (e) {
        console.error('Error deleting user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
