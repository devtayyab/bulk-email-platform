import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { EmailJobMessage } from '../sqs/sqs.service';
import { EmailJobsService } from '../email-jobs/email-jobs.service';

@Injectable()
export class EmailService {
  constructor(
    private configService: ConfigService,
    private emailJobsService: EmailJobsService,
  ) {
    sgMail.setApiKey(this.configService.get('sendgrid.apiKey')!);
  }

  async sendEmail(message: EmailJobMessage): Promise<boolean> {
    try {
      const htmlContent = this.replacePlaceholders(message.body, message.recipientData || {});


      const msg = {
        to: message.recipientEmail,
        from: this.configService.get('sendgrid.fromEmail')!,
        subject: message.subject,
        html: htmlContent,      
      };

      console.log('=== EMAIL DEBUG INFO ===');
      console.log('To:', message.recipientEmail);
      console.log('Subject:', message.subject);
      console.log('HTML Content Length:', htmlContent.length);
      console.log('HTML Preview (first 500 chars):');
      console.log(htmlContent.substring(0, 500) + '...');
      console.log('Contains HTML tag:', htmlContent.includes('<html>'));
      console.log('Contains DOCTYPE:', htmlContent.includes('<!DOCTYPE'));
      console.log('Contains <body>:', htmlContent.includes('<body>'));
      console.log('========================');

      const result = await sgMail.send(msg);
      console.log("SendGrid Result:", JSON.stringify(result, null, 2));

      // Update job status to sent
      await this.emailJobsService.updateStatus(message.jobId, {
        status: 'sent',
      });

      return true;
    } catch (error) {
      console.error('Error sending email:', error);

      // Update job status to failed
      await this.emailJobsService.updateStatus(message.jobId, {
        status: 'failed',
        error: error.message,
        retryCount: 1, // This will be incremented by the consumer
      });

      return false;
    }
  }

  private replacePlaceholders(template: string, data: Record<string, any>): string {
    let result = template;

    // Replace placeholders like {{name}}, {{email}}, etc.
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value || ''));
    });

    return result;
  }


  private escapeHtml(text: string): string {
    // Simple HTML escaping for server-side environment
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
