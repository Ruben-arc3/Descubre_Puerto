import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', async (req, res) => {
  const input = z.object({
    businessId: z.string().uuid(),
    guestName: z.string().trim().min(2).max(150),
    guestPhone: z.string().trim().max(30).optional().nullable(),
    checkInDate: z.coerce.date().optional().nullable(),
    checkOutDate: z.coerce.date().optional().nullable(),
    guestsCount: z.coerce.number().int().min(1).max(30),
  }).parse(req.body);

  const business = await prisma.business.findFirst({
    where: { id: input.businessId, status: 'APPROVED' },
    select: { id: true, category: { select: { slug: true } } },
  });
  if (!business) {
    res.status(404).json({ error: { message: 'No encontramos este establecimiento disponible.' } });
    return;
  }

  const isAccommodation = business.category.slug === 'hoteles';
  if (!input.checkInDate || (isAccommodation && !input.checkOutDate) || (input.checkOutDate && input.checkOutDate <= input.checkInDate)) {
    res.status(400).json({ error: { message: isAccommodation ? 'Indica fechas de entrada y salida válidas.' : 'Indica una fecha de visita válida.' } });
    return;
  }

  const inquiry = await prisma.reservationInquiry.create({
    data: {
      businessId: business.id,
      guestName: input.guestName,
      guestPhone: input.guestPhone || null,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate || null,
      guestsCount: input.guestsCount,
    },
    select: { id: true, createdAt: true },
  });
  res.status(201).json({ data: inquiry });
});
