import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Missing Cloudinary configuration. Please check your environment variables.');
    console.error('Required environment variables:');
    console.error('- CLOUDINARY_CLOUD_NAME');
    console.error('- CLOUDINARY_API_KEY');
    console.error('- CLOUDINARY_API_SECRET');
    process.exit(1);
}

// Configure Cloudinary with reliable settings
cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // Force HTTPS
    // Disable proxy by default - uncomment and set if you're behind a proxy
    // api_proxy: 'http://your-proxy-address:port',
    // Enable CDN subdomain for better performance
    cdn_subdomain: true,
    // Use secure distribution
    secure_distribution: true,
    // Enable SSL
    secure_cdn_delivery: true
});

console.log('✅ Cloudinary configured successfully');
console.log(`ℹ️ Cloud Name: ${cloudName}`);
console.log(`ℹ️ API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

console.log('Cloudinary configured with cloud name:', cloudName);

export default cloudinary;