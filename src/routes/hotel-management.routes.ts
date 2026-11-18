import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../config/database';
import { requireAuth, requireRole } from '../shared/middlewares/auth.middleware';
import { BadRequestError, NotFoundError } from '../shared/errors/AppError';

export const hotelManagementRouter = Router();
hotelManagementRouter.use(requireAuth, requireRole('BUSINESS_OWNER', 'SUPERADMIN', 'ALCALDIA_ADMIN'));

const roomInput = z.object({
  name: z.string().trim().min(2).max(160), description: z.string().trim().min(5).max(3000),
  maxAdults: z.coerce.number().int().min(1).max(30), maxChildren: z.coerce.number().int().min(0).max(30),
  bedDescription: z.string().trim().min(2).max(180), areaSqm: z.coerce.number().positive().max(10000).nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(1000), nightlyRate: z.coerce.number().positive().max(100000000),
  breakfastIncluded: z.boolean().default(false), refundable: z.boolean().default(true),
  cancellationPolicy: z.string().trim().min(3).max(255), prepaymentPolicy: z.string().trim().min(3).max(255),
  amenities: z.array(z.string().trim().min(1).max(80)).max(40).default([]), isAvailable: z.boolean().default(true),
});
const hotelInput = z.object({
  name: z.string().trim().min(3).max(180), zone: z.string().trim().min(2).max(120),
  shortDescription: z.string().trim().min(5).max(160), description: z.string().trim().min(20).max(5000),
  address: z.string().trim().min(5).max(255), whatsappNumber: z.string().trim().min(7).max(20),
  latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
  categorySlug: z.enum(['hoteles', 'restaurantes', 'tours']).default('hoteles'),
  basePrice: z.coerce.number().positive().max(100000000).nullable().optional(),
  priceUnit: z.string().trim().max(50).optional(),
});
const restaurantInput = z.object({
  openingHours: z.record(z.string(), z.string()).default({}),
  closedDays: z.array(z.string().max(30)).max(7).default([]),
  serviceOptions: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  paymentMethods: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  dietaryOptions: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  atmosphere: z.string().trim().max(180).nullable().optional(), capacity: z.coerce.number().int().positive().max(10000).nullable().optional(),
  averageSpend: z.coerce.number().positive().max(100000000).nullable().optional(), reservationRequired: z.boolean().default(false),
  accessibilityInfo: z.string().max(1500).nullable().optional(),
});
const tourInput = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(10080), schedules: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  meetingPoint: z.string().trim().min(3).max(255), minGroupSize: z.coerce.number().int().min(1).max(1000).default(1),
  maxGroupSize: z.coerce.number().int().min(1).max(1000).nullable().optional(), minAge: z.coerce.number().int().min(0).max(120).nullable().optional(),
  maxAge: z.coerce.number().int().min(0).max(120).nullable().optional(), included: z.array(z.string().trim().min(1).max(100)).max(40).default([]),
  requirements: z.array(z.string().trim().min(1).max(150)).max(40).default([]), physicalLevel: z.string().trim().min(2).max(80).default('Suave'),
  languages: z.array(z.string().trim().min(2).max(60)).max(20).default(['Español']), cancellationPolicy: z.string().trim().max(255).default('Consultar con el operador'),
  weatherPolicy: z.string().trim().max(255).nullable().optional(), accessibilityInfo: z.string().max(1500).nullable().optional(),
});
const accommodationInput = z.object({
  checkInTime: z.string().trim().max(20).nullable().optional(), checkOutTime: z.string().trim().max(20).nullable().optional(),
  maxGuestsPerUnit: z.coerce.number().int().positive().max(1000).nullable().optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  smokingAllowed: z.boolean().default(false), eventsAllowed: z.boolean().default(false),
  petsPolicy: z.enum(['ALLOWED', 'ON_REQUEST', 'NOT_ALLOWED']).default('NOT_ALLOWED'),
});
const serviceInput = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional(), price: z.coerce.number().positive().max(100000000).nullable().optional(), priceUnit: z.string().trim().max(50).optional() });
const menuInput = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional(), category: z.string().trim().max(100).optional(), price: z.coerce.number().positive().max(100000000), imageUrl: z.string().url().max(1000).optional() });
const mediaInput = z.object({ mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']), fileName: z.string().trim().min(1).max(255), imageBase64: z.string().min(1).max(7 * 1024 * 1024), isCover: z.boolean().default(false) });
const maxMediaBytes = 5 * 1024 * 1024;

function hasExpectedImageSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

async function ownedHotel(userId: string, role: string, businessId: string) {
  const hotel = await prisma.business.findFirst({
    where: { id: businessId, ...(role === 'BUSINESS_OWNER' ? { ownerId: userId } : {}) },
    include: { category: true },
  });
  if (!hotel || !['hotel', 'hoteles', 'accommodation', 'alojamientos'].includes(hotel.category.slug.toLowerCase())) {
    throw new NotFoundError('No se encontró el hotel o no tienes acceso para administrarlo.');
  }
  return hotel;
}
async function ownedBusiness(userId: string, role: string, businessId: string) {
  const business = await prisma.business.findFirst({ where: { id: businessId, ...(role === 'BUSINESS_OWNER' ? { ownerId: userId } : {}) }, include: { category: true } });
  if (!business) throw new NotFoundError('No se encontró el establecimiento o no tienes acceso.');
  return business;
}

// El propietario solo recibe los alojamientos que le pertenecen; personal autorizado ve el catálogo completo.
hotelManagementRouter.get('/mine', async (req, res) => {
  const businesses = await prisma.business.findMany({
    where: req.user!.role === 'BUSINESS_OWNER' ? { ownerId: req.user!.id } : {},
    include: { category: true, roomTypes: { orderBy: { createdAt: 'asc' } }, restaurantDetail: true, tourDetail: true, services: { orderBy: { displayOrder: 'asc' } }, menuItems: { orderBy: { displayOrder: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  res.json({ data: businesses });
});

// Un anfitrión puede solicitar su ficha; el estado queda pendiente de revisión antes de publicarla.
hotelManagementRouter.post('/', requireRole('BUSINESS_OWNER'), async (req, res) => {
  const input = hotelInput.parse(req.body);
  const { categorySlug, basePrice, priceUnit, ...fields } = input;
  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) throw new NotFoundError('No está configurada esa categoría de establecimiento.');
  const slugBase = input.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
  const business = await prisma.business.create({
    data: {
      ...fields, ownerId: req.user!.id, categoryId: category.id, slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      basePrice: basePrice ?? null, priceUnit: priceUnit || (categorySlug === 'hoteles' ? 'noche' : categorySlug === 'tours' ? 'persona' : 'plato'), status: 'PENDING',
      ...(categorySlug === 'hoteles' ? { accommodation: { create: { amenities: [] } } } : {}),
    },
    include: { category: true, roomTypes: true, restaurantDetail: true, tourDetail: true, services: true, menuItems: true },
  });
  res.status(201).json({ data: business });
});

// Las imágenes del negocio se guardan como bytes en PostgreSQL y se sirven
// desde el endpoint público de media; nunca se confía en el MIME enviado solo.
hotelManagementRouter.post('/:businessId/media', async (req, res) => {
  const business = await ownedBusiness(req.user!.id, req.user!.role, z.string().uuid().parse(req.params.businessId));
  const { mimeType, fileName, imageBase64, isCover } = mediaInput.parse(req.body);
  const imageData = Buffer.from(imageBase64, 'base64');
  const canonicalBase64 = imageData.toString('base64').replace(/=+$/, '');
  if (canonicalBase64 !== imageBase64.replace(/=+$/, '') || imageData.length > maxMediaBytes || !hasExpectedImageSignature(imageData, mimeType)) {
    throw new BadRequestError('La imagen no es válida o supera el límite de 5 MB.');
  }
  const safeFileName = fileName.replace(/[\\/]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
  const displayOrder = await prisma.businessMedia.count({ where: { businessId: business.id } });
  const media = await prisma.$transaction(async (tx) => {
    if (isCover) await tx.businessMedia.updateMany({ where: { businessId: business.id }, data: { isCover: false } });
    return tx.businessMedia.create({ data: { businessId: business.id, imageData, mimeType, fileName: safeFileName, isCover: isCover || displayOrder === 0, displayOrder } });
  });
  res.status(201).json({ data: { id: media.id, imageUrl: `/api/v1/businesses/${business.id}/media/${media.id}/image`, mimeType: media.mimeType, isCover: media.isCover, displayOrder: media.displayOrder } });
});

// Los datos editoriales de restaurantes y tours se guardan en su tabla relacionada con el negocio.
hotelManagementRouter.put('/:businessId/details', async (req, res) => {
  const business = await ownedBusiness(req.user!.id, req.user!.role, req.params.businessId);
  if (['hoteles', 'hotel', 'accommodation', 'alojamientos'].includes(business.category.slug.toLowerCase())) {
    const input = accommodationInput.parse(req.body);
    const detail = await prisma.accommodationDetail.upsert({ where: { businessId: business.id }, update: input, create: { ...input, businessId: business.id } });
    res.json({ data: detail }); return;
  }
  if (business.category.slug === 'restaurantes') {
    const input = restaurantInput.parse(req.body);
    const detail = await prisma.restaurantDetail.upsert({ where: { businessId: business.id }, update: input, create: { ...input, businessId: business.id } });
    res.json({ data: detail }); return;
  }
  if (business.category.slug === 'tours') {
    const input = tourInput.parse(req.body);
    const detail = await prisma.tourDetail.upsert({ where: { businessId: business.id }, update: input, create: { ...input, businessId: business.id } });
    res.json({ data: detail }); return;
  }
  throw new NotFoundError('Esta ficha no corresponde a un restaurante ni a un tour.');
});

hotelManagementRouter.post('/:businessId/services', async (req, res) => {
  const business = await ownedBusiness(req.user!.id, req.user!.role, req.params.businessId);
  const input = serviceInput.parse(req.body);
  const service = await prisma.businessService.create({ data: { ...input, businessId: business.id, displayOrder: await prisma.businessService.count({ where: { businessId: business.id } }) } });
  res.status(201).json({ data: service });
});
hotelManagementRouter.delete('/:businessId/services/:serviceId', async (req, res) => {
  const business = await ownedBusiness(req.user!.id, req.user!.role, req.params.businessId);
  const deleted = await prisma.businessService.deleteMany({ where: { id: z.string().uuid().parse(req.params.serviceId), businessId: business.id } });
  if (!deleted.count) throw new NotFoundError('No se encontró esa prestación.');
  res.status(204).end();
});

hotelManagementRouter.post('/:businessId/menu-items', async (req, res) => {
  const business = await ownedBusiness(req.user!.id, req.user!.role, req.params.businessId);
  if (business.category.slug !== 'restaurantes') throw new NotFoundError('La carta solo se administra en restaurantes.');
  const input = menuInput.parse(req.body);
  const menuItem = await prisma.menuItem.create({ data: { ...input, businessId: business.id, displayOrder: await prisma.menuItem.count({ where: { businessId: business.id } }) } });
  res.status(201).json({ data: menuItem });
});
hotelManagementRouter.delete('/:businessId/menu-items/:menuItemId', async (req, res) => {
  const business = await ownedBusiness(req.user!.id, req.user!.role, req.params.businessId);
  const deleted = await prisma.menuItem.deleteMany({ where: { id: z.string().uuid().parse(req.params.menuItemId), businessId: business.id } });
  if (!deleted.count) throw new NotFoundError('No se encontró ese elemento de la carta.');
  res.status(204).end();
});

hotelManagementRouter.post('/:businessId/rooms', async (req, res) => {
  const hotel = await ownedHotel(req.user!.id, req.user!.role, req.params.businessId);
  const input = roomInput.parse(req.body);
  const room = await prisma.roomType.create({ data: { ...input, businessId: hotel.id } });
  res.status(201).json({ data: room });
});

hotelManagementRouter.patch('/:businessId/rooms/:roomId', async (req, res) => {
  const hotel = await ownedHotel(req.user!.id, req.user!.role, req.params.businessId);
  const roomId = z.string().uuid().parse(req.params.roomId);
  const input = roomInput.partial().parse(req.body);
  const updated = await prisma.roomType.updateMany({ where: { id: roomId, businessId: hotel.id }, data: input });
  if (!updated.count) throw new NotFoundError('No se encontró ese tipo de habitación.');
  res.json({ data: await prisma.roomType.findUnique({ where: { id: roomId } }) });
});

hotelManagementRouter.delete('/:businessId/rooms/:roomId', async (req, res) => {
  const hotel = await ownedHotel(req.user!.id, req.user!.role, req.params.businessId);
  const roomId = z.string().uuid().parse(req.params.roomId);
  const deleted = await prisma.roomType.deleteMany({ where: { id: roomId, businessId: hotel.id } });
  if (!deleted.count) throw new NotFoundError('No se encontró ese tipo de habitación.');
  res.status(204).end();
});
