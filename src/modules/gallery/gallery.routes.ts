import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/AppError';
import { optionalAuth, requireAuth } from '../../shared/middlewares/auth.middleware';

export const galleryRouter = Router();
const maxBytes = 5 * 1024 * 1024;
const uploadSchema = z.object({
  caption: z.string().trim().max(250).default(''),
  category: z.enum(['Playas y mar', 'Naturaleza y manglares', 'Gastronomía', 'Cultura y pueblo']).default('Playas y mar'),
  location: z.string().trim().min(2).max(150).default('Puerto Escondido'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  originalName: z.string().trim().min(1).max(255),
  imageBase64: z.string().min(1).max(7 * 1024 * 1024),
});

function hasExpectedSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

function toGalleryCard(photo: { id: string; caption: string; category: string; location: string; createdAt: Date; isSample: boolean; sourceCredit: string | null; sourceUrl: string | null; user: { fullName: string }; _count: { likes: number }; likes?: { userId: string }[] }) {
  return { id: photo.id, caption: photo.caption, category: photo.category, location: photo.location, createdAt: photo.createdAt, isSample: photo.isSample, sourceCredit: photo.sourceCredit, sourceUrl: photo.sourceUrl, imageUrl: `/api/v1/gallery/${photo.id}/image`, likesCount: photo._count.likes, likedByMe: Boolean(photo.likes?.length), user: photo.user };
}

// La galería es pública para consultar; solo la escritura exige una sesión válida.
galleryRouter.get('/', optionalAuth, async (req, res) => {
  const popular = req.query.sort === 'popular';
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(String(req.query.limit || '24'), 10) || 24));
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const where = category && category !== 'Todas' ? { category } : {};
  const [photos, total, categoryRows] = await Promise.all([
    prisma.galleryPhoto.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: popular ? [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
      select: { id: true, caption: true, category: true, location: true, createdAt: true, isSample: true, sourceCredit: true, sourceUrl: true, _count: { select: { likes: true } }, ...(req.user ? { likes: { where: { userId: req.user.id }, select: { userId: true } } } : {}), user: { select: { fullName: true } } },
    }),
    prisma.galleryPhoto.count({ where }),
    prisma.galleryPhoto.groupBy({ by: ['category'], _count: { _all: true } }),
  ]);
  const categoryCounts = Object.fromEntries(categoryRows.map((row) => [row.category, row._count._all]));
  const allTotal = categoryRows.reduce((sum, row) => sum + row._count._all, 0);
  res.json({ data: photos.map(toGalleryCard), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), allTotal, categoryCounts } });
});

galleryRouter.post('/:id/like', requireAuth, async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await prisma.galleryLike.upsert({ where: { userId_photoId: { userId: req.user!.id, photoId: id } }, create: { userId: req.user!.id, photoId: id }, update: {} });
  const likesCount = await prisma.galleryLike.count({ where: { photoId: id } });
  res.json({ data: { likedByMe: true, likesCount } });
});

galleryRouter.delete('/:id/like', requireAuth, async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  await prisma.galleryLike.deleteMany({ where: { userId: req.user!.id, photoId: id } });
  const likesCount = await prisma.galleryLike.count({ where: { photoId: id } });
  res.json({ data: { likedByMe: false, likesCount } });
});

galleryRouter.get('/:id/image', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const photo = await prisma.galleryPhoto.findUnique({ where: { id }, select: { imageData: true, mimeType: true } });
  if (!photo) {
    res.status(404).end();
    return;
  }
  res.set({
    'Content-Type': photo.mimeType,
    'Content-Length': String(photo.imageData.length),
    'Cache-Control': 'public, max-age=86400',
    // El frontend corre en otro puerto; permite que el navegador muestre el binario en sus <img>.
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    ...(req.query.download === '1' ? { 'Content-Disposition': `attachment; filename="foto-puerto-${id}.${photo.mimeType === 'image/jpeg' ? 'jpg' : photo.mimeType === 'image/png' ? 'png' : 'webp'}"` } : {}),
  });
  res.end(photo.imageData);
});

galleryRouter.post('/', requireAuth, async (req, res) => {
  const { caption, category, location, mimeType, originalName, imageBase64 } = uploadSchema.parse(req.body);
  const imageData = Buffer.from(imageBase64, 'base64');
  const canonicalBase64 = imageData.toString('base64').replace(/=+$/, '');
  if (canonicalBase64 !== imageBase64.replace(/=+$/, '') || imageData.length > maxBytes || !hasExpectedSignature(imageData, mimeType)) {
    throw new BadRequestError('El archivo no es una imagen válida o supera el límite de 5 MB.');
  }
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();

  const safeName = originalName.replace(/[\\/]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
  const photo = await prisma.galleryPhoto.create({
    data: { userId, caption, category, location, imageData, mimeType, originalName: safeName },
    select: { id: true, caption: true, category: true, location: true, createdAt: true, isSample: true, sourceCredit: true, sourceUrl: true, _count: { select: { likes: true } }, user: { select: { fullName: true } } },
  });
  res.status(201).json({ data: toGalleryCard(photo) });
});
