import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { requireAuth } from '../../shared/middlewares/auth.middleware';
import { UnauthorizedError } from '../../shared/errors/AppError';

export const favoritesRouter = Router();
const favoriteBody = z.object({ businessId: z.string().uuid() });
const businessIdSchema = z.string().uuid();

// El directorio de guardados pertenece a la cuenta y no usa almacenamiento local anónimo.
favoritesRouter.get('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { businessId: true, createdAt: true },
  });
  res.json({ data: favorites });
});

// La clave compuesta garantiza que un mismo lugar solo aparezca una vez por cuenta.
favoritesRouter.post('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const { businessId } = favoriteBody.parse(req.body);
  const favorite = await prisma.favorite.upsert({
    where: { userId_businessId: { userId, businessId } },
    create: { userId, businessId },
    update: {},
    select: { businessId: true, createdAt: true },
  });
  res.status(201).json({ data: favorite });
});

favoritesRouter.delete('/:businessId', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const businessId = businessIdSchema.parse(req.params.businessId);
  await prisma.favorite.deleteMany({ where: { userId, businessId } });
  res.status(204).end();
});
