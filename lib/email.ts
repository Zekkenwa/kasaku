import nodemailer from 'nodemailer';

/**
 * Sends an OTP email using Gmail SMTP.
 * Requires EMAIL_USER (Gmail address) and EMAIL_PASS (App Password) in .env.
 */
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        console.error("[EMAIL ERROR] EMAIL_USER or EMAIL_PASS not found in environment variables");
        return false;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass,
        },
    });

    const mailOptions = {
        from: `"Kasaku App" <${user}>`,
        to: email,
        subject: '🔐 Kode Keamanan Kasaku',
        text: `Halo!\n\nKode OTP Anda adalah: ${otp}\n\nJangan berikan kode ini kepada siapa pun. Kode ini akan kedaluwarsa dalam 5 menit.\n\nTerima kasih,\nTim Kasaku`,
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
                <h2 style="color: #1e293b; text-align: center;">🔐 Kode Keamanan</h2>
                <p style="color: #64748b; font-size: 16px; text-align: center;">Halo! Gunakan kode di bawah ini untuk masuk ke akun Kasaku Anda:</p>
                <div style="background: #ffffff; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px solid #cbd5e1;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #e11d48;">${otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 14px; text-align: center;">Jangan berikan kode ini kepada siapa pun. Kode ini akan kedaluwarsa dalam <b>5 menit</b>.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                <p style="color: #cbd5e1; font-size: 12px; text-align: center;">Terima kasih telah menggunakan Kasaku.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error("[EMAIL ERROR] Failed to send email:", error);
        return false;
    }
}
