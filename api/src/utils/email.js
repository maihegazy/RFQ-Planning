const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    if (env.NODE_ENV === 'development') {
      // Console logger for development
      this.transporter = {
        sendMail: async (options) => {
          logger.info('Email sent (dev mode):', {
            to: options.to,
            subject: options.subject,
            preview: options.text?.substring(0, 100),
          });
          return { messageId: 'dev-' + Date.now() };
        },
      };
    } else {
      // SMTP for production
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  async sendInvite({ to, name, inviteToken }) {
    const inviteUrl = `${env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
    
    const html = `
      <h2>Welcome to RFQ Management System</h2>
      <p>Hi ${name},</p>
      <p>You have been invited to join the RFQ Management System.</p>
      <p>Please click the link below to set up your password and activate your account:</p>
      <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">
        Accept Invitation
      </a>
      <p>Or copy this link: ${inviteUrl}</p>
      <p>This invitation will expire in 7 days.</p>
      <p>Best regards,<br>RFQ Management Team</p>
    `;

    await this.sendMail({
      to,
      subject: 'Invitation to RFQ Management System',
      html,
      text: `Hi ${name}, You have been invited to join the RFQ Management System. Please visit ${inviteUrl} to set up your account.`,
    });
  }

  async sendApprovalRequest({ to, rfqName, packageName, taskType, dueDate }) {
    const approvalUrl = `${env.FRONTEND_URL}/approvals`;
    
    const html = `
      <h2>Approval Request</h2>
      <p>You have a new ${taskType} approval request:</p>
      <ul>
        <li><strong>RFQ:</strong> ${rfqName}</li>
        <li><strong>Decision Package:</strong> ${packageName}</li>
        <li><strong>Type:</strong> ${taskType}</li>
        ${dueDate ? `<li><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</li>` : ''}
      </ul>
      <a href="${approvalUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">
        Review Request
      </a>
      <p>Best regards,<br>RFQ Management System</p>
    `;

    await this.sendMail({
      to,
      subject: `Approval Required: ${rfqName} - ${taskType}`,
      html,
      text: `You have a new ${taskType} approval request for RFQ: ${rfqName}. Please visit ${approvalUrl} to review.`,
    });
  }

  async sendApprovalDecision({ to, rfqName, packageName, decision, comment }) {
    const html = `
      <h2>Approval Decision</h2>
      <p>A decision has been made on your submission:</p>
      <ul>
        <li><strong>RFQ:</strong> ${rfqName}</li>
        <li><strong>Decision Package:</strong> ${packageName}</li>
        <li><strong>Decision:</strong> <span style="color: ${decision === 'APPROVED' ? 'green' : 'red'}">${decision}</span></li>
        ${comment ? `<li><strong>Comment:</strong> ${comment}</li>` : ''}
      </ul>
      <a href="${env.FRONTEND_URL}/rfqs" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">
        View RFQ
      </a>
      <p>Best regards,<br>RFQ Management System</p>
    `;

    await this.sendMail({
      to,
      subject: `Decision: ${rfqName} - ${decision}`,
      html,
      text: `Decision made on ${rfqName}: ${decision}. ${comment || ''}`,
    });
  }

  async sendMention({ to, fromUser, rfqName, comment, context }) {
    const html = `
      <h2>You were mentioned</h2>
      <p>${fromUser} mentioned you in ${context}:</p>
      <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0;">
        ${comment}
      </blockquote>
      <p><strong>RFQ:</strong> ${rfqName}</p>
      <a href="${env.FRONTEND_URL}/rfqs" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">
        View Comment
      </a>
      <p>Best regards,<br>RFQ Management System</p>
    `;

    await this.sendMail({
      to,
      subject: `${fromUser} mentioned you in ${rfqName}`,
      html,
      text: `${fromUser} mentioned you: ${comment}`,
    });
  }

  async sendMail(options) {
    try {
      const result = await this.transporter.sendMail({
        from: `"RFQ System" <${env.SMTP_USER}>`,
        ...options,
      });
      logger.info('Email sent successfully:', { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();