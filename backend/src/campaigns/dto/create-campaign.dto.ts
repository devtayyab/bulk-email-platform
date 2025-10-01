import { IsString, IsArray, IsObject, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
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
  @IsOptional()
  recipients?: RecipientDto[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  includeExistingEmails?: boolean;
}
