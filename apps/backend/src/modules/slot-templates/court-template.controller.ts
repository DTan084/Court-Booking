import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@court-booking/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SlotTemplatesService } from './slot-templates.service';

const applySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

@Controller('admin/courts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CourtTemplateController {
  constructor(private readonly service: SlotTemplatesService) {}

  @Post(':id/apply-template/:templateId')
  apply(
    @Param('id') courtId: string,
    @Param('templateId') templateId: string,
    @Body(new ZodValidationPipe(applySchema)) body: z.infer<typeof applySchema>,
  ) {
    return this.service.applyTemplate(courtId, templateId, body);
  }
}
