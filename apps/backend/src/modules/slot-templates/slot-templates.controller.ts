import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@court-booking/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SlotTemplatesService } from './slot-templates.service';

const itemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.string(),
  endHour: z.string(),
  price: z.number().min(0),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  items: z.array(itemSchema).optional(),
});

const updateSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const replaceItemsSchema = z.object({
  items: z.array(itemSchema),
});

const applySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

@Controller('admin/slot-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SlotTemplatesController {
  constructor(private readonly service: SlotTemplatesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return this.service.update(id, body);
  }

  @Put(':id/items')
  replaceItems(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replaceItemsSchema)) body: z.infer<typeof replaceItemsSchema>,
  ) {
    return this.service.replaceItems(id, body.items);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('/apply/:templateId/courts/:courtId')
  apply(
    @Param('templateId') templateId: string,
    @Param('courtId') courtId: string,
    @Body(new ZodValidationPipe(applySchema)) body: z.infer<typeof applySchema>,
  ) {
    return this.service.applyTemplate(courtId, templateId, body);
  }
}
