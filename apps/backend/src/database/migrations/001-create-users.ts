// TODO: Migration — Create users table
// - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
// - name VARCHAR(100) NOT NULL
// - email VARCHAR(255) UNIQUE NOT NULL
// - password_hash TEXT NOT NULL
// - phone VARCHAR(20)
// - role VARCHAR(20) DEFAULT 'user'
// - created_at TIMESTAMPTZ DEFAULT NOW()
// - updated_at TIMESTAMPTZ DEFAULT NOW()
// - deleted_at TIMESTAMPTZ

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: CREATE TABLE users
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: DROP TABLE users
  }
}
