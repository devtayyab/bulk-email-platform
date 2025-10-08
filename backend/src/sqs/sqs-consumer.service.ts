import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { SqsService, EmailJobMessage, SQSMessage } from '../sqs/sqs.service';
import { EmailJobsService } from '../email-jobs/email-jobs.service';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private isConsuming = false;
  private consumePromise: Promise<void> | null = null;

  constructor(
    private sqsService: SqsService,
    private emailService: EmailService,
    private emailJobsService: EmailJobsService,
    private campaignService: CampaignsService,
  ) {}

  async onModuleInit() {
    try {
      await this.startConsuming();
    } catch (error) {
      console.error('SqsConsumerService: Failed to start message consumption:', error);
    }
  }

  async onModuleDestroy() {
    this.isConsuming = false;
    if (this.consumePromise) {
      await this.consumePromise;
    }
  }

  async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      return;
    }

    this.isConsuming = true;
    
    this.consumePromise = this.consumeLoop();
  }

  private async consumeLoop(): Promise<void> {
    while (this.isConsuming) {
      try {
        const sqsMessages = await this.sqsService.receiveMessages();

        if (sqsMessages.length > 0) {


          // Process messages in parallel but with controlled concurrency
          const processPromises = sqsMessages.map(sqsMessage =>
            this.processMessage(sqsMessage.message, sqsMessage.receiptHandle)
              .catch(error => {
                console.error(`SqsConsumerService: Failed to process message:`, error);
                // Continue processing other messages even if one fails
              })
          );

          await Promise.allSettled(processPromises);

          // Only update campaign status if we have valid messages
          const validCampaignIds = sqsMessages
            .map(msg => msg.message?.campaignId)
            .filter(id => id && typeof id === 'string');

          if (validCampaignIds.length > 0) {
            try {
              // Update the most common campaign ID to completed
              const mostCommonCampaignId = validCampaignIds[0];
              await this.campaignService.updateCampaignStatus(mostCommonCampaignId, 'completed');
            } catch (error) {
              console.error('SqsConsumerService: Failed to update campaign status:', error);
            }
          }
        } 
        
        // Small delay to prevent overwhelming the CPU when no messages
        await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced from 5000ms to 2000ms
      } catch (error) {
        console.error('SqsConsumerService: Error consuming SQS messages:', error);  
        // Wait before retrying on error
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  private async processMessage(message: EmailJobMessage, receiptHandle: string): Promise<void> {
    let messageDeleted = false;

    try {
      // Validate message data
      if (!message.jobId || !message.recipientEmail) {
        throw new Error('Invalid message data: missing jobId or recipientEmail');
      }

      // Update status to processing
      await this.emailJobsService.updateStatus(message.jobId, {
        status: 'queued',
      });

      const success = await this.emailService.sendEmail(message);

      if (success) {
        console.log(`SqsConsumerService: Email sent successfully to ${message.recipientEmail}`);

        // Update job status to completed
        await this.emailJobsService.updateStatus(message.jobId, {
          status: 'sent',
        });

        // Delete message from queue
        await this.sqsService.deleteMessage(receiptHandle);
        messageDeleted = true;

      } else {
        throw new Error('Email sending returned false');
      }

    } catch (error) {

      try {
        // Update job status to failed
        await this.emailJobsService.updateStatus(message.jobId, {
          status: 'failed',
          error: error.message,
        });

        // Send to dead letter queue on critical errors
        await this.sqsService.sendToDeadLetterQueue(message, error.message);

        // Delete message from main queue
        if (!messageDeleted) {
          await this.sqsService.deleteMessage(receiptHandle);
          messageDeleted = true;
        }
        console.log(`SqsConsumerService: Message sent to dead letter queue successfully`);

      } catch (dlqError) {
        console.error(`SqsConsumerService: Failed to handle error for message:`, dlqError);

        // Last resort: try to delete the message to prevent infinite loops
        try {
          if (!messageDeleted) {
            await this.sqsService.deleteMessage(receiptHandle);
            messageDeleted = true;
          }
        } catch (deleteError) {
          console.error(`SqsConsumerService: Failed to delete message as last resort:`, deleteError);
          // Message will become visible again after visibility timeout (now only 60 seconds)
        }
      }
    }
  }
}