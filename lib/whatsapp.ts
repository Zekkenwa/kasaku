
export async function sendWhatsAppOTP(phone: string, otp: string): Promise<boolean> {
    let baseUrl = (process.env.WHATSAPP_API_URL || "").trim();

    if (!baseUrl) {
        console.error("WHATSAPP_API_URL is not set in environment variables");
        return false;
    }

    // Ensure protocol is present
    if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
    }

    // Remove trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, "");

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
