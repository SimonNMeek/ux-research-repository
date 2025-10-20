import { Resend } from 'resend';

// Lazy initialization to avoid build errors when API key is missing
let resend: Resend | null = null;

function getResendInstance(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface InvitationEmailData {
  to: string;
  organizationName: string;
  inviterName: string;
  signupUrl: string;
  role: string;
  isExistingUser?: boolean; // New field to indicate if user already exists
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  // Allow disabling email sending for testing
  if (process.env.DISABLE_EMAIL_SENDING === 'true') {
    console.log('Email sending disabled for testing. Invitation data:', data);
    return { success: true, messageId: 'disabled-for-testing' };
  }

  // List of possible sender addresses to try
  const senderAddresses = [
    process.env.RESEND_FROM_ADDRESS,
    'onboarding@resend.dev',
    'noreply@resend.dev',
    'hello@resend.dev'
  ].filter(Boolean);

  for (const fromAddress of senderAddresses) {
    try {
      console.log(`Attempting to send email from: ${fromAddress}`);
      
      const emailContent = data.isExistingUser 
        ? `Hi there!

${data.inviterName} has invited you to join ${data.organizationName} on Sol Research as a ${data.role}.

Sol Research is a collaborative platform for organizing and sharing research insights.

Since you already have an account, simply click the link below to accept this invitation:

${data.signupUrl}

This invitation will expire in 7 days.

If you have any questions, feel free to reach out to ${data.inviterName} or reply to this email.

Best regards,
The Sol Research Team

---
This is an automated message from Sol Research. Please do not reply directly to this email.`
        : `Hi there!

${data.inviterName} has invited you to join ${data.organizationName} on Sol Research as a ${data.role}.

Sol Research is a collaborative platform for organizing and sharing research insights.

To accept this invitation, simply click the link below to create your account:

${data.signupUrl}

This invitation will expire in 7 days.

If you have any questions, feel free to reach out to ${data.inviterName} or reply to this email.

Best regards,
The Sol Research Team

---
This is an automated message from Sol Research. Please do not reply directly to this email.`;

      const resendInstance = getResendInstance();
      const result = await resendInstance.emails.send({
        from: fromAddress!,
        to: [data.to],
        subject: `You're invited to join ${data.organizationName} on Sol Research`,
        text: emailContent,
      });

      console.log(`Email sent successfully from ${fromAddress} with ID: ${result.data?.id}`);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error(`Failed to send email from ${fromAddress}:`, error);
      
      // If this is a 403 error, try the next sender address
      if (error instanceof Error && error.message.includes('403')) {
        console.log(`403 error with ${fromAddress}, trying next sender...`);
        continue;
      }
      
      // For other errors, return the error
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // If all sender addresses failed
  return { success: false, error: 'All sender addresses failed. Please verify your Resend configuration.' };
}

export function generateSignupUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/signup?invite=${token}`;
}
