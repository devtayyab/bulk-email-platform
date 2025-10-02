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

      await sgMail.send(msg);

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
        retryCount: 1,
      });

      return false;
    }
  }

  private replacePlaceholders(template: string, data: Record<string, any>): string {
    let result = template;

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, this.escapeHtml(String(value || '')));
    });

    return result;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}