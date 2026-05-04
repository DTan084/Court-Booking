import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API root endpoint' })
  @ApiResponse({
    status: 200,
    description: 'API information',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Court Booking API' },
            version: { type: 'string', example: '1.0.0' },
            description: { type: 'string', example: 'Enterprise court booking system' },
            documentation: { type: 'string', example: '/api/docs' },
            health: { type: 'string', example: '/api/v1/health' },
          },
        },
      },
    },
  })
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
