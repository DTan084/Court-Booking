import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@court-booking/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FeaturesService } from './features.service';

const createFeatureSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
});

const updateFeatureSchema = createFeatureSchema.partial().extend({
  isActive: z.boolean().optional(),
});
const syncCourtFeaturesSchema = z.object({
  featureIds: z.array(z.string().uuid()).default([]),
});

@Controller()
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get('features')
  list() {
    return this.featuresService.list();
  }

  @Get('admin/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAdmin() {
    return this.featuresService.listAdmin();
  }

  @Post('admin/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createFeatureSchema)) body: z.infer<typeof createFeatureSchema>,
  ) {
    return this.featuresService.create(body);
  }

  @Patch('admin/features/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFeatureSchema)) body: z.infer<typeof updateFeatureSchema>,
  ) {
    return this.featuresService.update(id, body);
  }

  @Delete('admin/features/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.featuresService.remove(id);
  }

  @Delete('admin/features/:id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  hardRemove(@Param('id') id: string) {
    return this.featuresService.hardRemove(id);
  }

  @Put('courts/:id/features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  syncCourtFeatures(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(syncCourtFeaturesSchema))
    body: z.infer<typeof syncCourtFeaturesSchema>,
  ) {
    return this.featuresService.syncCourtFeatures(id, body.featureIds);
  }
}
