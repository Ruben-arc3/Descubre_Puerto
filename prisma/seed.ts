import { PrismaClient, BusinessStatus } from '../generated/prisma';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;

// Estos perfiles trasladan a PostgreSQL las fichas que antes vivían como arreglos de muestra en React.
const directory = [
  {
    category: 'hoteles', name: 'Casa Coral Boutique', slug: 'casa-coral-boutique', zone: 'Centro',
    shortDescription: 'Patio tropical, piscina y desayuno incluido.',
    description: 'Alojamiento demostrativo de ambiente tranquilo, con patio tropical, piscina y desayuno incluido. Consulta disponibilidad y tarifas directamente con el establecimiento.',
    address: 'Centro, Puerto Escondido, Córdoba', price: 185000, unit: 'noche', imageId: 'photo-1566073771259-6a8506099945',
    galleryImageIds: ['photo-1571896349842-33c89424de2d', 'photo-1582719508461-905c673771fd'],
    tag: 'ESTANCIA CON ENCANTO', services: [
      ['Habitación doble', 'Alojamiento para dos personas con desayuno incluido.', 185000, 'noche'],
      ['Piscina', 'Acceso a la piscina del alojamiento.', 0, 'incluido'],
      ['Desayuno', 'Desayuno de la casa para huéspedes.', 0, 'incluido'],
    ], menu: [], amenities: ['Piscina', 'Desayuno incluido', 'Patio tropical'],
  },
  {
    category: 'restaurantes', name: 'Cocina de Doña Ana', slug: 'cocina-de-dona-ana', zone: 'La Ensenada',
    shortDescription: 'Pescado del día y cocina de tradición.',
    description: 'Restaurante demostrativo de cocina caribeña con pescado del día y recetas tradicionales. El menú es una referencia para mostrar la carta digital.',
    address: 'Sector La Ensenada, Puerto Escondido, Córdoba', price: 35000, unit: 'plato', imageId: 'photo-1517248135467-4c7edcad34c4',
    galleryImageIds: ['photo-1414235077428-338989a2e8c0', 'photo-1504674900247-0877df9cc836'],
    tag: 'SABOR LOCAL', services: [
      ['Almuerzo del día', 'Preparación casera con acompañamientos.', 35000, 'plato'],
      ['Comida para llevar', 'Empaque de platos disponibles del día.', 0, 'pedido'],
    ], menu: [
      ['Pescado del día', 'Pescado fresco con arroz, ensalada y patacón.', 'Platos principales', 35000],
      ['Patacones', 'Porción de patacones crocantes.', 'Acompañamientos', 8000],
      ['Limonada natural', 'Limonada preparada al momento.', 'Bebidas', 7000],
    ], amenities: [],
  },
  {
    category: 'tours', name: 'Entre manglares', slug: 'entre-manglares', zone: 'Boca de Tinajones',
    shortDescription: 'Paseo en canoa, guía local y recorrido de 3 horas.',
    description: 'Experiencia demostrativa de recorrido en canoa por los manglares de Boca de Tinajones, acompañada por guía local. Duración aproximada: tres horas.',
    address: 'Boca de Tinajones, Puerto Escondido, Córdoba', price: 90000, unit: 'persona', imageId: 'photo-1518837695005-2083093ee35b',
    galleryImageIds: ['photo-1500375592092-40eb2168fd21', 'photo-1501785888041-af3ef285b470'],
    tag: 'EXPERIENCIA LOCAL', services: [
      ['Paseo en canoa', 'Recorrido guiado de aproximadamente tres horas.', 90000, 'persona'],
      ['Guía local', 'Acompañamiento durante el recorrido.', 0, 'incluido'],
    ], menu: [], amenities: [],
  },
  {
    category: 'hoteles', name: 'Posada Brisa Marina', slug: 'posada-brisa-marina', zone: 'Playa',
    shortDescription: 'A pasos del mar, con habitaciones familiares.',
    description: 'Alojamiento demostrativo cercano a la playa, con habitaciones familiares. Las tarifas publicadas son referenciales y deben confirmarse directamente.',
    address: 'Sector Playa, Puerto Escondido, Córdoba', price: 130000, unit: 'noche', imageId: 'photo-1499793983690-e29da59ef1c2',
    galleryImageIds: ['photo-1519046904884-53103b34b206', 'photo-1510414842594-a61c69b5ae57'],
    tag: 'CERCA DEL MAR', services: [
      ['Habitación familiar', 'Hospedaje para grupos familiares.', 130000, 'noche'],
      ['Acceso a la playa', 'Salida a pocos pasos del mar.', 0, 'incluido'],
    ], menu: [], amenities: ['Cerca de la playa', 'Habitaciones familiares'],
  },
];

