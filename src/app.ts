import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './shared/middlewares/error.middleware';

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function (this: bigint): string {
  return this.toString();
};

export const app = express();

// El cliente necesita respuestas JSON nuevas en cada carga para hidratar sus vistas.
app.disable('etag');

const allowedOrigins = env.CORS_ORIGIN === '*'
  ? env.NODE_ENV === 'development'
  : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
