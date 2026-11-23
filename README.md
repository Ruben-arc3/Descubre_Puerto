# Descubre Puerto Escondido

Plataforma turística para descubrir y planear visitas a Puerto Escondido, Córdoba, Colombia. Reúne en un solo sitio información de alojamientos, restaurantes, tours, transportes, atractivos, eventos, cultura y patrimonio local.

## Qué ofrece

- Directorio de comercios y experiencias, con contacto directo para consultar o reservar.
- Secciones para descubrir lugares, eventos, gastronomía y actividades.
- Guía de viaje con opciones de transporte, rutas y mapa.
- Galería comunitaria y páginas de información del municipio.
- Cuentas de usuario, favoritos, consultas y herramientas de administración.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Interfaz | React 19, TypeScript y Vite |
| Estilos | CSS y Tailwind CSS 4 |
| API | Node.js, Express 5 y TypeScript |
| Base de datos | PostgreSQL y Prisma ORM 6 |
| Validación y seguridad | Zod, Helmet, bcryptjs y JSON Web Tokens |
| Pruebas | Jest y Supertest |

## Requisitos

- Node.js y npm.
- PostgreSQL.
- Variables de entorno configuradas en `.env` (ese archivo no debe subirse a Git).

La API requiere `DATABASE_URL` y `JWT_SECRET` (mínimo 32 caracteres). También admite `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `JWT_EXPIRES_IN`, `SESSION_IDLE_TIMEOUT_MINUTES`, `BCRYPT_ROUNDS` y `GOOGLE_CLIENT_ID`. Para conectar el frontend a una API remota, configura `VITE_API_URL`.

## Desarrollo local

Instala dependencias y genera el cliente de Prisma:

```bash
npm ci
npx prisma generate
```

Aplica las migraciones pendientes a la base configurada:

```bash
npm run prisma:migrate:deploy
```

Inicia la API y el frontend en terminales separadas:

```bash
npm run dev
```

```bash
npm run dev:frontend
```

La API usa `PORT` (por defecto `3000`) y publica sus rutas bajo `/api/v1`. Vite usa el puerto `5174` por defecto; si está ocupado, se puede elegir otro, por ejemplo `npm run dev:frontend -- --port 5175`.

## Comandos útiles

```bash
npm run build                 # Compila el servidor TypeScript
npm run build:frontend        # Genera el frontend para producción
npm test                      # Ejecuta Jest
npm run prisma:studio         # Abre Prisma Studio
npm run db:seed               # Carga los datos iniciales
npm run db:seed:business-images # Guarda fotos locales en los negocios demostrativos
npm run db:seed:transport-examples  # Carga transportes demostrativos e imágenes
```

Los transportes del seed son datos ficticios de demostración. Reemplázalos por información verificada antes de presentarlos como proveedores reales.

## Licencia

Consulta [LICENSE.md](LICENSE.md). El repositorio es público para consulta; el código mantiene los términos indicados en esa licencia. Las imágenes y recursos de terceros conservan sus licencias correspondientes.
