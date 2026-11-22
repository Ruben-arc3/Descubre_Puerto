import { Router } from 'express';
import { adminRouter } from '../modules/admin/admin.routes';
import { attractionsRouter } from '../modules/attractions/attractions.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { businessesRouter } from '../modules/businesses/businesses.routes';
import { hotelManagementRouter } from '../modules/businesses/hotel-management.routes';
import { categoriesRouter } from '../modules/categories/categories.routes';
import { favoritesRouter } from '../modules/favorites/favorites.routes';
import { galleryRouter } from '../modules/gallery/gallery.routes';
import { healthRouter } from '../modules/health/health.routes';
import { inquiriesRouter } from '../modules/inquiries/inquiries.routes';
import { municipalityRouter } from '../modules/municipality/municipality.routes';

export const apiRouter = Router();

// Las vistas consultan datos frescos en cada carga.
apiRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

apiRouter.use('/health', healthRouter);
apiRouter.use('/openmap', attractionsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/businesses', businessesRouter);
apiRouter.use('/inquiries', inquiriesRouter);
apiRouter.use('/municipality', municipalityRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/gallery', galleryRouter);
apiRouter.use('/favorites', favoritesRouter);
apiRouter.use('/hotel-management', hotelManagementRouter);
apiRouter.use('/admin', adminRouter);