async function main(): Promise<void> {
  const owner = await prisma.user.upsert({
    where: { email: 'demo@puertoescondido.co' },
    update: { fullName: 'Anfitrión de demostración', role: 'BUSINESS_OWNER', isActive: true },
    create: { fullName: 'Anfitrión de demostración', email: 'demo@puertoescondido.co', role: 'BUSINESS_OWNER' },
  });

  const categories = [
    { name: 'Hoteles', slug: 'hoteles', iconName: 'bed', displayOrder: 1 },
    { name: 'Restaurantes', slug: 'restaurantes', iconName: 'utensils', displayOrder: 2 },
    { name: 'Tours', slug: 'tours', iconName: 'compass', displayOrder: 3 },
    { name: 'Transportes', slug: 'transportes', iconName: 'bus', displayOrder: 4 },
  ];
  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, update: category, create: category });
  }

  for (const item of directory) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const business = await prisma.business.upsert({
      where: { slug: item.slug },
      update: {
        categoryId: category.id, ownerId: owner.id, name: item.name, zone: item.zone,
        shortDescription: item.shortDescription, description: item.description, address: item.address,
        whatsappNumber: '3000000000', latitude: 9.02, longitude: -76.18,
        basePrice: item.price, priceUnit: item.unit, isFeatured: true, isVerified: false,
        status: BusinessStatus.APPROVED,
      },
      create: {
        categoryId: category.id, ownerId: owner.id, name: item.name, slug: item.slug, zone: item.zone,
        shortDescription: item.shortDescription, description: item.description, address: item.address,
        whatsappNumber: '3000000000', latitude: 9.02, longitude: -76.18,
        basePrice: item.price, priceUnit: item.unit, isFeatured: true, isVerified: false,
        status: BusinessStatus.APPROVED,
      },
    });

    // Conserva fotos añadidas por propietarios y crea/actualiza solo las imágenes de demostración.
    await prisma.businessService.deleteMany({ where: { businessId: business.id } });
    await prisma.menuItem.deleteMany({ where: { businessId: business.id } });
    const businessImageIds = [item.imageId, ...item.galleryImageIds];
    for (const [displayOrder, imageId] of businessImageIds.entries()) {
      const imageUrl = image(imageId);
      const existingMedia = await prisma.businessMedia.findFirst({ where: { businessId: business.id, imageUrl } });
      if (existingMedia) {
        await prisma.businessMedia.update({ where: { id: existingMedia.id }, data: { isCover: displayOrder === 0, displayOrder } });
      } else {
        await prisma.businessMedia.create({ data: { businessId: business.id, imageUrl, isCover: displayOrder === 0, displayOrder } });
      }
    }
    if (item.services.length) await prisma.businessService.createMany({
      data: item.services.map(([name, description, price, priceUnit], index) => ({
        businessId: business.id, name, description, price, priceUnit, displayOrder: index,
      })),
    });
    if (item.menu.length) await prisma.menuItem.createMany({
      data: item.menu.map(([name, description, categoryName, price], index) => ({
        businessId: business.id, name, description, category: categoryName, price, displayOrder: index,
      })),
    });
    if (item.amenities.length) await prisma.accommodationDetail.upsert({
      where: { businessId: business.id },
      update: { amenities: item.amenities },
      create: { businessId: business.id, amenities: item.amenities },
    });

    // Catálogo inicial de habitaciones para mostrar camas, cupos, tarifas y políticas en las fichas hoteleras.
    const demoRooms = item.slug === 'casa-coral-boutique' ? [
      { name: 'Habitación Doble Estándar', description: 'Habitación para dos personas con patio tropical y acceso a piscina.', maxAdults: 2, maxChildren: 1, bedDescription: '1 cama doble grande', areaSqm: 21, quantity: 4, nightlyRate: 185000, breakfastIncluded: true, refundable: true, cancellationPolicy: 'Cancelación gratuita hasta 48 horas antes', prepaymentPolicy: 'Pago en el alojamiento', amenities: ['Aire acondicionado', 'Baño privado', 'TV', 'Wi-Fi', 'Minibar'] },
      { name: 'Suite Junior', description: 'Suite amplia con zona de estar, desayuno y vista al jardín.', maxAdults: 2, maxChildren: 2, bedDescription: '1 cama doble y 1 sofá cama', areaSqm: 32, quantity: 2, nightlyRate: 295000, breakfastIncluded: true, refundable: false, cancellationPolicy: 'Tarifa no reembolsable', prepaymentPolicy: 'Pago anticipado del 30%', amenities: ['Aire acondicionado', 'Baño privado', 'Balcón', 'Wi-Fi', 'TV'] },
    ] : item.slug === 'posada-brisa-marina' ? [
      { name: 'Habitación Familiar', description: 'Alojamiento para familias a pocos pasos del mar.', maxAdults: 3, maxChildren: 2, bedDescription: '1 cama doble y 2 individuales', areaSqm: 28, quantity: 3, nightlyRate: 130000, breakfastIncluded: false, refundable: true, cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes', prepaymentPolicy: 'Sin pago por adelantado', amenities: ['Ventilador', 'Baño privado', 'Wi-Fi', 'Cerca de la playa'] },
      { name: 'Habitación Doble', description: 'Espacio sencillo y cómodo para una escapada en pareja.', maxAdults: 2, maxChildren: 0, bedDescription: '1 cama doble', areaSqm: 18, quantity: 5, nightlyRate: 95000, breakfastIncluded: false, refundable: true, cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes', prepaymentPolicy: 'Pago en el alojamiento', amenities: ['Ventilador', 'Baño privado', 'Wi-Fi'] },
    ] : [];
    for (const room of demoRooms) {
      await prisma.roomType.upsert({
        where: { businessId_name: { businessId: business.id, name: room.name } },
        update: room,
        create: { ...room, businessId: business.id },
      });
    }
    if (item.slug === 'cocina-de-dona-ana') {
      await prisma.restaurantDetail.upsert({
        where: { businessId: business.id }, update: {},
        create: { businessId: business.id, openingHours: { Lunes: '08:00–18:00', Martes: '08:00–18:00', Miércoles: '08:00–18:00', Jueves: '08:00–18:00', Viernes: '08:00–20:00', Sábado: '08:00–20:00', Domingo: '09:00–16:00' }, closedDays: [], serviceOptions: ['Consumo en el local', 'Para llevar', 'Reservas'], paymentMethods: ['Efectivo', 'Transferencia'], dietaryOptions: ['Opciones vegetarianas disponibles'], atmosphere: 'Familiar y de cocina tradicional', capacity: 42, averageSpend: 35000, reservationRequired: false, accessibilityInfo: 'Consulta con el establecimiento sobre apoyos de acceso.' },
      });
    }
    if (item.slug === 'entre-manglares') {
      await prisma.tourDetail.upsert({
        where: { businessId: business.id }, update: {},
        create: { businessId: business.id, durationMinutes: 180, schedules: ['08:00', '14:00'], meetingPoint: 'Embarcadero de Boca de Tinajones', minGroupSize: 2, maxGroupSize: 8, minAge: 5, included: ['Guía local', 'Recorrido en canoa'], requirements: ['Llevar agua', 'Usar protección solar'], physicalLevel: 'Suave', languages: ['Español'], cancellationPolicy: 'Consultar al reservar', weatherPolicy: 'El recorrido puede reprogramarse por condiciones del clima.', accessibilityInfo: 'El acceso a la canoa requiere movilidad asistida.' },
      });
    }
  }

  const municipalityProfile = await prisma.municipalityProfile.upsert({
    where: { slug: 'puerto-escondido' },
    update: municipality,
    create: municipality,
  });

  // Las cuatro imágenes históricas provienen de los adjuntos compartidos por el usuario.
  const municipalityPhotos = [
    { key: 'archivo-vista-poblacion', caption: 'Vista parcial de la población', period: 'Archivo histórico', file: 'municipio-historico-poblacion.png', credit: 'Imagen histórica compartida por la comunidad', isHistorical: true, displayOrder: 0 },
    { key: 'archivo-plaza-santander', caption: 'Plaza de Santander, en el barrio Abajo', period: 'Archivo histórico', file: 'municipio-historico-plaza-santander.png', credit: 'Imagen histórica compartida por la comunidad', isHistorical: true, displayOrder: 1 },
    { key: 'archivo-plazoleta-templo', caption: 'Plazoleta frente al templo parroquial', period: 'Archivo histórico', file: 'municipio-historico-plazoleta-templo.png', credit: 'Imagen histórica compartida por la comunidad', isHistorical: true, displayOrder: 2 },
    { key: 'archivo-panorama-localidad', caption: 'Vista panorámica de la localidad', period: 'Archivo histórico', file: 'municipio-historico-vista-panoramica.png', credit: 'Imagen histórica compartida por la comunidad', isHistorical: true, displayOrder: 3 },
  ];
  for (const photo of municipalityPhotos) {
    const { file, ...metadata } = photo;
    await prisma.municipalityMedia.upsert({
      where: { key: metadata.key },
      update: { ...metadata, imageData: await readFile(join(process.cwd(), 'prisma', 'seed-media', file)), imageUrl: null, mimeType: 'image/png', municipalityId: municipalityProfile.id },
      create: { ...metadata, imageData: await readFile(join(process.cwd(), 'prisma', 'seed-media', file)), mimeType: 'image/png', municipalityId: municipalityProfile.id },
    });
  }
  const contemporaryPhotos = [
    { key: 'muelle-hoyito-2025', caption: 'Muelle turístico de Playas del Hoyito, renovado con colores del bullerengue', period: '2025', credit: 'Foto: Gobernación de Córdoba · vía La Razón', sourceUrl: 'https://larazon.co/puerto-escondido-estrena-muelle-turistico-embellecido-con-colores-inspirados-en-el-bullerengue/', imageUrl: 'https://larazon.co/wp-content/uploads/2025/06/Muelle-turismo-3.jpeg', displayOrder: 4 },
    { key: 'orilla-puerto-pexels', caption: 'Un paseo por la orilla y el paisaje rocoso del litoral', period: 'Fotografía reciente', credit: 'Israel Barrios Ríos · Pexels', sourceUrl: 'https://www.pexels.com/photo/man-walking-through-water-at-puerto-escondido-38777121/', imageUrl: 'https://images.pexels.com/photos/38777121/pexels-photo-38777121.jpeg?auto=compress&cs=tinysrgb&w=1600', displayOrder: 5 },
    { key: 'muelle-bullerengue-chica-1', caption: 'El muelle de Playas del Hoyito con sus colores inspirados en el bullerengue', period: 'Junio de 2025', credit: 'Chica Noticias · fotografía del artículo', sourceUrl: 'https://www.chicanoticias.com/2025/06/24/colores-del-bullerengue-dan-nueva-vida-al-muelle-turistico-de-puerto-escondido/', imageUrl: 'https://www.chicanoticias.com/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-24-at-10.05.39-1.jpeg', displayOrder: 6 },
    { key: 'muelle-bullerengue-chica-2', caption: 'Detalles de la pasarela turística sobre el mar Caribe', period: 'Junio de 2025', credit: 'Chica Noticias · fotografía del artículo', sourceUrl: 'https://www.chicanoticias.com/2025/06/24/colores-del-bullerengue-dan-nueva-vida-al-muelle-turistico-de-puerto-escondido/', imageUrl: 'https://www.chicanoticias.com/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-24-at-10.05.39-2.jpeg', displayOrder: 7 },
  ];
  // Quita la imagen genérica anterior que duplicaba la foto de portada del municipio.
  await prisma.municipalityMedia.deleteMany({ where: { key: 'destino-cordoba-hoy' } });
  for (const photo of contemporaryPhotos) {
    await prisma.municipalityMedia.upsert({ where: { key: photo.key }, update: { ...photo, isHistorical: false, municipalityId: municipalityProfile.id }, create: { ...photo, isHistorical: false, municipalityId: municipalityProfile.id } });
  }

  // Cada imagen de muestra queda asociada a un usuario de demostración y almacenada como BYTEA.
  const gallerySamples = [
    { email: 'galeria.playa@example.com', fullName: 'Comunidad de muestra · Playa', file: 'playa-pexels.jpeg', caption: 'Un paseo por la orilla de Puerto Escondido.', mimeType: 'image/jpeg', sourceCredit: 'Israel Barrios Ríos · Pexels', sourceUrl: 'https://www.pexels.com/photo/man-walking-through-water-at-puerto-escondido-38777121/' },
    { email: 'galeria.rio@example.com', fullName: 'Comunidad de muestra · Río', file: 'rio-puerto-escondido.jpg', caption: 'Paisaje del río en Puerto Escondido.', mimeType: 'image/jpeg', sourceCredit: 'Masfpower · CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Rio.marciano.jpg' },
  ];
  await prisma.galleryPhoto.deleteMany({ where: { isSample: true } });
  for (const sample of gallerySamples) {
    const user = await prisma.user.upsert({
      where: { email: sample.email },
      update: { fullName: sample.fullName, role: 'TOURIST', authProvider: 'LOCAL', isActive: true },
      create: { fullName: sample.fullName, email: sample.email, role: 'TOURIST', authProvider: 'LOCAL' },
    });
    await prisma.galleryPhoto.create({
      data: {
        userId: user.id, caption: sample.caption, imageData: await readFile(join(process.cwd(), 'prisma', 'seed-media', sample.file)),
        mimeType: sample.mimeType, originalName: sample.file, isSample: true,
        sourceCredit: sample.sourceCredit, sourceUrl: sample.sourceUrl,
      },
    });
  }
  const businessImageCount = directory.reduce((count, item) => count + 1 + item.galleryImageIds.length, 0);
  console.log(`Datos de demostración listos: ${directory.length} establecimientos, ${businessImageCount} imágenes de negocios y ${gallerySamples.length} fotos de comunidad en PostgreSQL.`);
}

