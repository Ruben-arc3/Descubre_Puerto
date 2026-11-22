import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';

export const municipalityRouter = Router();

municipalityRouter.get('/', async (_req, res) => {
  let profile = await prisma.municipalityProfile.findUnique({ where: { slug: 'puerto-escondido' } });
  if (!profile) {
    res.status(404).json({ message: 'Aún no hay contenido para el municipio.' });
    return;
  }

  const syncIsDue = !profile.wikipediaSyncedAt || Date.now() - profile.wikipediaSyncedAt.getTime() > 30 * 24 * 60 * 60 * 1000;
  if (syncIsDue) {
    try {
      const parameters = new URLSearchParams({
        action: 'query', format: 'json', formatversion: '2', prop: 'extracts|pageimages', exintro: '1',
        exsentences: '5', explaintext: '1', redirects: '1', titles: 'Puerto_Escondido_(Córdoba)', piprop: 'thumbnail', pithumbsize: '1600',
      });
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
            data: {
              wikipediaSummary: page.extract,
              wikipediaThumbnail: page.thumbnail?.source || profile.wikipediaThumbnail,
              wikipediaUrl: 'https://es.wikipedia.org/wiki/Puerto_Escondido_(C%C3%B3rdoba)',
              wikipediaSyncedAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.warn('No se pudo actualizar el resumen de Wikipedia; se sirve el contenido local.', error instanceof Error ? error.message : error);
    }
  }
  res.json({ data: profile });
});

municipalityRouter.get('/media', async (_req, res) => {
  const profile = await prisma.municipalityProfile.findUnique({ where: { slug: 'puerto-escondido' }, select: { id: true } });
  if (!profile) { res.json({ data: [] }); return; }
  const photos = await prisma.municipalityMedia.findMany({
    where: { municipalityId: profile.id },
    select: { id: true, key: true, caption: true, period: true, imageUrl: true, mimeType: true, credit: true, sourceUrl: true, isHistorical: true, displayOrder: true, imageData: true },
    orderBy: { displayOrder: 'asc' },
  });
  res.json({ data: photos.map(({ imageData, ...photo }) => ({ ...photo, imageUrl: imageData ? `/api/v1/municipality/media/${photo.id}/image` : photo.imageUrl })) });
});

municipalityRouter.get('/media/:mediaId/image', async (req, res) => {
  const mediaId = z.string().uuid().parse(req.params.mediaId);
  const photo = await prisma.municipalityMedia.findUnique({ where: { id: mediaId }, select: { imageData: true, mimeType: true } });
  if (!photo?.imageData || !photo.mimeType) { res.status(404).end(); return; }
  res.set({
    'Content-Type': photo.mimeType,
    'Content-Length': String(photo.imageData.length),
    'Cache-Control': 'public, max-age=86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(photo.imageData);
});
