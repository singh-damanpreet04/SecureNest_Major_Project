import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('Creating uploads directory at:', UPLOAD_DIR);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} else {
    console.log('Using existing uploads directory at:', UPLOAD_DIR);
}

/**
 * Save a base64 file to the uploads directory
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original filename
 * @returns {Promise<{filePath: string, fileName: string}>}
 */
export const saveBase64File = (base64Data, fileName) => {
    return new Promise((resolve, reject) => {
        try {
            // Remove data URL prefix if present
            const base64String = base64Data.includes('base64,') 
                ? base64Data.split('base64,')[1] 
                : base64Data;

            // Generate a unique filename
            const fileExt = path.extname(fileName) || '';
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const uniqueFileName = `file-${uniqueSuffix}${fileExt}`;
            const filePath = path.join(UPLOAD_DIR, uniqueFileName);

            // Write file to disk
            fs.writeFile(filePath, base64String, 'base64', (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                    return reject(err);
                }
                resolve({
                    filePath: `/uploads/${uniqueFileName}`,
                    fileName: fileName,
                    storedFileName: uniqueFileName
                });
            });
        } catch (error) {
            console.error('Error in saveBase64File:', error);
            reject(error);
        }
    });
};

/**
 * Delete a file from the uploads directory
 * @param {string} filePath - Path to the file (from the uploads directory)
 * @returns {Promise<boolean>}
 */
export const deleteFile = (filePath) => {
    return new Promise((resolve) => {
        try {
            const fullPath = path.join(__dirname, '../../', filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                        return resolve(false);
                    }
                    resolve(true);
                });
            } else {
                resolve(true); // File doesn't exist, consider it deleted
            }
        } catch (error) {
            console.error('Error in deleteFile:', error);
            resolve(false);
        }
    });
};

export default {
    saveBase64File,
    deleteFile
};
