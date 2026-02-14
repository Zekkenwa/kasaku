
export async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "http://localhost:3001";

    try {
        const res = await fetch(`${WHATSAPP_API_URL}/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp }),
        });

        if (!res.ok) {
            console.error("WhatsApp Server Error:", await res.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error("Failed to connect to WhatsApp Server:", error);
        // Fallback for dev/demo if server isn't running
        console.log(`[Fallback] OTP for ${phone}: ${otp}`);
        return true;
    }
}
