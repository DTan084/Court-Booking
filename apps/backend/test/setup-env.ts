import * as dotenv from 'dotenv';
import * as path from 'path';

const repoRoot = path.resolve(process.cwd(), '../..');

dotenv.config({ path: path.join(repoRoot, '.env.e2e') });
dotenv.config({ path: path.join(repoRoot, '.env.docker') });
dotenv.config({ path: path.join(repoRoot, '.env') });

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
