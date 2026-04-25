// TODO: Courts Controller
// - GET /courts — list with filter + pagination
// - GET /courts/:id — court detail
// - POST /courts — create (admin only)
// - PATCH /courts/:id — update (admin only)
// - DELETE /courts/:id — soft delete (admin only)

import { Controller } from '@nestjs/common';
import { CourtsService } from './courts.service';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  // TODO: Implement endpoints
}
