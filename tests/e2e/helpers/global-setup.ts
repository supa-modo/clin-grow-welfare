import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup() {
  const serverDir = path.resolve(process.cwd(), '../server');
  execSync('npx prisma migrate reset --force --skip-generate', {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
}
