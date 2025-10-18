import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

    // Get recipients - priority order:
    // 1. Selected emails from existing emails
    // 2. Uploaded recipients
    // 3. All existing emails (if includeExistingEmails is true)
    let recipients = [];

    // If specific emails are selected, use those
    if (createCampaignDto.selectedEmails && createCampaignDto.selectedEmails.length > 0) {
      recipients = await this.getEmailsByList(createCampaignDto.selectedEmails);
    }
    // If recipients are uploaded, use those
    else if (createCampaignDto.recipients && createCampaignDto.recipients.length > 0) {
      recipients = createCampaignDto.recipients;
    }
    // If includeExistingEmails is true, get all existing emails
    else if (createCampaignDto.includeExistingEmails) {
      recipients = await this.getAllExistingEmails();
    }

    // Merge uploaded recipients with selected emails if both exist
    if (createCampaignDto.selectedEmails && createCampaignDto.selectedEmails.length > 0 &&
        createCampaignDto.recipients && createCampaignDto.recipients.length > 0) {
      const selectedEmails = await this.getEmailsByList(createCampaignDto.selectedEmails);
      const emailSet = new Set(selectedEmails.map(r => r.email));
      
      // Add new recipients that aren't already in selected emails
      const newRecipients = createCampaignDto.recipients.filter(r => !emailSet.has(r.email));
      recipients = [...selectedEmails, ...newRecipients];
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No recipients found. Please provide recipients, select existing emails, or enable includeExistingEmails.');
    }

    // Create email jobs from the recipients
    const emailJobs = recipients.map(recipient => ({
      campaignId: savedCampaign.id,
      recipientEmail: recipient.email,
      recipientData: recipient.data || {},
      status: 'pending' as const,
    }));

    await this.emailJobRepository.save(emailJobs);

    return savedCampaign;
  }

  async getAllExistingEmails() {
    // Use database query to get distinct emails directly (more efficient for large datasets)
    const distinctEmails = await this.emailJobRepository
      .createQueryBuilder('job')
      .select('job.recipientEmail', 'email')
      .addSelect('job.recipientData', 'data')
      .distinct(true)
      .getRawMany();

    // Group by email and merge data in application layer
    const emailMap = new Map<string, any>();
    distinctEmails.forEach(row => {
      const email = row.email;
      const data = row.data;

      if (!emailMap.has(email)) {
        emailMap.set(email, {
          email,
          data: data || {},
        });
      } else {
        // Merge data if email already exists
        const existingData = emailMap.get(email)?.data || {};
        emailMap.set(email, {
          email,
          data: { ...existingData, ...(data || {}) },
        });
      }
    });

    return Array.from(emailMap.values());
  }

  async getEmailsByList(emails: string[]) {
    if (!emails || emails.length === 0) {
      return [];
    }

    const results = await this.emailJobRepository
      .createQueryBuilder('job')
      .select('job.recipientEmail', 'email')
      .addSelect('job.recipientData', 'data')
      .where('job.recipientEmail IN (:...emails)', { emails })
      .distinct(true)
      .getRawMany();

    // Group by email and merge data
    const emailMap = new Map<string, any>();
    
    results.forEach(row => {
      const email = row.email;
      const data = row.data || {};

      if (!emailMap.has(email)) {
        emailMap.set(email, {
          email,
          data,
        });
      } else {
        const existing = emailMap.get(email);
        existing.data = { ...existing.data, ...data };
      }
    });

    return Array.from(emailMap.values());
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

  async updateCampaignStatus(id: string, status: 'draft' | 'queued' | 'sending' | 'completed' | 'failed') {
    const campaign = await this.findOne(id);
    campaign.status = status;
    return await this.campaignRepository.save(campaign);
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    
    // Delete all associated email jobs first
    await this.emailJobRepository.delete({ campaignId: id });
    
    // Delete the campaign
    await this.campaignRepository.remove(campaign);
  }
}
