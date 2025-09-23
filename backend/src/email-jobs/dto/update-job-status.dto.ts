import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateJobStatusDto {
  @IsString()
  status: 'pending' | 'queued' | 'sent' | 'failed';

  @IsString()
  @IsOptional()
  error?: string;

  @IsNumber()
  @IsOptional()
  retryCount?: number;
}
