import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from './entities/campaign.entity';
import { EmailJob } from '../email-jobs/entities/email-job.entity';
import { SqsService } from '@/sqs/sqs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, EmailJob])],
  controllers: [CampaignsController],
  providers: [CampaignsService,SqsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
