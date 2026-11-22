import { PrismaClient, BusinessStatus } from '../generated/prisma';

const prisma = new PrismaClient();

// Fichas ficticias para validar el directorio. Reemplazar antes de publicar información real.
const examples = [
  {
    slug: 'transporte-ejemplo-puerto', name: 'Transporte de ejemplo', zone: 'Montería',
    shortDescription: 'Ficha demostrativa de una ruta entre Montería y Puerto Escondido.',
    description: 'Operador ficticio para probar el directorio. No corresponde a una empresa real; reemplaza sus datos y contacto antes de publicar información de transporte.',
    address: 'Terminal de Transporte · ubicación de referencia', latitude: 8.7575, longitude: -75.8867,
    services: [
      { name: 'Montería → Puerto Escondido', description: 'Salida y horario de ejemplo. Confirma los datos con un operador real.', priceUnit: 'trayecto' },
      { name: 'Puerto Escondido → Montería', description: 'Ruta de regreso de ejemplo. Confirma los datos con un operador real.', priceUnit: 'trayecto' },
    ],
  },
  {
    slug: 'transporte-ejemplo-traslado-local', name: 'Traslados de ejemplo · Puerto', zone: 'Puerto Escondido',
    shortDescription: 'Ficha demostrativa de traslados locales y viajes en grupo.',
    description: 'Servicio ficticio para revisar cómo aparecen los transportes en la plataforma. No corresponde a un proveedor real; sustituye toda la ficha antes de publicar datos reales.',
    address: 'Puerto Escondido, Córdoba · ubicación de referencia', latitude: 9.0192, longitude: -76.2614,
    services: [
      { name: 'Traslado local', description: 'Modalidad de ejemplo. El recorrido y la tarifa deben confirmarse.', priceUnit: 'trayecto' },
      { name: 'Viaje privado en grupo', description: 'Servicio de ejemplo. Capacidad y disponibilidad por confirmar.', priceUnit: 'servicio' },
    ],
  },
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'demo@puertoescondido.co' },
    update: { fullName: 'Anfitrión de demostración', role: 'BUSINESS_OWNER', isActive: true },
    create: { fullName: 'Anfitrión de demostración', email: 'demo@puertoescondido.co', role: 'BUSINESS_OWNER' },
  });
  const category = await prisma.category.upsert({
    where: { slug: 'transportes' },
    update: { name: 'Transportes', iconName: 'bus', displayOrder: 4 },
    create: { name: 'Transportes', slug: 'transportes', iconName: 'bus', displayOrder: 4 },
  });

  for (const item of examples) {
    const business = await prisma.business.upsert({
      where: { slug: item.slug },
      update: {
        ownerId: owner.id, categoryId: category.id, name: item.name, zone: item.zone,
        shortDescription: item.shortDescription, description: item.description, address: item.address,
        whatsappNumber: '3000000000', latitude: item.latitude, longitude: item.longitude,
        basePrice: null, priceUnit: 'trayecto', isFeatured: false, isVerified: false, status: BusinessStatus.APPROVED,
      },
      create: {
        ownerId: owner.id, categoryId: category.id, name: item.name, slug: item.slug, zone: item.zone,
        shortDescription: item.shortDescription, description: item.description, address: item.address,
        whatsappNumber: '3000000000', latitude: item.latitude, longitude: item.longitude,
        basePrice: null, priceUnit: 'trayecto', isFeatured: false, isVerified: false, status: BusinessStatus.APPROVED,
      },
    });
    await prisma.businessService.deleteMany({ where: { businessId: business.id } });
    await prisma.businessService.createMany({
      data: item.services.map((service, displayOrder) => ({ ...service, businessId: business.id, price: null, displayOrder })),
    });

    const photos = item.slug === 'transporte-ejemplo-puerto'
      ? [
          { imageUrl: 'https://images.unsplash.com/photo-1725864832531-f50f4639dd00?auto=format&fit=crop&w=1400&q=85', fileName: 'van-montana-unsplash.jpg' },
          { imageUrl: 'https://images.unsplash.com/photo-1695295445779-dcbbbe96ba23?auto=format&fit=crop&w=1400&q=85', fileName: 'van-costera-unsplash.jpg' },
          { imageUrl: 'https://images.unsplash.com/photo-1768257308812-333fe50777fe?auto=format&fit=crop&w=1400&q=85', fileName: 'van-bosque-unsplash.jpg' },
          { imageUrl: 'https://images.unsplash.com/photo-1604928271641-8bb6df467378?auto=format&fit=crop&w=1400&q=85', fileName: 'van-ruta-rural-unsplash.jpg' },
        ]
      : [
          { imageUrl: 'https://images.unsplash.com/photo-1695295445779-dcbbbe96ba23?auto=format&fit=crop&w=1400&q=85', fileName: 'van-costera-unsplash.jpg' },
          { imageUrl: 'https://images.unsplash.com/photo-1725864832531-f50f4639dd00?auto=format&fit=crop&w=1400&q=85', fileName: 'van-montana-unsplash.jpg' },
          { imageUrl: 'https://images.unsplash.com/photo-1604928271641-8bb6df467378?auto=format&fit=crop&w=1400&q=85', fileName: 'van-ruta-rural-unsplash.jpg' },
          { imageUrl: 'https://images.unsplash.com/photo-1768257308812-333fe50777fe?auto=format&fit=crop&w=1400&q=85', fileName: 'van-bosque-unsplash.jpg' },
        ];
    for (const [displayOrder, photo] of photos.entries()) {
      const existing = await prisma.businessMedia.findFirst({ where: { businessId: business.id, imageUrl: photo.imageUrl } });
      if (existing) {
        await prisma.businessMedia.update({ where: { id: existing.id }, data: { fileName: photo.fileName, isCover: displayOrder === 0, displayOrder } });
      } else {
        await prisma.businessMedia.create({ data: { businessId: business.id, ...photo, mimeType: 'image/jpeg', isCover: displayOrder === 0, displayOrder } });
      }
    }
  }
  console.log(`Se guardaron ${examples.length} transportes de ejemplo en PostgreSQL.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
