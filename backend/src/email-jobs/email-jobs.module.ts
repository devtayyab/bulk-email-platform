import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailJobsController } from './email-jobs.controller';
import { EmailJobsService } from './email-jobs.service';
import { EmailJob } from './entities/email-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailJob])],
  controllers: [EmailJobsController],
  providers: [EmailJobsService],
  exports: [EmailJobsService],
})
export class EmailJobsModule {}
