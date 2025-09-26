import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { SqsConsumerService } from './sqs-consumer.service';
import { EmailService } from '../email/email.service';
import { EmailJobsModule } from '../email-jobs/email-jobs.module';

@Module({
  imports: [EmailJobsModule], 
  providers: [SqsService, SqsConsumerService, EmailService],
  exports: [SqsService], 
})
export class SqsModule {}
