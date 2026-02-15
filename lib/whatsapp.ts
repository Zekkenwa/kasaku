
export async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
    let baseUrl = process.env.WHATSAPP_API_URL || "http://localhost:3001";

    // Ensure protocol is present
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }

    try {
        const res = await fetch(`${baseUrl}/send-otp`, {
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
        return false;
    }
}
