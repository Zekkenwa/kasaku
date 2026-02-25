import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || process.env.DELETE_USER_EMAIL;
    const phone = process.argv[3] || process.env.DELETE_USER_PHONE;

    if (!email && !phone) {
        console.error('Usage: npx tsx scripts/delete-user.ts <email> [phone]');
        console.error('Or set DELETE_USER_EMAIL / DELETE_USER_PHONE environment variables.');
        process.exit(1);
    }

    console.log(`Deleting user ${email ? `with email: ${email}` : ''}${phone ? ` with phone: ${phone}` : ''}...`);

    try {
        const user = email
            ? await prisma.user.findUnique({ where: { email } })
            : null;

        if (!user) {
            console.log('User not found by email.');
            // Try finding by phone just in case email was different
            const userByPhone = phone
                ? await prisma.user.findFirst({ where: { phone } })
                : null;

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
