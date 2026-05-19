import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

class ApiInfoData {
  @ApiProperty({ example: 'Court Booking API' })
  name: string;

  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'Enterprise court booking system' })
  description: string;

  @ApiProperty({ example: '/api/docs' })
  documentation: string;

  @ApiProperty({ example: '/api/v1/health' })
  health: string;
}

class ApiInfoResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ApiInfoData })
  data: ApiInfoData;
}

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API information' })
  @ApiResponse({ status: 200, description: 'API information', type: ApiInfoResponse })
  getRoot() {
    return {
      name: 'Court Booking API',
      version: '1.0.0',
      description: 'Enterprise court booking system',
      documentation: '/api/docs',
      health: '/api/v1/health',
    };
  }
}
