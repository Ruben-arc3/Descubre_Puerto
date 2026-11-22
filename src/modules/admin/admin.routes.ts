import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, ForbiddenError } from '../../shared/errors/AppError';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

export const adminRouter = Router();

// El panel trabaja con nombres obtenidos de information_schema, nunca con
// identificadores arbitrarios enviados por el cliente.
type Column = { table_name: string; column_name: string; data_type: string; udt_name: string; is_nullable: 'YES' | 'NO'; column_default: string | null; is_generated: string; ordinal_position: number };
type Table = { table_name: string; columns: Column[]; primaryKey: string[] };
const excludedTables = new Set(['_prisma_migrations']);
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
const typeName = (column: Column) => column.data_type === 'USER-DEFINED' ? column.udt_name : column.data_type === 'ARRAY' ? `${column.udt_name.replace(/^_/, '')}[]` : column.data_type;

const requireDatabaseAdmin: RequestHandler = async (req, _res, next) => {
  const current = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true, isActive: true } });
  if (!current?.isActive || current.role !== 'SUPERADMIN') throw new ForbiddenError();
  next();
};

adminRouter.use(requireAuth, requireDatabaseAdmin);

async function getTables(): Promise<Table[]> {
  const [rawColumns, rawKeys] = await Promise.all([
    prisma.$queryRaw<Column[]>`SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default, c.is_generated, c.ordinal_position FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name WHERE c.table_schema='public' AND t.table_type='BASE TABLE' ORDER BY c.table_name, c.ordinal_position`,
    prisma.$queryRaw<{ table_name: string; column_name: string; ordinal_position: number }[]>`SELECT tc.table_name, kcu.column_name, kcu.ordinal_position FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema AND tc.table_name=kcu.table_name WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY' ORDER BY tc.table_name, kcu.ordinal_position`,
  ]);
  const names = [...new Set(rawColumns.map((column) => column.table_name))].filter((name) => !excludedTables.has(name));
  return names.map((table_name) => ({
    table_name,
    columns: rawColumns.filter((column) => column.table_name === table_name),
    primaryKey: rawKeys.filter((key) => key.table_name === table_name).sort((a, b) => a.ordinal_position - b.ordinal_position).map((key) => key.column_name),
  }));
}

function safeColumns(table: Table) {
  // Los binarios se representan como tamaño y los hashes/identificadores privados nunca se exponen.
  return table.columns.filter((column) => column.data_type !== 'bytea' && !['password_hash', 'google_id'].includes(column.column_name));
}

adminRouter.get('/overview', async (_req, res) => {
  const tables = await getTables();
  const counts = await Promise.all(tables.map(async (table) => {
    const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM ${quote('public')}.${quote(table.table_name)}`);
    return { name: table.table_name, count: Number(count) };
  }));
  const events = await prisma.analyticsEvent.groupBy({ by: ['eventType'], _count: { _all: true } }).catch(() => []);
  const recentEvents = await prisma.analyticsEvent.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }).catch(() => 0);
  const approvedBusinesses = await prisma.business.count({ where: { status: 'APPROVED' } });
  const pendingBusinesses = await prisma.business.count({ where: { status: 'PENDING' } });
  res.json({ data: { counts, tableCount: counts.length, totalRows: counts.reduce((sum, row) => sum + row.count, 0), approvedBusinesses, pendingBusinesses, recentEvents, eventBreakdown: events.map((event) => ({ type: event.eventType, count: event._count._all })) } });
});

adminRouter.get('/tables', async (_req, res) => {
  const tables = await getTables();
  const counts = await Promise.all(tables.map(async ({ table_name }) => {
    const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM ${quote('public')}.${quote(table_name)}`);
    return [table_name, Number(count)] as const;
  }));
  const countMap = new Map(counts);
  res.json({ data: tables.map((table) => ({ name: table.table_name, count: countMap.get(table.table_name) ?? 0, primaryKey: table.primaryKey, columns: table.columns.map((column) => ({ name: column.column_name, dataType: typeName(column), nullable: column.is_nullable === 'YES', hasDefault: Boolean(column.column_default) || column.is_generated !== 'NEVER', writable: column.is_generated === 'NEVER' && !['password_hash', 'google_id'].includes(column.column_name) })) })) });
});

