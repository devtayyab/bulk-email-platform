import { IsString, IsArray, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class RecipientDto {
  @IsString()
  email: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
