import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Gmail SMTP transporter
const setupTransporter = async () => {
    try {
        // Get email credentials from environment variables
        const emailUser = process.env.EMAIL_USERNAME;
        const emailPass = process.env.EMAIL_PASSWORD;

        if (!emailUser || !emailPass) {
            const error = new Error('Email credentials not found in environment variables');
            console.error('SMTP Configuration Error:', error.message);
            throw error;
        }

        console.log('Initializing Gmail SMTP transporter...');
        
        // Configure SMTP options with secure defaults
        const smtpOptions = {
            host: 'smtp.gmail.com',
            port: 465,  // SSL port
            secure: true,  // true for port 465
            auth: {
                user: emailUser,
                pass: emailPass
            },
            // Only enable debug in development
            debug: process.env.NODE_ENV !== 'production',
            logger: process.env.NODE_ENV !== 'production',
            // Enable STARTTLS if needed (for port 587)
            requireTLS: true,
            // Connection timeout (in ms)
            connectionTimeout: 10000,
            // Greeting timeout (in ms)
            greetingTimeout: 5000,
            // Socket timeout (in ms)
            socketTimeout: 10000
        };

        // Only allow self-signed certificates in development
        if (process.env.NODE_ENV === 'development') {
            smtpOptions.tls = {
                // Only accept self-signed certs in development
                rejectUnauthorized: false
            };
        }
        
        console.log('SMTP Configuration:', {
            ...smtpOptions,
            auth: { user: emailUser ? '***@gmail.com' : 'Not set' },
            tls: { rejectUnauthorized: false }
        });
        
        // Create transporter
        const transporter = nodemailer.createTransport(smtpOptions);
        
        // Verify connection configuration
        console.log('Verifying SMTP connection...');
        await transporter.verify(function(error, success) {
            if (error) {
                console.error('SMTP Verification Error:', error);
                throw error;
            } else {
                console.log('SMTP Server is ready to send emails');
            }
        });
        
        return transporter;
    } catch (error) {
        console.error('Failed to create Gmail SMTP transporter:', error);
        throw error;
    }
};

// Initialize transporter
let transporter;

// Initialize transporter immediately
(async () => {
    try {
        transporter = await setupTransporter();
    } catch (error) {
        console.error('Failed to initialize email transporter:', error);
    }
})();

/**
 * Send OTP (TOTP) to user's email
 * @param {string} to - Recipient email address
 * @param {string} otp - The OTP to send
 * @param {string} purpose - Purpose of the OTP (for custom messaging)
 * @param {string} customSubject - Custom email subject (optional)
 * @param {string} customBody - Custom email body (optional)
 * @returns {Promise<Object>} - Result of the email sending operation
 */
const sendOtpEmail = async (to, otp, purpose = 'verification', customSubject = null, customBody = null) => {
    if (!transporter) {
        console.error('Email transporter not initialized');
        throw new Error('Email service is not ready. Please try again later.');
    }

    try {
        // Use custom subject/body if provided, otherwise use default
        const subject = customSubject || 'Your SecureNest Verification Code';
        
        let html;
        if (customBody) {
            // Use custom body (for account deletion confirmation)
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    ${customBody.replace(/\n/g, '<br>')}
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        This is an automated message, please do not reply to this email.
                    </p>
                </div>
            `;
        } else {
            // Use default OTP template
            const purposeText = purpose === 'account deletion' ? 'to delete your account' : 'to verify your action';
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Your SecureNest Verification Code</h2>
                    <p>Use the following 6-digit code ${purposeText}:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code will expire in 10 minutes. If it expires, request a new code.</p>
                    <p>If you didn't request this code, you can safely ignore this email.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        This is an automated message, please do not reply to this email.
                    </p>
                </div>
            `;
        }
        
        const mailOptions = {
            from: `SecureNest <${process.env.EMAIL_USERNAME}>`,
            to,
            subject,
            html
        };

        console.log('Sending OTP email to:', to);
        console.log('Using SMTP config:', {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: process.env.EMAIL_USERNAME ? '***' : 'Not set'
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent successfully. Message ID:', info.messageId);
        
        return { 
            success: true, 
            message: 'OTP sent successfully',
            messageId: info.messageId 
        };
    } catch (error) {
        console.error('Error sending OTP email:', {
            error: error.message,
            stack: error.stack,
            response: error.response,
            code: error.code,
            command: error.command
        });
        throw new Error('Failed to send OTP email. Please try again later.');
    }
};

export { sendOtpEmail };
