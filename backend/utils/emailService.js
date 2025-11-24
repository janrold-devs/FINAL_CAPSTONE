// backend/utils/emailService.js
import nodemailer from 'nodemailer';
import { ENV } from '../lib/env.js';

// Create transporter (configure based on your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASS, // Use app password for Gmail
  },
});

export const sendWelcomeEmail = async (userEmail, firstName, password, role) => {
  try {
    const mailOptions = {
      from: `"KKopi.Tea" <${ENV.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Welcome to KKopi.Tea! 🍵 Your Account is Ready',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { 
                    font-family: 'Arial', sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px;
                    background: linear-gradient(135deg, #fdf6f0, #fff5f5);
                }
                .header { 
                    background: linear-gradient(135deg, #E89271, #d67a5c); 
                    padding: 30px; 
                    text-align: center; 
                    color: white; 
                    border-radius: 15px 15px 0 0;
                    margin-bottom: 0;
                }
                .content { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 0 0 15px 15px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .credentials { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 10px; 
                    margin: 20px 0; 
                    border-left: 4px solid #E89271;
                    border: 2px dashed #E89271;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 30px; 
                    color: #666; 
                    font-size: 14px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                .logo { 
                    font-size: 24px; 
                    font-weight: bold; 
                    color: #E89271; 
                    margin-bottom: 10px;
                }
                .highlight {
                    color: #E89271;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">KKopi.Tea</div>
                <h1>Welcome to the Team! 🎉</h1>
            </div>
            
            <div class="content">
                <h2>Hello ${firstName},</h2>
                <p>Welcome to <span class="highlight">KKopi.Tea</span>! We're thrilled to have you on board as part of our ${role} team.</p>
                
                <div class="credentials">
                    <h3 style="color: #E89271; margin-top: 0;">Your Login Credentials:</h3>
                    <p><strong>📧 Email:</strong> ${userEmail}</p>
                    <p><strong>🔑 Password:</strong> ${password}</p>
                    <p><strong>👤 Role:</strong> ${role}</p>
                </div>
                
                <p><strong>Important Security Notes:</strong></p>
                <ul>
                    <li>🔒 Keep your credentials secure and confidential</li>
                    <li>🔄 Change your password after first login</li>
                    <li>🚨 Never share your login details with anyone</li>
                    <li>📱 Use only official KKopi.Tea systems</li>
                </ul>
                
                <p>You can now access the KKopi.Tea management system and start helping us deliver amazing coffee experiences! ☕</p>
                
                <p style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <strong>Next Steps:</strong> Log in to the system and familiarize yourself with the dashboard features.
                </p>
                
                <p>Welcome aboard!<br>
                <strong>The KKopi.Tea Team</strong> 🍵</p>
            </div>
            
            <div class="footer">
                <p>&copy; 2024 KKopi.Tea. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(` Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(' Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};