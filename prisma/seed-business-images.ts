import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();

// Solo estos negocios de demostración reciben las fotografías locales.
// No se incluyen negocios de transporte ni fotografías cargadas por anfitriones.
const demoGalleries: Record<string, string[]> = {
  'casa-coral-boutique': ['alojamiento-piscina.webp', 'costa-palmeras.webp', 'playa-palmeras.webp'],
  'cocina-de-dona-ana': ['palapas-locales.webp', 'atardecer-caribe.webp', 'costa-palmeras.webp'],
  'entre-manglares': ['playa-palmeras.webp', 'costa-palmeras.webp', 'muelle-colorido.webp'],
  'posada-brisa-marina': ['costa-palmeras.webp', 'muelle-colorido.webp', 'playa-palmeras.webp'],
};

async function main(): Promise<void> {
  let saved = 0;
  let added = 0;

  for (const [slug, files] of Object.entries(demoGalleries)) {
    const business = await prisma.business.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!business) throw new Error(`No existe el negocio demostrativo "${slug}" en la base configurada.`);

    const stockRows = await prisma.businessMedia.findMany({
      where: { businessId: business.id, imageUrl: { startsWith: 'https://images.unsplash.com/' }, imageData: null },
      orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const currentRows = await prisma.businessMedia.findMany({
      where: { businessId: business.id }, select: { displayOrder: true, isCover: true },
    });
    let nextDisplayOrder = currentRows.reduce((max, row) => Math.max(max, row.displayOrder), -1) + 1;
    let hasCover = currentRows.some((row) => row.isCover);

    for (const [displayOrder, filename] of files.entries()) {
      const imageData = await readFile(join(process.cwd(), 'public', 'images', 'puerto-escondido', filename));
      const fileName = `demo-${filename}`;
      const existing = await prisma.businessMedia.findFirst({ where: { businessId: business.id, fileName } });
      const stock = existing ? null : stockRows.shift() || null;
      const rowToUpdate = existing || stock;
      const order = rowToUpdate?.displayOrder ?? nextDisplayOrder++;
      const isCover = rowToUpdate?.isCover ?? (!hasCover && order === 0);
      const data = { imageUrl: null, imageData, mimeType: 'image/webp', fileName, isCover, displayOrder: order };

      if (rowToUpdate) {
        await prisma.businessMedia.update({ where: { id: rowToUpdate.id }, data });
      } else {
        await prisma.businessMedia.create({ data: { businessId: business.id, ...data } });
        added += 1;
      }
      if (isCover) hasCover = true;
      saved += 1;
    }

    console.log(`Galería de ${business.name}: ${files.length} imágenes actualizadas o añadidas; no se eliminó ningún registro.`);
  }

  console.log(`Listo: ${saved} imágenes guardadas; ${added} añadidas y el resto actualizadas en su lugar. No se eliminó ningún registro.`);
}

main().catch((error: unknown) => {
  console.error('No se pudieron cargar las imágenes de los negocios:', error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
