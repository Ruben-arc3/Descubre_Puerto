import { Router } from 'express';
import { prisma } from '../../config/database';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } });
  res.json({ data: categories });
});
