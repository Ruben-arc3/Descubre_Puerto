import { app } from './app';
import { checkDatabaseConnection, prisma } from './config/database';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  try {
    const db = await checkDatabaseConnection();
    console.log(`✅ PostgreSQL conectado (base de datos: ${db.database})`);
  } catch (error) {
    console.error('❌ No se pudo conectar a PostgreSQL. Revisa DATABASE_URL en tu .env', error);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 API Puerto Escondido en http://localhost:${env.PORT}/api/v1 [${env.NODE_ENV}]`);
  });

  const shutdown = (signal: string): void => {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('👋 Servidor y conexión a la base de datos cerrados');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void bootstrap();