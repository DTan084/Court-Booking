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
  Put,
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
import { UpsertTimeSlotsDto, upsertTimeSlotsSchema } from './dto/upsert-time-slots.dto';
import { AddCourtImageDto, addCourtImageSchema } from './dto/add-court-image.dto';
import { ReorderCourtImagesDto, reorderCourtImagesSchema } from './dto/reorder-court-images.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, SportType } from '@court-booking/shared';
import { BookingsService } from '../bookings/bookings.service';
import { getScheduleSchema, GetScheduleDto } from '../bookings/dto/get-schedule.dto';
import { ApiErrorResponse } from '../../common/swagger/api-response.swagger';
import {
  CreateCourtBody,
  UpdateCourtBody,
  UpsertTimeSlotsBody,
  CourtResponse,
  CourtsListResponse,
  TimeSlotsResponse,
  CourtStatsResponse,
  DeleteCourtResponse,
} from './swagger/courts.swagger';
import { ScheduleResponse } from '../bookings/swagger/bookings.swagger';

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
  @ApiBody({ type: CreateCourtBody })
  @ApiResponse({ status: 201, description: 'Court created successfully', type: CourtResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ApiErrorResponse })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only', type: ApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createCourtSchema))
  async create(@Body() createCourtDto: CreateCourtDto) {
    return this.courtsService.create(createCourtDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courts with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'sportType', required: false, enum: SportType })
  @ApiQuery({ name: 'address', required: false, type: String })
  @ApiQuery({
    name: 'district',
    required: false,
    type: String,
    description: 'Exact match (case-insensitive)',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'ILIKE search in address',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of courts', type: CourtsListResponse })
  @UsePipes(new ZodValidationPipe(getCourtsSchema))
  async findAll(@Query() query: GetCourtsDto) {
    return this.courtsService.findAll(query);
  }

  @Get('districts')
  @ApiOperation({ summary: 'Get distinct districts of active courts (REQ-21.4)' })
  @ApiResponse({
    status: 200,
    description: 'List of districts',
    schema: { type: 'array', items: { type: 'string' } },
  })
  async getDistricts() {
    return this.courtsService.getDistricts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get court details' })
  @ApiResponse({ status: 200, description: 'Court details', type: CourtResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courtsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update court information (Admin only)' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateCourtBody })
  @ApiResponse({ status: 200, description: 'Court updated successfully', type: CourtResponse })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(updateCourtSchema))
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCourtDto: UpdateCourtDto) {
    return this.courtsService.update(id, updateCourtDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a court (Admin only)' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Court deleted successfully',
    type: DeleteCourtResponse,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
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
    example: '2026-06-15',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bookings for the date',
    type: ScheduleResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid date format', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  @UsePipes(new ZodValidationPipe(getScheduleSchema))
  async getSchedule(@Param('id', ParseUUIDPipe) id: string, @Query() query: GetScheduleDto) {
    return this.bookingsService.getCourtSchedule(id, query.date);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get court utilization statistics (Admin only)' })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'fromDate',
    required: true,
    type: String,
    description: 'Start date (ISO 8601)',
    example: '2026-05-01',
  })
  @ApiQuery({
    name: 'toDate',
    required: true,
    type: String,
    description: 'End date (ISO 8601)',
    example: '2026-05-31',
  })
  @ApiResponse({ status: 200, description: 'Court statistics', type: CourtStatsResponse })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(getCourtStatsSchema))
  async getStats(@Param('id', ParseUUIDPipe) id: string, @Query() query: GetCourtStatsDto) {
    return this.courtsService.getStats(id, query);
  }

  @Get(':id/time-slots')
  @ApiOperation({ summary: 'Get time slots for a court' })
  @ApiResponse({ status: 200, description: 'List of time slots', type: TimeSlotsResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  async getTimeSlots(@Param('id', ParseUUIDPipe) id: string) {
    return this.courtsService.getTimeSlots(id);
  }

  @Put(':id/time-slots')
  @ApiOperation({ summary: 'Replace all time slots for a court (Admin only)' })
  @ApiBearerAuth()
  @ApiBody({ type: UpsertTimeSlotsBody })
  @ApiResponse({
    status: 200,
    description: 'Time slots updated successfully',
    type: TimeSlotsResponse,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only', type: ApiErrorResponse })
  @ApiResponse({ status: 404, description: 'Court not found', type: ApiErrorResponse })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async upsertTimeSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(upsertTimeSlotsSchema)) body: UpsertTimeSlotsDto,
  ) {
    return this.courtsService.upsertTimeSlots(id, body);
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Add court image (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(addCourtImageSchema))
  async addImage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddCourtImageDto) {
    return this.courtsService.addImage(id, dto);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Delete court image (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    await this.courtsService.removeImage(id, imageId);
    return { message: 'Image deleted successfully', imageId };
  }

  @Patch(':id/images/reorder')
  @ApiOperation({ summary: 'Reorder court images (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UsePipes(new ZodValidationPipe(reorderCourtImagesSchema))
  async reorderImages(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderCourtImagesDto) {
    return this.courtsService.reorderImages(id, dto);
  }
}
