import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Delete,
  Param,
  Patch,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CourtsService } from './courts.service';
import { CreateCourtDto, createCourtSchema } from './dto/create-court.dto';
import { GetCourtsDto, getCourtsSchema } from './dto/get-courts.dto';
import { UpdateCourtDto, updateCourtSchema } from './dto/update-court.dto';
import { GetCourtStatsDto, getCourtStatsSchema } from './dto/get-court-stats.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, SportType } from '@court-booking/shared';
import { BookingsService } from '../bookings/bookings.service';
import { getScheduleSchema, GetScheduleDto } from '../bookings/dto/get-schedule.dto';

@ApiTags('Courts')
@Controller('courts')
export class CourtsController {
  constructor(
    private readonly courtsService: CourtsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new court (Admin only)' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'sportType', 'address', 'pricePerHour'],
      properties: {
        name: { type: 'string', example: 'Sân Cầu Lông ABC' },
        sportType: {
          type: 'string',
          enum: Object.values(SportType),
          example: SportType.BADMINTON,
        },
        address: { type: 'string', example: '123 Nguyễn Huệ, Quận 1, TP.HCM' },
        pricePerHour: { type: 'number', example: 150000 },
        description: { type: 'string', example: 'Sân tiêu chuẩn thi đấu' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Court created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createCourtSchema))
  async create(@Body() createCourtDto: CreateCourtDto) {
    return this.courtsService.create(createCourtDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courts with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({
    name: 'sportType',
    required: false,
    enum: SportType,
  })
  @ApiQuery({ name: 'address', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of courts with pagination metadata' })
  @UsePipes(new ZodValidationPipe(getCourtsSchema))
  async findAll(@Query() query: GetCourtsDto) {
    return this.courtsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get court details' })
  @ApiResponse({ status: 200, description: 'Court details' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courtsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update court information (Admin only)' })
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Sân Cầu Lông ABC (Updated)' },
        sportType: {
          type: 'string',
          enum: Object.values(SportType),
          example: SportType.BADMINTON,
        },
        address: { type: 'string', example: '456 Lê Lợi, Quận 1, TP.HCM' },
        pricePerHour: { type: 'number', example: 180000 },
        description: { type: 'string', example: 'Sân vừa được nâng cấp mặt sàn' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Court updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(updateCourtSchema))
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCourtDto: UpdateCourtDto) {
    return this.courtsService.update(id, updateCourtDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a court (Admin only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Court deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.courtsService.softDelete(id);
    return { message: 'Court deleted successfully', id };
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get court schedule for a specific date' })
  @ApiQuery({
    name: 'date',
    required: true,
    type: String,
    description: 'Date in YYYY-MM-DD format',
  })
  @ApiResponse({ status: 200, description: 'List of bookings for the date' })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  @UsePipes(new ZodValidationPipe(getScheduleSchema))
  async getSchedule(@Param('id', ParseUUIDPipe) id: string, @Query() query: GetScheduleDto) {
    return this.bookingsService.getCourtSchedule(id, query.date);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get court statistics (Admin only)' })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'fromDate',
    required: true,
    type: String,
    description: 'Start date in ISO 8601 format',
  })
  @ApiQuery({
    name: 'toDate',
    required: true,
    type: String,
    description: 'End date in ISO 8601 format',
  })
  @ApiResponse({ status: 200, description: 'Court statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(getCourtStatsSchema))
  async getStats(@Param('id', ParseUUIDPipe) id: string, @Query() query: GetCourtStatsDto) {
    return this.courtsService.getStats(id, query);
  }
}
