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
      const msg = {
        to: message.recipientEmail,
        from: this.configService.get('sendgrid.fromEmail')!,
        subject: message.subject,
        html: this.replacePlaceholders(message.body, message.recipientData || {}),
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
      result = result.replace(placeholder, value);
    });

    return result;
  }
}
