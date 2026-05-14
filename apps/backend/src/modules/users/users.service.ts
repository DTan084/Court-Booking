import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly PROFILE_UPDATE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findMe(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findMe(id);
    this.assertProfileUpdateAllowed(user);

    Object.assign(user, updateUserDto);
    user.updatedAt = new Date();

    return this.userRepository.save(user);
  }

  private assertProfileUpdateAllowed(user: UserEntity) {
    if (!user.updatedAt) return;

    const nextAllowedAt = new Date(user.updatedAt.getTime() + this.PROFILE_UPDATE_COOLDOWN_MS);
    if (Date.now() < nextAllowedAt.getTime()) {
      throw new HttpException(
        `Ban chi duoc cap nhat ho so 1 lan moi 30 ngay. Thu lai sau: ${nextAllowedAt.toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
