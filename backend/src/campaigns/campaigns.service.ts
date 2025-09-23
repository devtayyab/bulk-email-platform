import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { EmailJob } from '../email-jobs/entities/email-job.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SqsService } from '../sqs/sqs.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(EmailJob)
    private emailJobRepository: Repository<EmailJob>,
    private sqsService: SqsService,
  ) {}

  async create(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignRepository.create({
      name: createCampaignDto.name,
      subject: createCampaignDto.subject,
      body: createCampaignDto.body,
      metadata: createCampaignDto.metadata || {},
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // Create email jobs from the uploaded data
    if (createCampaignDto.recipients && createCampaignDto.recipients.length > 0) {
      const emailJobs = createCampaignDto.recipients.map(recipient => ({
        campaignId: savedCampaign.id,
        recipientEmail: recipient.email,
        recipientData: recipient.data || {},
        status: 'pending' as const,
      }));

      await this.emailJobRepository.save(emailJobs);
    }

    return savedCampaign;
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepository.find({
      relations: ['jobs'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['jobs'],
    });

    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    return campaign;
  }

  async startCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Campaign is not in draft status');
    }

    // Queue all pending jobs
    const pendingJobs = await this.emailJobRepository.find({
      where: { campaignId: id, status: 'pending' },
    });

    for (const job of pendingJobs) {
      await this.sqsService.sendMessage({
        campaignId: job.campaignId,
        jobId: job.id,
        recipientEmail: job.recipientEmail,
        subject: campaign.subject,
        body: campaign.body,
        recipientData: job.recipientData,
      });
    }

    // Update campaign status
    campaign.status = 'queued';
    return this.campaignRepository.save(campaign);
  }

  async getCampaignStats(id: string) {
    const campaign = await this.findOne(id);

    const jobStats = await this.emailJobRepository
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('job.campaign_id = :campaignId', { campaignId: id })
      .groupBy('job.status')
      .getRawMany();

    const stats = {
      total: campaign.jobs?.length || 0,
      sent: 0,
      failed: 0,
      pending: 0,
      queued: 0,
    };

    jobStats.forEach(stat => {
      stats[stat.status] = parseInt(stat.count);
    });

    return {
      campaign,
      stats,
    };
  }
}
