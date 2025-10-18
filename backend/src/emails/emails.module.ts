import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { EmailJob } from '../email-jobs/entities/email-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailJob])],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
