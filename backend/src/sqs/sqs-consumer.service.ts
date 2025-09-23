import { Injectable, OnModuleInit } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { SqsService, EmailJobMessage } from '../sqs/sqs.service';
import { EmailJobsService } from '../email-jobs/email-jobs.service';

@Injectable()
export class SqsConsumerService implements OnModuleInit {
  constructor(
    private sqsService: SqsService,
    private emailService: EmailService,
    private emailJobsService: EmailJobsService,
  ) {}

  async onModuleInit() {
    // Start consuming messages when the module initializes
    await this.startConsuming();
  }

  private async startConsuming(): Promise<void> {
    console.log('Starting SQS message consumer...');

    while (true) {
      try {
        const messages = await this.sqsService.receiveMessages();

        if (messages.length > 0) {
          console.log(`Received ${messages.length} messages from SQS`);

          for (const message of messages) {
            await this.processMessage(message);
          }
        } else {
          // Wait before checking for new messages
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error('Error consuming SQS messages:', error);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  private async processMessage(message: EmailJobMessage): Promise<void> {
    try {
      console.log(`Processing email to ${message.recipientEmail}`);

      // Update job status to queued
      await this.emailJobsService.updateStatus(message.jobId, {
        status: 'queued',
      });

      // Send the email
      const success = await this.emailService.sendEmail(message);

      if (success) {
        console.log(`Email sent successfully to ${message.recipientEmail}`);
      } else {
        console.log(`Failed to send email to ${message.recipientEmail}`);
      }

      // Note: Message deletion is handled by the successful send or by the DLQ logic in EmailService
    } catch (error) {
      console.error(`Error processing message for ${message.recipientEmail}:`, error);

      // Send to dead letter queue on critical errors
      await this.sqsService.sendToDeadLetterQueue(message, error.message);
    }
  }
}
