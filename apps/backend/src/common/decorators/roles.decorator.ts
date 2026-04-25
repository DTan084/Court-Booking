// TODO: @Roles() decorator
// - Gắn metadata cho RolesGuard đọc
// - Usage: @Roles(Role.ADMIN)

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
