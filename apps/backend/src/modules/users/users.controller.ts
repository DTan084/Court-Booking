import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UsePipes,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserDto, updateUserSchema } from './dto/update-user.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getMe(@CurrentUser() user: any) {
    return this.usersService.findMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  async updateMe(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, updateUserDto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const targetDir = join(process.cwd(), 'uploads', 'avatars');
          if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
          }
          cb(null, targetDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('File upload phai la hinh anh'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Vui long chon file anh de upload');
    }

    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${file.filename}`;
    return { url: avatarUrl };
  }
}
