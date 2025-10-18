import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EmailJob } from '../email-jobs/entities/email-job.entity';

export interface EmailWithData {
  email: string;
  data: Record<string, any>;
  jobCount: number;
  lastUsed: Date;
}

@Injectable()
export class EmailsService {
  constructor(
    @InjectRepository(EmailJob)
    private emailJobRepository: Repository<EmailJob>,
  ) {}

  async getAllEmails(search?: string): Promise<EmailWithData[]> {
    let query = this.emailJobRepository
      .createQueryBuilder('job')
      .select('job.recipientEmail', 'email')
      .addSelect('job.recipientData', 'data')
      .addSelect('COUNT(*)', 'jobCount')
      .addSelect('MAX(job.createdAt)', 'lastUsed')
      .groupBy('job.recipientEmail, job.recipientData');

    if (search) {
      query = query.where('job.recipientEmail ILIKE :search', { 
        search: `%${search}%` 
      });
    }

    query = query.orderBy('MAX(job.createdAt)', 'DESC');

    const results = await query.getRawMany();

    // Group by email and merge data
    const emailMap = new Map<string, EmailWithData>();
    
    results.forEach(row => {
      const email = row.email;
      const data = row.data || {};
      const jobCount = parseInt(row.jobCount);
      const lastUsed = row.lastUsed;

      if (!emailMap.has(email)) {
        emailMap.set(email, {
          email,
          data,
          jobCount,
          lastUsed,
        });
      } else {
        // Merge data and update counts
        const existing = emailMap.get(email)!;
        existing.data = { ...existing.data, ...data };
        existing.jobCount += jobCount;
        if (new Date(lastUsed) > new Date(existing.lastUsed)) {
          existing.lastUsed = lastUsed;
        }
      }
    });

    return Array.from(emailMap.values());
  }

  async deleteEmail(email: string): Promise<void> {
    const jobs = await this.emailJobRepository.find({
      where: { recipientEmail: email },
    });

    if (jobs.length === 0) {
      throw new NotFoundException(`Email ${email} not found`);
    }

    await this.emailJobRepository.remove(jobs);
  }

  async getEmailsByList(emails: string[]): Promise<EmailWithData[]> {
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
    const emailMap = new Map<string, EmailWithData>();
    
    results.forEach(row => {
      const email = row.email;
      const data = row.data || {};

      if (!emailMap.has(email)) {
        emailMap.set(email, {
          email,
          data,
          jobCount: 1,
          lastUsed: new Date(),
        });
      } else {
        const existing = emailMap.get(email)!;
        existing.data = { ...existing.data, ...data };
      }
    });

    return Array.from(emailMap.values());
  }
}
