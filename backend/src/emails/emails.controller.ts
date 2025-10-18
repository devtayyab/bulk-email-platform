import { Controller, Get, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EmailsService } from './emails.service';

@ApiTags('emails')
@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all unique emails from email jobs' })
  @ApiResponse({ status: 200, description: 'List of all unique emails with their data' })
  @ApiQuery({ name: 'search', required: false, description: 'Search emails by email address' })
  async getAllEmails(@Query('search') search?: string) {
    return this.emailsService.getAllEmails(search);
  }

  @Delete(':email')
  @ApiOperation({ summary: 'Delete all email jobs for a specific email address' })
  @ApiResponse({ status: 200, description: 'Email deleted successfully' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async deleteEmail(@Param('email') email: string) {
    await this.emailsService.deleteEmail(email);
    return { message: 'Email deleted successfully' };
  }
}
