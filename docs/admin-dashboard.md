# Panel administrativo

El panel se abre directamente en `http://localhost:5174/admin`. No se enlaza desde la navegación pública. La API vuelve a comprobar en PostgreSQL que la cuenta exista, esté activa y tenga el rol `SUPERADMIN`; ocultar la ruta no se usa como control de acceso.

## Autorizar la primera cuenta

Una persona con acceso de administración a PostgreSQL debe asignar el rol una sola vez a una cuenta ya registrada:

```sql
UPDATE public.users
SET role = 'SUPERADMIN'
WHERE email = 'correo-autorizado@ejemplo.com';
```

Después, esa persona debe cerrar sesión y volver a entrar para recibir una sesión con el nuevo rol. No se debe habilitar el registro público de cuentas administradoras.

## Qué incluye

- Conteos de las tablas y resumen de eventos analíticos de los últimos 30 días.
- Exploración paginada de las tablas públicas de la aplicación, con contenidos binarios mostrados como tamaño de archivo.
- Formularios de alta construidos según las columnas requeridas y sus tipos. Se aceptan arrays separados por comas y JSON válido; se admiten imágenes JPG, PNG y WebP de hasta 5 MB para columnas binarias.
- Eliminación de filas por sus llaves primarias. PostgreSQL aplica las relaciones y reglas de borrado definidas en el esquema.

Las columnas de hash de contraseña y vínculo de Google nunca se muestran en formularios de alta. La tabla interna de migraciones de Prisma se excluye del explorador.
