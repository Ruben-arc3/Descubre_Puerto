# Imágenes iniciales de la galería

- `playa-pexels.jpeg`: fotografía de Israel Barrios Ríos, publicada en Pexels como foto gratuita y ubicada en Puerto Escondido, Córdoba. [Ficha](https://www.pexels.com/photo/man-walking-through-water-at-puerto-escondido-38777121/).
- `rio-puerto-escondido.jpg`: fotografía de Masfpower, disponible bajo CC BY-SA 4.0. [Ficha y licencia](https://commons.wikimedia.org/wiki/File:El_Rio.marciano.jpg).

El script `npm run db:seed` guarda ambos archivos como binarios en PostgreSQL y los marca como fotos de muestra. Las nuevas fotos de usuarios se guardan en la misma tabla sin la marca de muestra.
