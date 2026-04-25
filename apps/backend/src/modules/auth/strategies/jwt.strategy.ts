// TODO: JWT Strategy
// - Lấy token từ Authorization: Bearer header
// - jwt.verify(token, secret) — kiểm tra chữ ký và expiry
// - Trả về payload { sub, role } → gán vào req.user

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: any) {
    // TODO: Return user payload { sub, role }
    return { userId: payload.sub, role: payload.role };
  }
}
