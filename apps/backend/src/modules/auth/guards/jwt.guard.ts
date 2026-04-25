// TODO: JWT Auth Guard
// - Verify JWT token, populate req.user
// - Trả 401 nếu không có token hoặc token invalid

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // TODO: Override canActivate nếu cần custom logic
}
