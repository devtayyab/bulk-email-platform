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
    console.log('SqsConsumerService: Initializing module...');
    try {
      await this.startConsuming();
    } catch (error) {
      console.error('SqsConsumerService: Failed to start message consumption:', error);
      // Don't throw error here to prevent the entire application from crashing
      // The consumer will retry in the consumeLoop
    }
  }

  async onModuleDestroy() {
    console.log('SqsConsumerService: Stopping message consumption...');
    this.isConsuming = false;
    if (this.consumePromise) {
      await this.consumePromise;
    }
  }

  async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      console.log('SqsConsumerService: Already consuming messages');
      return;
    }

    this.isConsuming = true;
    console.log('SqsConsumerService: Starting message consumption...');
    
    this.consumePromise = this.consumeLoop();
  }

  private async consumeLoop(): Promise<void> {
    while (this.isConsuming) {
      try {
        console.log('SqsConsumerService: Polling for messages...');
        const sqsMessages = await this.sqsService.receiveMessages();

        if (sqsMessages.length > 0) {
          console.log(`SqsConsumerService: Processing ${sqsMessages.length} messages`);

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
              console.log(`SqsConsumerService: Updated campaign ${mostCommonCampaignId} to completed`);
            } catch (error) {
              console.error('SqsConsumerService: Failed to update campaign status:', error);
              // Don't fail the whole batch for this
            }
          }
        } else {
          console.log('SqsConsumerService: No messages received, continuing to poll...');
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
    console.log(`SqsConsumerService: Processing message for ${message.recipientEmail}, jobId: ${message.jobId}`);

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

      console.log(`SqsConsumerService: Sending email to ${message.recipientEmail}`);
      const success = await this.emailService.sendEmail(message);

      console.log(`SqsConsumerService: Email send result for ${message.recipientEmail}:`, success);

      if (success) {
        console.log(`SqsConsumerService: Email sent successfully to ${message.recipientEmail}`);

        // Update job status to completed
        await this.emailJobsService.updateStatus(message.jobId, {
          status: 'sent',
        });

        // Delete message from queue
        await this.sqsService.deleteMessage(receiptHandle);
        messageDeleted = true;
        console.log(`SqsConsumerService: Message deleted from queue for ${message.recipientEmail}`);

      } else {
        throw new Error('Email sending returned false');
      }

    } catch (error) {
      console.error(`SqsConsumerService: Error processing message for ${message.recipientEmail}:`, error);

      try {
        // Update job status to failed
        await this.emailJobsService.updateStatus(message.jobId, {
          status: 'failed',
          error: error.message,
        });

        // Send to dead letter queue on critical errors
        console.log(`SqsConsumerService: Sending message to dead letter queue...`);
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
            console.log(`SqsConsumerService: Message deleted from queue as last resort`);
          }
        } catch (deleteError) {
          console.error(`SqsConsumerService: Failed to delete message as last resort:`, deleteError);
          // Message will become visible again after visibility timeout (now only 60 seconds)
        }
      }
    }
  }
}