import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../config/database';

export const businessesRouter = Router();

businessesRouter.get('/', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const excludeCategory = typeof req.query.excludeCategory === 'string' ? req.query.excludeCategory.trim().toLowerCase() : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const minPriceValue = typeof req.query.minPrice === 'string' && req.query.minPrice.trim() ? Number(req.query.minPrice) : undefined;
  const maxPriceValue = typeof req.query.maxPrice === 'string' && req.query.maxPrice.trim() ? Number(req.query.maxPrice) : undefined;
  const minPrice = minPriceValue !== undefined && Number.isFinite(minPriceValue) && minPriceValue >= 0 ? minPriceValue : undefined;
  const maxPrice = maxPriceValue !== undefined && Number.isFinite(maxPriceValue) && maxPriceValue >= 0 ? maxPriceValue : undefined;
  const zone = typeof req.query.zone === 'string' && req.query.zone.trim() ? req.query.zone.trim() : undefined;
  const zoneType = typeof req.query.zoneType === 'string' ? req.query.zoneType : undefined;
  const features = typeof req.query.features === 'string' ? req.query.features.split(',') : [];
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '24'), 10) || 24));
  const andFilters: Prisma.BusinessWhereInput[] = [];
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceRange = { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) };
    andFilters.push({ OR: [
      { basePrice: priceRange },
      { roomTypes: { some: { isAvailable: true, nightlyRate: priceRange } } },
      { services: { some: { isAvailable: true, price: priceRange } } },
      { menuItems: { some: { isAvailable: true, price: priceRange } } },
    ] });
  }
  if (zone) andFilters.push({ zone: { equals: zone, mode: 'insensitive' } });
  const zoneTerms: Record<string, string[]> = {
    urban: ['centro', 'casco urbano', 'montería', 'puerto escondido', 'pueblo'],
    rural: ['rural', 'vereda', 'cristo rey', 'el prieto', 'boca de tinajones', 'manglar'],
    beach: ['playa', 'ensenada', 'bahía', 'bahia', 'mar', 'costa'],
  };
  if (zoneType && zoneTerms[zoneType]) {
    andFilters.push({ OR: zoneTerms[zoneType].flatMap((term) => [
      { zone: { contains: term, mode: 'insensitive' as const } },
      { address: { contains: term, mode: 'insensitive' as const } },
    ]) });
  }
  if (features.includes('pets')) andFilters.push({ accommodation: { is: { petsPolicy: { in: ['ALLOWED', 'ON_REQUEST'] } } } });
  const airConditioning = ['Aire acondicionado', 'A/C', 'AC', 'Climatización', 'Aire acondicionado en las habitaciones'];
  if (features.includes('air-conditioning')) andFilters.push({ OR: [
    { accommodation: { is: { amenities: { hasSome: airConditioning } } } },
    { roomTypes: { some: { isAvailable: true, amenities: { hasSome: airConditioning } } } },
  ] });
  const parking = ['Parqueadero', 'Parqueo', 'Estacionamiento', 'Parking'];
  if (features.includes('parking')) andFilters.push({ OR: [
    { accommodation: { is: { amenities: { hasSome: parking } } } },
    { roomTypes: { some: { isAvailable: true, amenities: { hasSome: parking } } } },
  ] });
  const where: Prisma.BusinessWhereInput = {
    status: 'APPROVED' as const,
    ...(category && category !== 'Todo' ? { category: { slug: category.toLowerCase() } } : {}),
    ...(excludeCategory ? { NOT: { category: { slug: excludeCategory } } } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { zone: { contains: search, mode: 'insensitive' as const } },
      { shortDescription: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
      { services: { some: { name: { contains: search, mode: 'insensitive' as const } } } },
      { menuItems: { some: { name: { contains: search, mode: 'insensitive' as const } } } },
    ] } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  };
  const [total, businesses, categoryRows, zoneRows] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
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
    }),
    prisma.category.findMany({ select: { slug: true, _count: { select: { businesses: { where: { status: 'APPROVED' } } } } } }),
    prisma.business.findMany({ where: { status: 'APPROVED' }, distinct: ['zone'], select: { zone: true }, orderBy: { zone: 'asc' } }),
  ]);
  const categoryCounts = Object.fromEntries(categoryRows.map((row) => [row.slug, row._count.businesses]));
  const zones = zoneRows.map((row) => row.zone);
  res.json({ data: businesses, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), categoryCounts, zones } });
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
