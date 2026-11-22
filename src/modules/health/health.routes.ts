import { Router } from 'express';
import { checkDatabaseConnection } from '../../config/database';
import { env } from '../../config/env';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    const db = await checkDatabaseConnection();
    res.status(200).json({
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: { connected: true, name: db.database, serverTime: db.serverTime },
    });
  } catch (error) {
    console.error('Health check: fallo de conexión con la base de datos', error);
    res.status(503).json({
      status: 'error',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: { connected: false },
    });
  }
});
