import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailJob } from './entities/email-job.entity';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Injectable()
export class EmailJobsService {
  constructor(
    @InjectRepository(EmailJob)
    private emailJobRepository: Repository<EmailJob>,
  ) {}

  async findByCampaignId(campaignId: string): Promise<EmailJob[]> {
    return this.emailJobRepository.find({
      where: { campaignId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EmailJob> {
    const job = await this.emailJobRepository.findOne({
      where: { id },
      relations: ['campaign'],
    });

    if (!job) {
      throw new BadRequestException('Email job not found');
    }

    return job;
  }

  async updateStatus(id: string, updateJobStatusDto: UpdateJobStatusDto): Promise<EmailJob> {
    const job = await this.findOne(id);

    job.status = updateJobStatusDto.status;
    job.error = updateJobStatusDto.error;
    job.retryCount = updateJobStatusDto.retryCount || job.retryCount;

    if (updateJobStatusDto.status === 'sent') {
      job.sentAt = new Date();
    }

    return this.emailJobRepository.save(job);
  }

  async retryFailedJobs(campaignId: string): Promise<void> {
    const failedJobs = await this.emailJobRepository.find({
      where: {
        campaignId,
        status: 'failed',
        retryCount: 0, // Only retry jobs that haven't been retried yet
      },
    });

    for (const job of failedJobs) {
      job.status = 'pending';
      job.retryCount += 1;
      job.error = null;

      await this.emailJobRepository.save(job);
    }
  }
}
