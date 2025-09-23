import { Controller, Get, Post, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignsService.create(createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'List of all campaigns' })
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a campaign' })
  @ApiResponse({ status: 200, description: 'Campaign started' })
  startCampaign(@Param('id') id: string) {
    return this.campaignsService.startCampaign(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiResponse({ status: 200, description: 'Campaign statistics' })
  getStats(@Param('id') id: string) {
    return this.campaignsService.getCampaignStats(id);
  }
}
