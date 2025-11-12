import { config } from 'dotenv';
config();
import nodemailer from 'nodemailer';
console.log('--- Netwin Tournament Admin Startup Checks ---');
// 1. App Check Debug Token
const appCheckDebugToken = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN || process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production' && appCheckDebugToken) {
    console.warn('⚠️  App Check debug token detected in production!');
    console.warn('   Debug token:', appCheckDebugToken);
    console.warn('   Go to Firebase Console → App Check → Your App → Add this debug token.');
    console.warn('   For production, use a real App Check provider.');
}
// 2. SMTP/Email Config
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const emailFrom = process.env.EMAIL_FROM_ADDRESS;
if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !emailFrom) {
    console.error('❌ SMTP/Email environment variables are missing!');
    console.error('   Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM_ADDRESS');
}
else {
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false }
    });
    transporter.verify()
        .then(() => console.log('✅ SMTP connection verified.'))
        .catch((err) => {
        console.error('❌ SMTP connection failed:', err.message);
        console.error('   Check your SMTP credentials and network.');
    });
}
// 3. Firebase Auth Authorized Domains
const adminUrl = process.env.ADMIN_URL || 'http://localhost:3000';
console.log('ℹ️  ADMIN_URL:', adminUrl);
console.log('   Make sure this domain is listed in Firebase Console → Authentication → Sign-in method → Authorized domains.');
console.log('--- End of Startup Checks ---');
