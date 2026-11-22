import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL debe empezar por postgresql://'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  CORS_ORIGIN: z.string().default('*'),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.map(String).join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`❌ Variables de entorno inválidas:\n${details}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
