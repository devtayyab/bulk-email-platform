import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('email_jobs')
export class EmailJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.jobs)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column()
  recipientEmail: string;

  @Column({ type: 'jsonb', nullable: true })
  recipientData: Record<string, any>;

  @Column({ default: 'pending' })
  status: 'pending' | 'queued' | 'sent' | 'failed';

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
