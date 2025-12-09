import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'temp');

// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created temp directory for file uploads');
} else {
    console.log('Temp directory already exists');
}

// Make sure the directory is writable
try {
    fs.accessSync(tempDir, fs.constants.W_OK);
    console.log('Temp directory is writable');
} catch (err) {
    console.error('Temp directory is not writable:', err);
}
