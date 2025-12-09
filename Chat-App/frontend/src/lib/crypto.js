import CryptoJS from 'crypto-js';

// Use a consistent encryption key (in a real app, this should be stored securely)
const ENCRYPTION_KEY = 'your-secure-encryption-key-123';

// Function to encrypt text using AES
const encryptText = (text, key = ENCRYPTION_KEY) => {
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (error) {
    console.error('Error encrypting text:', error);
    return text; // Return original if encryption fails
  }
};

// Function to decrypt text using AES
const decryptText = (ciphertext, key = ENCRYPTION_KEY) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext; // Return original if decryption fails
  } catch (error) {
    console.error('Error decrypting text:', error);
    return ciphertext; // Return original if decryption fails
  }
};

export { encryptText, decryptText };
