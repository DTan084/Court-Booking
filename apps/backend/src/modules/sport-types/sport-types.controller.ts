import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '@court-booking/shared';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SportTypesService } from './sport-types.service';

const createSportTypeSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(100).optional(),
  color: z.string().max(7).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const updateSportTypeSchema = createSportTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

@Controller()
export class SportTypesController {
  constructor(private readonly sportTypesService: SportTypesService) {}

  @Get('sport-types')
  listPublic() {
    return this.sportTypesService.listPublic();
  }

  @Get('admin/sport-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAdmin() {
    return this.sportTypesService.listAdmin();
  }

  @Post('admin/sport-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createSportTypeSchema)) body: z.infer<typeof createSportTypeSchema>,
  ) {
    return this.sportTypesService.create(body);
  }

  @Patch('admin/sport-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSportTypeSchema)) body: z.infer<typeof updateSportTypeSchema>,
  ) {
    return this.sportTypesService.update(id, body);
  }

  @Delete('admin/sport-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.sportTypesService.remove(id);
  }

  @Delete('admin/sport-types/:id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  hardRemove(@Param('id') id: string) {
    return this.sportTypesService.hardRemove(id);
  }
}
