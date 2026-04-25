// TODO: Migration — Create courts + bookings tables
// - courts: id, name, sport_type, address, description, price_per_hour, is_active, timestamps
// - bookings: id, court_id (FK), user_id (FK), start_time, end_time, status, total_price, timestamps
// - Index: idx_bookings_court_time

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourtsBookings1000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: CREATE TABLE courts
    // TODO: CREATE TABLE bookings
    // TODO: CREATE INDEX idx_bookings_court_time
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: DROP TABLE bookings
    // TODO: DROP TABLE courts
  }
}
