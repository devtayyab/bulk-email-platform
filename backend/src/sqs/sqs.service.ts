import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';

export interface EmailJobMessage {
  campaignId: string;
  jobId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  recipientData?: Record<string, any>;
}

export interface SQSMessage {
  message: EmailJobMessage;
  receiptHandle: string;
  messageId?: string;
}

@Injectable()
export class SqsService {
  private sqsClient: SQSClient;
  private queueUrl: string;
  private dlqUrl: string;

  constructor(private configService: ConfigService) {
    // Validate required configuration
    const region = this.configService.get('aws.region');
    const accessKeyId = this.configService.get('aws.accessKeyId');
    const secretAccessKey = this.configService.get('aws.secretAccessKey');
    const queueUrl = this.configService.get('aws.sqs.queueUrl');
    const dlqUrl = this.configService.get('aws.sqs.dlqUrl');

    if (!region || !accessKeyId || !secretAccessKey || !queueUrl || !dlqUrl) {
      throw new Error('Missing required AWS SQS configuration. Please check your environment variables.');
    }

    this.sqsClient = new SQSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.queueUrl = queueUrl;
    this.dlqUrl = dlqUrl;
  }

  async sendMessage(message: EmailJobMessage): Promise<void> {
    try {
      console.log(`SqsService: Sending message to queue for ${message.recipientEmail}`);

      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      });

      const result = await this.sqsClient.send(command);
    } catch (error) {
      console.error(`SqsService: Failed to send message for ${message.recipientEmail}:`, error);
      throw error;
    }
  }


  async receiveMessages(): Promise<SQSMessage[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 60, // Reduced to 1 minute - messages won't stay in flight as long
      });

      const response = await this.sqsClient.send(command);
      const messages = response.Messages || [];

      console.log(`SqsService: Received ${messages.length} messages from SQS`);

      return messages.map((msg: Message) => ({
        message: JSON.parse(msg.Body!),
        receiptHandle: msg.ReceiptHandle!,
        messageId: msg.MessageId,
      }));
    } catch (error) {
      console.error('SqsService: Failed to receive messages from SQS:', error);
      throw error;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      console.log('SqsService: Deleting message from queue...');

      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
      console.log('SqsService: Message deleted successfully');
    } catch (error) {
      console.error('SqsService: Failed to delete message:', error);
      throw error;
    }
  }

  async sendToDeadLetterQueue(message: EmailJobMessage, error: string): Promise<void> {
    try {
      console.log(`SqsService: Sending message to DLQ for ${message.recipientEmail}`);

      const deadLetterMessage = {
        ...message,
        error,
        timestamp: new Date().toISOString(),
      };

      const command = new SendMessageCommand({
        QueueUrl: this.dlqUrl,
        MessageBody: JSON.stringify(deadLetterMessage),
      });

      await this.sqsClient.send(command);
      console.log(`SqsService: Message sent to DLQ successfully for ${message.recipientEmail}`);
    } catch (error) {
      console.error(`SqsService: Failed to send message to DLQ for ${message.recipientEmail}:`, error);
      throw error;
    }
  }
}
