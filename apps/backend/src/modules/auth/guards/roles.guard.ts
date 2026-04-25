// TODO: Roles Guard
// - Kiểm tra req.user.role với @Roles() decorator
// - Trả 403 nếu role không đủ quyền

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // TODO: Get required roles from @Roles() metadata
    // TODO: Check req.user.role against required roles
    return true;
  }
}
