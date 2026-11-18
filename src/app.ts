import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import { checkDatabaseConnection } from './config/database';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './shared/middlewares/error.middleware';
import { prisma } from './config/database';
import { authRouter } from './routes/auth.routes';
import { galleryRouter } from './routes/gallery.routes';
import { favoritesRouter } from './routes/favorites.routes';
import { hotelManagementRouter } from './routes/hotel-management.routes';
import { adminRouter } from './routes/admin.routes';

// Permite serializar BigInt (analytics_events.id) en las respuestas JSON
declare global {
  interface BigInt {
    toJSON(): string;
  }
}
BigInt.prototype.toJSON = function (this: bigint): string {
  return this.toString();
};

export const app = express();

// Las rutas de datos no deben contestar 304 a las consultas fetch del cliente:
// el frontend requiere el JSON para hidratar sus vistas en cada carga.
app.disable('etag');

// Nominatim es un servicio compartido; guardamos las consultas recientes en memoria
// y las solicitudes nuevas pasan por una pausa global para respetar su límite público.
const openMapSearchCache = new Map<string, { expiresAt: number; results: { lat: string; lon: string; display_name: string }[] }>();
let lastOpenMapSearchAt = 0;

const allowedOrigins =
  env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: env.CORS_ORIGIN !== '*' }));
// El límite permite recibir fotografías de hasta 5 MB codificadas en Base64.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// Router principal /api/v1
// ---------------------------------------------------------------------------
const apiRouter = Router();
apiRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

apiRouter.get('/health', async (_req, res) => {
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

// Búsqueda puntual y limitada al entorno de Puerto Escondido: no hacemos autocompletado.
apiRouter.get('/openmap/search', async (req, res) => {
  const query = z.string().trim().min(3).max(160).parse(req.query.q);
  const cacheKey = query.toLocaleLowerCase('es-CO');
  const cached = openMapSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ data: cached.results });
    return;
  }

  const waitMs = Math.max(0, 1_000 - (Date.now() - lastOpenMapSearchAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastOpenMapSearchAt = Date.now();

  const parameters = new URLSearchParams({
    q: `${query}, Puerto Escondido, Córdoba, Colombia`, format: 'jsonv2', addressdetails: '1',
    countrycodes: 'co', limit: '5', viewbox: '-76.6,9.3,-76.0,8.8', bounded: '0',
  });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${parameters}`, {
      headers: { 'User-Agent': 'PuertoEscondidoTourism/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);
    const rows = await response.json() as { lat: string; lon: string; display_name: string }[];
    const results = rows.slice(0, 5).map(({ lat, lon, display_name }) => ({ lat, lon, display_name }));
    openMapSearchCache.set(cacheKey, { expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, results });
    res.json({ data: results });
  } catch (error) {
    console.warn('No se pudo consultar Nominatim para el registro local:', error instanceof Error ? error.message : error);
    res.status(503).json({ error: { message: 'El buscador del mapa no está disponible en este momento. Puedes colocar el pin manualmente.' } });
  }
});

// Catálogo público de establecimientos, prestaciones, cartas y contenido municipal.
apiRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } });
  res.json({ data: categories });
});

apiRouter.get('/businesses', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const businesses = await prisma.business.findMany({
    where: {
      status: 'APPROVED',
      ...(category && category !== 'Todo' ? { category: { slug: category.toLowerCase() } } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { zone: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    },
    include: {
      category: true,
      // No enviar el binario junto con el directorio; las fotos almacenadas se sirven bajo demanda.
      media: { select: { id: true, imageUrl: true, mimeType: true, isCover: true, displayOrder: true }, orderBy: { displayOrder: 'asc' } },
      accommodation: true,
      roomTypes: { where: { isAvailable: true }, orderBy: { nightlyRate: 'asc' } },
      restaurantDetail: true,
      tourDetail: true,
      services: { where: { isAvailable: true }, orderBy: { displayOrder: 'asc' } },
      menuItems: { where: { isAvailable: true }, orderBy: { displayOrder: 'asc' } },
    },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  });
  res.json({ data: businesses });
});

// Sirve las fotos binarias del establecimiento sin incluirlas en la respuesta JSON del directorio.
apiRouter.get('/businesses/:businessId/media/:mediaId/image', async (req, res) => {
  const businessId = z.string().uuid().parse(req.params.businessId);
  const mediaId = z.string().uuid().parse(req.params.mediaId);
  const media = await prisma.businessMedia.findFirst({
    where: { id: mediaId, businessId },
    select: { imageData: true, mimeType: true },
  });
  if (!media?.imageData || !media.mimeType) {
    res.status(404).end();
    return;
  }
  res.set({
    'Content-Type': media.mimeType,
    'Content-Length': String(media.imageData.length),
    'Cache-Control': 'public, max-age=86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(media.imageData);
});

apiRouter.get('/municipality', async (_req, res) => {
  let profile = await prisma.municipalityProfile.findUnique({ where: { slug: 'puerto-escondido' } });
  if (!profile) {
    res.status(404).json({ message: 'Aún no hay contenido para el municipio.' });
    return;
  }

  // Consulta la API de Wikipedia de forma periódica y conserva una copia local como respaldo.
  const syncIsDue = !profile.wikipediaSyncedAt || Date.now() - profile.wikipediaSyncedAt.getTime() > 30 * 24 * 60 * 60 * 1000;
  if (syncIsDue) {
    try {
      const parameters = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'extracts|pageimages', exintro: '1', exsentences: '5', explaintext: '1', redirects: '1', titles: 'Puerto_Escondido_(Córdoba)', piprop: 'thumbnail', pithumbsize: '1600' });
      const response = await fetch(`https://es.wikipedia.org/w/api.php?${parameters}`, {
        headers: { 'User-Agent': 'PuertoEscondidoDestination/1.0 (municipality information; contact: local tourism platform)' },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const wikiData = await response.json() as { query?: { pages?: { extract?: string; thumbnail?: { source?: string } }[] } };
        const page = wikiData.query?.pages?.[0];
        if (page?.extract) {
          profile = await prisma.municipalityProfile.update({
            where: { id: profile.id },
            data: { wikipediaSummary: page.extract, wikipediaThumbnail: page.thumbnail?.source || profile.wikipediaThumbnail, wikipediaUrl: 'https://es.wikipedia.org/wiki/Puerto_Escondido_(C%C3%B3rdoba)', wikipediaSyncedAt: new Date() },
          });
        }
      }
    } catch (error) {
      // Mantiene la ficha guardada en PostgreSQL si Wikipedia no está disponible.
      console.warn('No se pudo actualizar el resumen de Wikipedia; se sirve el contenido local.', error instanceof Error ? error.message : error);
    }
  }
  res.json({ data: profile });
});