adminRouter.get('/tables/:table', async (req, res) => {
  const tableName = z.string().regex(/^[a-z_][a-z0-9_]*$/).parse(req.params.table);
  const table = (await getTables()).find((candidate) => candidate.table_name === tableName);
  if (!table) { res.status(404).json({ error: { message: 'Tabla no encontrada.' } }); return; }
  const limit = z.coerce.number().int().min(1).max(100).default(50).parse(req.query.limit ?? 50);
  const offset = z.coerce.number().int().min(0).default(0).parse(req.query.offset ?? 0);
  const columns = safeColumns(table);
  const projection = columns.map((column) => quote(column.column_name)).concat(table.columns.filter((column) => column.data_type === 'bytea').map((column) => `octet_length(${quote(column.column_name)}) AS ${quote(`${column.column_name}__bytes`)}`)).join(', ');
  const orderBy = table.primaryKey.length ? table.primaryKey.map(quote).join(', ') : '1';
  const rows = await prisma.$queryRawUnsafe(`SELECT ${projection} FROM ${quote('public')}.${quote(tableName)} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`, limit, offset);
  const [{ count }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM ${quote('public')}.${quote(tableName)}`);
  res.json({ data: { name: tableName, rows, total: Number(count), limit, offset, primaryKey: table.primaryKey, columns: table.columns.map((column) => ({ name: column.column_name, dataType: typeName(column), nullable: column.is_nullable === 'YES', hasDefault: Boolean(column.column_default) || column.is_generated !== 'NEVER', writable: column.is_generated === 'NEVER' && !['password_hash', 'google_id'].includes(column.column_name) })) } });
});

const recordSchema = z.object({ values: z.record(z.string(), z.unknown()) });
adminRouter.post('/tables/:table', async (req, res) => {
  const tableName = z.string().regex(/^[a-z_][a-z0-9_]*$/).parse(req.params.table);
  const table = (await getTables()).find((candidate) => candidate.table_name === tableName);
  if (!table) { res.status(404).json({ error: { message: 'Tabla no encontrada.' } }); return; }
  const { values } = recordSchema.parse(req.body);
  const writable = new Set(table.columns.filter((column) => column.is_generated === 'NEVER' && !column.column_default && !['password_hash', 'google_id'].includes(column.column_name)).map((column) => column.column_name));
  const provided = Object.keys(values).filter((name) => name !== 'password_hash' && name !== 'google_id');
  if (provided.some((name) => !table.columns.some((column) => column.column_name === name && column.is_generated === 'NEVER' && !['password_hash', 'google_id'].includes(name)))) throw new z.ZodError([]);
  const inputColumns = provided.filter((name) => writable.has(name));
  // Una tabla con columnas NOT NULL no puede insertarse vacía salvo que tenga defaults.
  const missing = table.columns.filter((column) => column.is_nullable === 'NO' && !column.column_default && column.is_generated === 'NEVER' && !inputColumns.includes(column.column_name));
  if (missing.length) { res.status(400).json({ error: { message: `Completa estos campos obligatorios: ${missing.map((column) => column.column_name).join(', ')}.` } }); return; }
  const normalizedValues = inputColumns.map((name) => {
    if (table.columns.find((column) => column.column_name === name)?.data_type !== 'bytea') return values[name];
    if (typeof values[name] !== 'string' || values[name].length > 7 * 1024 * 1024) throw new z.ZodError([]);
    const encoded = values[name] as string;
    const image = Buffer.from(encoded, 'base64');
    const mimeColumn = name === 'coverImageData' ? 'coverMimeType' : 'mimeType';
    const mimeType = values[mimeColumn];
    const signatureMatches = mimeType === 'image/jpeg' ? image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
      : mimeType === 'image/png' ? image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mimeType === 'image/webp' ? image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP' : false;
    if (!image.length || image.length > 5 * 1024 * 1024 || !signatureMatches) throw new z.ZodError([]);
    return image;
  });
  const insert = inputColumns.length
    ? `INSERT INTO ${quote('public')}.${quote(tableName)} (${inputColumns.map(quote).join(', ')}) VALUES (${inputColumns.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING ${table.primaryKey.length ? table.primaryKey.map(quote).join(', ') : '*'}`
    : `INSERT INTO ${quote('public')}.${quote(tableName)} DEFAULT VALUES RETURNING ${table.primaryKey.length ? table.primaryKey.map(quote).join(', ') : '*'}`;
  let inserted: unknown;
  try {
    inserted = await prisma.$queryRawUnsafe(insert, ...normalizedValues);
  } catch (error) {
    const code = (error as { meta?: { code?: string }; code?: string }).meta?.code ?? (error as { code?: string }).code;
    if (code === '23505') throw new ConflictError('Ya existe un registro con esos campos únicos.');
    if (code === '23503') throw new BadRequestError('La referencia a otra tabla no existe. Revisa los identificadores relacionados.');
    if (['22P02', '22007', '22003', '23502', '23514'].includes(code || '')) throw new BadRequestError('Revisa los campos: algún valor no coincide con el tipo o las reglas de esta tabla.');
    throw error;
  }
  res.status(201).json({ data: inserted });
});

adminRouter.delete('/tables/:table', async (req, res) => {
  const tableName = z.string().regex(/^[a-z_][a-z0-9_]*$/).parse(req.params.table);
  const table = (await getTables()).find((candidate) => candidate.table_name === tableName);
  if (!table) { res.status(404).json({ error: { message: 'Tabla no encontrada.' } }); return; }
  if (!table.primaryKey.length) { res.status(400).json({ error: { message: 'La tabla no tiene una llave primaria reconocida; no se puede eliminar una fila desde el panel.' } }); return; }
  const key = z.record(z.string(), z.unknown()).parse(req.body?.key);
  if (table.primaryKey.some((column) => !(column in key))) { res.status(400).json({ error: { message: 'Faltan valores de la llave primaria.' } }); return; }
  if (tableName === 'users') {
    const userId = String(key.id ?? '');
    if (userId === req.user!.id) throw new BadRequestError('No puedes eliminar la cuenta con la que tienes abierto este panel.');
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    if (target?.role === 'SUPERADMIN' && target.isActive) {
      const activeAdmins = await prisma.user.count({ where: { role: 'SUPERADMIN', isActive: true } });
      if (activeAdmins <= 1) throw new BadRequestError('No elimines al último administrador activo. Asigna primero otra cuenta administradora.');
    }
  }
  const where = table.primaryKey.map((column, index) => `${quote(column)}=$${index + 1}`).join(' AND ');
  let deleted: number;
  try {
    deleted = await prisma.$executeRawUnsafe(`DELETE FROM ${quote('public')}.${quote(tableName)} WHERE ${where}`, ...table.primaryKey.map((column) => key[column]));
  } catch (error) {
    const code = (error as { meta?: { code?: string }; code?: string }).meta?.code ?? (error as { code?: string }).code;
    if (code === '23503') throw new BadRequestError('Este registro todavía tiene información relacionada y la base de datos impide borrarlo.');
    throw error;
  }
  if (!deleted) { res.status(404).json({ error: { message: 'El registro ya no existe.' } }); return; }
  res.json({ data: { deleted } });
});
