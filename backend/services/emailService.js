// services/emailService.js
import { Resend } from 'resend';
import { ENV } from '../lib/env.js';

const resend = new Resend(ENV.RESEND_API_KEY);
const FROM_EMAIL = 'KKopi.Tea <noreply@kkopitea-dasma.com>';
const CLIENT_URL = ENV.CLIENT_URL;

// Email template helper function
function createEmailTemplate(content) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      </style>
    </head>
    <body style="font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      ${content}
      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>© 2025 KKopi.Tea. All rights reserved.</p>
        <p>
          <a href="#" style="color: #ff8c00; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
          <a href="#" style="color: #ff8c00; text-decoration: none; margin: 0 10px;">Terms of Service</a>
          <a href="#" style="color: #ff8c00; text-decoration: none; margin: 0 10px;">Contact Us</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

function createLogo() {
  return `
    <div style="text-align: center; margin: 30px 0 35px 0;">

      <!-- Orange Circle Logo -->
      <div style="
        width: 80px;
        height: 80px;
        background: #ff8c00;
        border-radius: 50%;
        margin: 0 auto 20px auto;
        color: white;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(255, 140, 0, 0.3);
        display: block;
        text-align: center;
      ">
        <div style="padding-top: 20px; line-height: 1.2;">
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.6px; margin: 0;">
            KKŌPI.TEA
          </div>
          <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">
            一杯の
          </div>
        </div>
      </div>

      <!-- Store Name -->
      <h1 style="
        font-size: 24px;
        font-weight: 700;
        color: #ff8c00;
        margin: 0 0 8px 0;
        line-height: 1.2;
      ">
        KKōpi.Tea
      </h1>

      <!-- Address -->
      <p style="
        font-size: 12px;
        color: #666;
        margin: 0;
        font-weight: 400;
      ">
        - Congressional ave Dasmariñas Cavite
      </p>

    </div>
  `;
}

export const sendCredentialsEmail = async (user, plainPassword, role) => {
  try {
    const emailContent = `
      <div style="background: #ffffff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        ${createLogo()}
        
        <div style="border-bottom: 2px solid #ff8c00; margin-bottom: 25px;"></div>
        
        <p style="font-size: 18px; color: #ff8c00;"><strong>Hello ${user.firstName} ${user.lastName},</strong></p>
        <p>Congratulations! Your account has been approved. We're excited to have you join the KKopi.Tea community!</p>
        
        <div style="background-color: #fffaf0; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #ff8c00;">
          <p style="font-size: 16px; margin: 0 0 15px 0; color: #333;"><strong>Your Login Credentials:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 10px 0; font-size: 14px;"><strong>Username:</strong> ${user.username}</p>
            <p style="margin: 10px 0; font-size: 14px;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-family: monospace;">${plainPassword}</code></p>
            <p style="margin: 10px 0; font-size: 14px;"><strong>Role:</strong> ${role}</p>
          </div>
          <p style="color: #666; font-size: 14px; margin: 15px 0 0 0;">
            <strong>Important:</strong> For security reasons, we recommend changing your password after your first login.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${CLIENT_URL}" style="background: #ff8c00; color: white; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: 500; display: inline-block; font-size: 14px;">Login to Your Account</a>
        </div>
        
        <p style="margin-bottom: 5px; font-size: 14px;">If you need any help or have questions, we're always here to assist you.</p>
        <p style="margin-top: 0; font-size: 14px;">Happy ordering!</p>
        
        <p style="margin-top: 25px; margin-bottom: 0; font-size: 14px;">Best regards,<br><strong>The KKopi.Tea Team</strong></p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Your KKopi.Tea Account Credentials',
      html: createEmailTemplate(emailContent),
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
};

export const sendRejectionEmail = async (user) => {
  try {
    const emailContent = `
      <div style="background: #ffffff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        ${createLogo()}
        
        <div style="border-bottom: 2px solid #ff8c00; margin-bottom: 25px;"></div>
        
        <p style="font-size: 18px; color: #ff8c00;"><strong>Hello ${user.firstName} ${user.lastName},</strong></p>
        <p style="font-size: 14px;">Thank you for your interest in KKopi.Tea.</p>
        
        <div style="background-color: #fffaf0; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #ff8c00;">
          <p style="margin: 0; font-size: 14px;">We regret to inform you that your account registration request has not been approved at this time.</p>
        </div>
        
        <p style="font-size: 14px;">If you believe this was a mistake or would like to provide additional information, please feel free to:</p>
        <ul style="padding-left: 20px; font-size: 14px;">
          <li style="margin-bottom: 10px;">Try registering again with updated information</li>
          <li style="margin-bottom: 0;">Contact our support team for assistance</li>
        </ul>
        
        <p style="margin-top: 25px; color: #666; font-size: 14px;">
          We appreciate your understanding and interest in KKopi.Tea.
        </p>
        
        <p style="margin-top: 25px; margin-bottom: 0; font-size: 14px;">Best regards,<br><strong>The KKopi.Tea Team</strong></p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'KKopi.Tea - Account Registration Update',
      html: createEmailTemplate(emailContent),
    });

    if (error) {
      console.error('Error sending rejection email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Rejection email error:', error);
    return false;
  }
};

export const sendPendingApprovalEmail = async (user) => {
  try {
    const emailContent = `
      <div style="background: #ffffff; padding: 35px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        ${createLogo()}
        
        <div style="border-bottom: 2px solid #ff8c00; margin-bottom: 25px;"></div>
        
        <p style="font-size: 18px; color: #ff8c00;"><strong>Hello ${user.firstName} ${user.lastName},</strong></p>
        <p style="font-size: 14px;">Thank you for registering with KKopi.Tea! We've received your application and are reviewing it.</p>
        
        <div style="background-color: #fffaf0; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #ff8c00;">
          <p style="font-size: 16px; margin: 0 0 15px 0; color: #333;"><strong>What happens next?</strong></p>
          <ul style="padding-left: 20px; margin: 0; font-size: 14px;">
            <li style="margin-bottom: 10px;">Our team is reviewing your registration</li>
            <li style="margin-bottom: 10px;">This process usually takes 24-48 hours</li>
            <li style="margin-bottom: 0;">You'll receive an email once your account is approved</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Note:</strong> No action is required from you at this time. We'll notify you as soon as your account is ready.
        </p>
        
        <p style="margin-top: 25px; font-size: 14px;">We appreciate your patience and look forward to serving you soon!</p>
        
        <p style="margin-top: 25px; margin-bottom: 0; font-size: 14px;">Best regards,<br><strong>The KKopi.Tea Team</strong></p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'KKopi.Tea - Registration Under Review',
      html: createEmailTemplate(emailContent),
    });

    if (error) {
      console.error('Error sending pending approval email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Pending approval email error:', error);
    return false;
  }
};