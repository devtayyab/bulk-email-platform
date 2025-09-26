import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Campaign } from './src/campaigns/entities/campaign.entity';
import { EmailJob } from './src/email-jobs/entities/email-job.entity';
import configuration from './src/config/configuration';

ConfigModule.forRoot({
  isGlobal: true,
  load: [configuration],
});

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.database'),
  entities: [Campaign, EmailJob],
  synchronize: true, // Enable synchronization for CLI
  logging: configService.get('NODE_ENV') === 'development',
});
