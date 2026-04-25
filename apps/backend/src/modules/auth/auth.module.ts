// TODO: Auth Module
// - imports: [JwtModule, TypeOrmModule.forFeature([User])]
// - providers: [AuthService, JwtStrategy]
// - controllers: [AuthController]

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    // TODO: JwtModule.registerAsync({ ... })
    // TODO: TypeOrmModule.forFeature([UserEntity])
    // TODO: PassportModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // TODO: JwtStrategy
  ],
  exports: [AuthService],
})
export class AuthModule {}