const municipality = {
  slug: 'puerto-escondido', name: 'Puerto Escondido', department: 'Córdoba, Colombia',
  tagline: 'Un rincón sereno entre el mar Caribe, los manglares y la vida de sus comunidades.',
  introduction: 'En el litoral Caribe de Córdoba, Puerto Escondido reúne una cabecera de tradición pesquera, comunidades rurales, playas, ríos y humedales. El municipio se extiende por unos 423 km² y cuenta con 27 km de costa. Su paisaje cambia entre el mar, colinas de la serranía de Abibe, desembocaduras y zonas de manglar.',
  history: 'La historia local sitúa el origen del poblado en 1854, cuando familias procedentes de la isla de Barú, entre ellas los hermanos Díaz según la tradición escrita, se asentaron en Puerto Escondido Viejo. Al crecer la comunidad, sus ranchos se trasladaron cerca de una laguna, al sector que hoy se conoce como barrio Simón Bolívar. En 1923 Puerto Escondido fue reconocido como corregimiento de Lorica; años después pasó por cambios de jurisdicción dentro del litoral cordobés. En 1961, ya creado el departamento de Córdoba, fue erigido municipio. Los caminos entre el mar, las ciénagas y las zonas rurales, la pesca y las migraciones de familias del litoral y del interior han marcado la vida local. Las cuatro postales del archivo muestran cómo eran la población, la plaza de Santander, la plazoleta del templo y la costa en otra época.',
  culture: 'La cultura local tiene una fuerte raíz afrocaribeña. El bullerengue —canto, tambor, palmas y baile— es una de sus expresiones más reconocidas y da nombre al Festival Nacional del Bullerengue, celebrado alrededor de San Juan. La tradición se transmite en encuentros y agrupaciones comunitarias: el canto dialoga con el tambor y cuenta historias de trabajo, afecto y vida cotidiana. La pesca artesanal, la cocina de mar, las fiestas patronales y los relatos de mayores completan una identidad que sigue viva en los barrios y corregimientos. El festival es una buena oportunidad para acercarse a esta cultura siguiendo las indicaciones de sus anfitriones y respetando sus espacios.',
  nature: 'El litoral combina playas abiertas al Caribe, acantilados y colinas, desembocaduras, ríos, humedales y manglares. La isla Tortuguilla, una pequeña formación coralina situada frente a la costa, es uno de sus rasgos naturales singulares. En el paisaje rural se alternan potreros, bosques y cultivos; en los cursos de agua se conectan las zonas altas con el mar. La cobertura vegetal nativa ha sufrido presión por la tala, las quemas, el drenaje de humedales y la expansión agropecuaria. Para cuidar estos lugares, evita dejar residuos, no extraigas plantas o animales y visita playas y senderos con orientación local.',
  flora: 'En la costa y los humedales hay formaciones de manglar; informes ambientales de Córdoba describen mangle rojo, negro y blanco en desembocaduras de la región. Los manglares protegen la orilla, retienen sedimentos y sirven de refugio y criadero para peces y crustáceos. En el paisaje rural se encuentran especies como totumo, ceiba, roble, jobo y palma. Wikipedia destaca el totumo entre las plantas frecuentes y advierte que los bosques nativos han disminuido. La presencia de cada especie cambia según el sector y la época del año; aquí se ofrece una descripción general, no un inventario botánico.',
  fauna: 'Los manglares, estuarios, ríos y bosques sostienen aves, peces, crustáceos y fauna terrestre. Wikipedia menciona al carpintero (Celeus loricatus) entre las aves de la zona. En la franja costera, las raíces y canales del manglar ofrecen alimento y refugio para organismos juveniles; en los espacios abiertos y arbolados pueden observarse aves propias de ambientes rurales y litorales. La pérdida de hábitat por deforestación, quemas, drenaje de humedales y presión ganadera es una amenaza señalada para la región. Observa la fauna a distancia y confirma las especies con guías o autoridades ambientales; este texto no es un inventario científico.',
  places: 'Playas del Hoyito y su muelle turístico; Cristo Rey y su recorrido costero; playas de Cascajo; desembocadura de la quebrada de Yuca; ríos Mangle y Canalete; isla Tortuguilla; cerro Tortugón; sendero ecológico La Nevera; plaza de Santander; plazoleta frente al templo parroquial.',
  geography: 'Puerto Escondido se encuentra al noroccidente de Córdoba, sobre el mar Caribe. Su territorio abarca aproximadamente 423,2 km² y 27 km de costa, con colinas, valles, playas y cursos de agua que desembocan en el litoral. Tortuguilla está a unos 9 km de tierra firme. Los ríos Canalete y Mangle, la quebrada de Yuca y la vertiente costera estructuran buena parte de su hidrografía.',
  wikipediaSummary: null,
  wikipediaUrl: 'https://es.wikipedia.org/wiki/Puerto_Escondido_(C%C3%B3rdoba)',
  wikipediaThumbnail: null,
  wikipediaSyncedAt: null,
  coverImageUrl: 'https://larazon.co/wp-content/uploads/2025/06/Muelle-turismo-3.jpeg',
};

main().catch((error: unknown) => {
  console.error('No se pudieron cargar los datos de demostración:', error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
