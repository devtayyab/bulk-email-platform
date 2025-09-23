import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailJobsService } from './email-jobs.service';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@ApiTags('email-jobs')
@Controller('email-jobs')
export class EmailJobsController {
  constructor(private readonly emailJobsService: EmailJobsService) {}

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Get email jobs by campaign ID' })
  @ApiResponse({ status: 200, description: 'List of email jobs' })
  findByCampaignId(@Param('campaignId') campaignId: string) {
    return this.emailJobsService.findByCampaignId(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email job by ID' })
  @ApiResponse({ status: 200, description: 'Email job details' })
  findOne(@Param('id') id: string) {
    return this.emailJobsService.findOne(id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update email job status' })
  @ApiResponse({ status: 200, description: 'Job status updated' })
  updateStatus(@Param('id') id: string, @Body() updateJobStatusDto: UpdateJobStatusDto) {
    return this.emailJobsService.updateStatus(id, updateJobStatusDto);
  }
}
