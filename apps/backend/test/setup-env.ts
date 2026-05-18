import * as dotenv from 'dotenv';
import * as path from 'path';

const repoRoot = path.resolve(process.cwd(), '../..');

dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true });
dotenv.config({ path: path.join(repoRoot, '.env.docker'), override: true, quiet: true });
dotenv.config({ path: path.join(repoRoot, '.env.e2e'), override: true, quiet: true });

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
