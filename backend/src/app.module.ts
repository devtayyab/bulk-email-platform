import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import configuration from './config/configuration';
import { CampaignsModule } from './campaigns/campaigns.module';
import { EmailJobsModule } from './email-jobs/email-jobs.module';
import { EmailService } from './email/email.service';
import { SqsService } from './sqs/sqs.service';
import { FileUploadModule } from './file-upload/file-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    CampaignsModule,
    EmailJobsModule,
    FileUploadModule,
  ],
  controllers: [AppController],
  providers: [AppService, EmailService, SqsService],
})
export class AppModule {}