apiRouter.get('/municipality/media', async (_req, res) => {
  const profile = await prisma.municipalityProfile.findUnique({ where: { slug: 'puerto-escondido' }, select: { id: true } });
  if (!profile) { res.json({ data: [] }); return; }
  const photos = await prisma.municipalityMedia.findMany({
    where: { municipalityId: profile.id },
    select: { id: true, key: true, caption: true, period: true, imageUrl: true, mimeType: true, credit: true, sourceUrl: true, isHistorical: true, displayOrder: true, imageData: true },
    orderBy: { displayOrder: 'asc' },
  });
  res.json({ data: photos.map(({ imageData, ...photo }) => ({ ...photo, imageUrl: imageData ? `/api/v1/municipality/media/${photo.id}/image` : photo.imageUrl })) });
});

apiRouter.get('/municipality/media/:mediaId/image', async (req, res) => {
  const mediaId = z.string().uuid().parse(req.params.mediaId);
  const photo = await prisma.municipalityMedia.findUnique({ where: { id: mediaId }, select: { imageData: true, mimeType: true } });
  if (!photo?.imageData || !photo.mimeType) { res.status(404).end(); return; }
  // La web usa Vite en otro puerto; el permiso CORP debe dejar que el navegador muestre el binario desde la API local.
  res.set({ 'Content-Type': photo.mimeType, 'Content-Length': String(photo.imageData.length), 'Cache-Control': 'public, max-age=86400', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' });
  res.end(photo.imageData);
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/gallery', galleryRouter);
apiRouter.use('/favorites', favoritesRouter);
apiRouter.use('/hotel-management', hotelManagementRouter);
apiRouter.use('/admin', adminRouter);

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
