import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import * as XLSX from 'xlsx';

export interface ParsedRecipient {
  email: string;
  data?: Record<string, any>;
}

@Injectable()
export class FileUploadService {
  async parseCSV(filePath: string): Promise<ParsedRecipient[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedRecipient[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => {
          // Assume first column is email, rest are custom data
          const email = Object.values(data)[0] as string;
          const recipientData = { ...data };
          delete recipientData[Object.keys(data)[0]]; // Remove email from data

          results.push({
            email: email.trim(),
            data: Object.keys(recipientData).length > 0 ? recipientData : undefined,
          });
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  async parseExcel(filePath: string): Promise<ParsedRecipient[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    return jsonData.map((row: any) => {
      // Assume first column is email, rest are custom data
      const email = Object.values(row)[0] as string;
      const recipientData = { ...row };
      delete recipientData[Object.keys(row)[0]]; // Remove email from data

      return {
        email: email.trim(),
        data: Object.keys(recipientData).length > 0 ? recipientData : undefined,
      };
    });
  }

  async parseFile(file: Express.Multer.File): Promise<ParsedRecipient[]> {
    const filePath = file.path;
    const extension = path.extname(file.originalname).toLowerCase();

    try {
      let recipients: ParsedRecipient[];

      if (extension === '.csv') {
        recipients = await this.parseCSV(filePath);
      } else if (extension === '.xlsx' || extension === '.xls') {
        recipients = await this.parseExcel(filePath);
      } else {
        throw new BadRequestException('Unsupported file format. Please upload CSV or Excel files.');
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      // Validate email addresses
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validRecipients = recipients.filter(r => emailRegex.test(r.email));

      if (validRecipients.length === 0) {
        throw new BadRequestException('No valid email addresses found in the file.');
      }

      return validRecipients;
    } catch (error) {
      // Clean up file in case of error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }
}
