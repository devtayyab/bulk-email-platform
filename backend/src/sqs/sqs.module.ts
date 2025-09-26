import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { SqsConsumerService } from './sqs-consumer.service';
import { EmailService } from '../email/email.service';
import { EmailJobsModule } from '../email-jobs/email-jobs.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [EmailJobsModule , CampaignsModule], 
  providers: [SqsService, SqsConsumerService, EmailService],
  exports: [SqsService], 
})
export class SqsModule {}
