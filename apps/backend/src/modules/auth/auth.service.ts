// TODO: Auth Service
// - bcrypt.hash(password, 10) — hash khi register
// - bcrypt.compare(plain, hash) — verify khi login
// - jwt.sign({ sub, role, exp }) — tạo access token
// - Throw ConflictException nếu email đã tồn tại

import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  // TODO: Inject JwtService, UserRepository

  // TODO: register(dto: RegisterDto)
  // TODO: login(dto: LoginDto)
  // TODO: validateUser(email, password)
  // TODO: generateTokens(user)
}
