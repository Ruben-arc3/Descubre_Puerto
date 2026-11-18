import { PrismaClient } from '../../generated/prisma';
import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseInfo {
  database: string;
  serverTime: Date;
}

export async function checkDatabaseConnection(): Promise<DatabaseInfo> {
  const rows = await prisma.$queryRaw<{ database: string; server_time: Date }[]>`
    SELECT current_database() AS database, NOW() AS server_time
  `;
  const row = rows[0];
  if (!row) {
    throw new Error('La base de datos no devolvió resultados');
  }
  return { database: row.database, serverTime: row.server_time };
}
