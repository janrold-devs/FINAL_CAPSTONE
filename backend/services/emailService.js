// services/emailService.js
import { Resend } from 'resend';
import { ENV } from '../lib/env.js';

const resend = new Resend(ENV.RESEND_API_KEY);

// Use email format: name@yourdomain.com
const FROM_EMAIL = 'KKopi.Tea <noreply@kkopitea-dasma.com>'; // Correct format

export const sendCredentialsEmail = async (user, plainPassword) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, // Use the corrected format
      to: user.email,
      subject: 'Your KKopi.Tea Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E89271;">Welcome to KKopi.Tea!</h2>
          <p>Your account has been approved. Here are your login credentials:</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Password:</strong> ${plainPassword}</p>
          </div>
          <p>You can now login to your account using these credentials.</p>
          <p style="color: #666; font-size: 14px;">
            For security reasons, we recommend changing your password after first login.
          </p>
        </div>
      `,
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
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, // Use the same domain email
      to: user.email,
      subject: 'KKopi.Tea - Account Registration Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E89271;">Registration Update</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>We regret to inform you that your account registration request has been rejected.</p>
          <p>If you believe this was a mistake, please try registering again or contact our support team.</p>
          <p style="color: #666; font-size: 14px;">
            Thank you for your interest in KKopi.Tea.
          </p>
        </div>
      `,
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
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, // Use the same domain email
      to: user.email,
      subject: 'KKopi.Tea - Registration Under Review',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E89271;">Registration Received</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Thank you for registering with KKopi.Tea! Your account is currently under review.</p>
          <p>You will receive another email once your account has been approved by our administrator.</p>
          <p style="color: #666; font-size: 14px;">
            This process usually takes 24-48 hours.
          </p>
        </div>
      `,
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