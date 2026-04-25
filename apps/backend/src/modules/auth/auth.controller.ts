// TODO: Auth Controller
// - @Post("/register") register(@Body() dto: RegisterDto)
// - @Post("/login") login(@Body() dto: LoginDto)
// - @UseGuards(JwtAuthGuard) cho protected routes

import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // TODO: POST /auth/register
  // TODO: POST /auth/login
  // TODO: POST /auth/refresh
}
