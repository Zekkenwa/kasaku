import crypto from 'crypto';

// AES-256-GCM is an authenticated encryption mode that is widely recommended.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypts text using AES-256-GCM.
 * Requires ENCRYPTION_KEY in process.env (must be 32 bytes / 64 hex chars).
 */
export function encrypt(text: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not found in environment variables');
    }

    // Key must be 32 bytes for aes-256
    // We assume ENCRYPTION_KEY is a hex string or a raw string that we might need to hash if it's not 32 bytes.
    // For safety, let's treat ENCRYPTION_KEY as a hex string representing 32 bytes.
    // If your key is a passphrase, use a KDF (like pbkdf2) to derive a 32-byte key.
    // Here we assume the user provides a 32-byte hex string.

    const keyBuffer = Buffer.from(encryptionKey, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text using AES-256-GCM.
 */
export function decrypt(text: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not found in environment variables');
    }

    const keyBuffer = Buffer.from(encryptionKey, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }

    const parts = text.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Normalizes phone numbers to a consistent format (628...)
 */
export function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }
    // If it's already 62..., do nothing
    return cleaned;
}

/**
 * Generates a blind index for searchable but encrypted data.
 * Uses HMAC-SHA256 with the ENCRYPTION_KEY as a salt/key.
 */
export function generateBlindIndex(text: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not found in environment variables');
    }

    const normalized = normalizePhone(text);

    return crypto
        .createHmac('sha256', Buffer.from(encryptionKey, 'hex'))
        .update(normalized)
        .digest('hex');
}
