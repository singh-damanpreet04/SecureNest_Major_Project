import crypto from 'crypto';

function toBuffer(input) {
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === 'string') {
        // Try base64 first, fallback to utf8
        try { return Buffer.from(input, 'base64'); } catch {}
        return Buffer.from(input, 'utf8');
    }
    if (input instanceof Uint8Array) return Buffer.from(input);
    if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));
    if (input?.buffer instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input.buffer));
    if (Array.isArray(input)) return Buffer.from(input);
    throw new Error('Expected Buffer or Uint8Array');
}

// Derive a per-message key using HKDF with SHA-256
export function deriveImageKey(masterKeyBuffer, contextBuffer, saltBuffer, keyLen = 32) {
	const ikm = toBuffer(masterKeyBuffer);
	const info = toBuffer(contextBuffer);
	const salt = toBuffer(saltBuffer);
	return crypto.hkdfSync('sha256', ikm, salt, info, keyLen);
}

export function encryptImageAesGcm(plaintextBuffer, keyBuffer, ivBuffer) {
	const pt = toBuffer(plaintextBuffer);
	const key = toBuffer(keyBuffer);
	const iv = toBuffer(ivBuffer);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(pt), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return { ciphertext, authTag };
}

export function decryptImageAesGcm(ciphertextBuffer, keyBuffer, ivBuffer, authTagBuffer) {
	const ct = toBuffer(ciphertextBuffer);
	const key = toBuffer(keyBuffer);
	const iv = toBuffer(ivBuffer);
	const tag = toBuffer(authTagBuffer);
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
	return plaintext;
}

export function generateRandomBytes(length) {
	return crypto.randomBytes(length);
}


