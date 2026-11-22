import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';

export const businessesRouter = Router();

businessesRouter.get('/', async (req, res) => {
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

businessesRouter.get('/:businessId/media/:mediaId/image', async (req, res) => {
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
