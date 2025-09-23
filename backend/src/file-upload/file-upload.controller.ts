import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileUploadService, ParsedRecipient } from './file-upload.service';

@ApiTags('file-upload')
@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse uploaded file and extract email addresses' })
  @ApiResponse({ status: 200, description: 'File parsed successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async parseFile(@UploadedFile() file: Express.Multer.File): Promise<{ recipients: ParsedRecipient[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const recipients = await this.fileUploadService.parseFile(file);
    return { recipients };
  }
}
