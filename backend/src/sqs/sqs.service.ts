import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

export interface EmailJobMessage {
  campaignId: string;
  jobId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  recipientData?: Record<string, any>;
}

@Injectable()
export class SqsService {
  private sqsClient: SQSClient;
  private queueUrl: string;
  private dlqUrl: string;

  constructor(private configService: ConfigService) {
    this.sqsClient = new SQSClient({
      region: this.configService.get('aws.region'),
      credentials: {
        accessKeyId: this.configService.get('aws.accessKeyId')!,
        secretAccessKey: this.configService.get('aws.secretAccessKey')!,
      },
    });

    this.queueUrl = this.configService.get('aws.sqs.queueUrl')!;
    this.dlqUrl = this.configService.get('aws.sqs.dlqUrl')!;
  }

  async sendMessage(message: EmailJobMessage): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    });

    await this.sqsClient.send(command);
  }

  async receiveMessages(): Promise<EmailJobMessage[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });

    const response = await this.sqsClient.send(command);
    const messages = response.Messages || [];

    return messages.map(msg => JSON.parse(msg.Body!));
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }

  async sendToDeadLetterQueue(message: EmailJobMessage, error: string): Promise<void> {
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
  }
}
