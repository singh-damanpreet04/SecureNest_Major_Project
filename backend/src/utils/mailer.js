import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,  // Changed from EMAIL_USER to EMAIL_USERNAME
        pass: process.env.EMAIL_PASSWORD, // Changed from EMAIL_PASS to EMAIL_PASSWORD
    },
    tls: { // Temporarily disable certificate validation for development
        rejectUnauthorized: false
    }
});

// Add logging to verify environment variables are loaded
console.log('Nodemailer Config: EMAIL_USERNAME =', process.env.EMAIL_USERNAME);
console.log('Nodemailer Config: EMAIL_PASSWORD is defined =', !!process.env.EMAIL_PASSWORD);

export const sendOtpEmail = async (email, otpCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'SecureNest Password Reset OTP',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Password Reset OTP</h2>
                <p>Hello,</p>
                <p>You have requested to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>
                <p style="font-size: 24px; font-weight: bold; color: #007bff; background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">${otpCode}</p>
                <p>This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
                <p>Thanks,</p>
                <p>The SecureNest Team</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending OTP email to ${email}:`, error);
        throw new Error('Failed to send OTP email');
    }
};
