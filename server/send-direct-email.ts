import { config } from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
config();

async function sendDirectEmail() {
  try {
    console.log('Sending direct email test...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true
    });
    
    // Log configuration
    console.log('Email configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      from: process.env.EMAIL_FROM_ADDRESS
    });
    
    // Send test email to Gmail
    const testEmail = 'test@gmail.com'; // Replace with your test Gmail address
    
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Netwin Tournament'}" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: 'Direct Email Test',
      text: 'This is a direct email test without domain checks.',
      html: '<p>This is a direct email test without domain checks.</p>'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, Message: ${error.message}`);
    }
  }
}

sendDirectEmail();