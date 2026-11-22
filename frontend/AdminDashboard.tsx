import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';
import './admin-dashboard.css';

// Mantiene el panel en la misma API que el resto del frontend, incluso en deploy.
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
type Column = { name: string; dataType: string; nullable: boolean; hasDefault: boolean; writable: boolean };
type TableInfo = { name: string; count: number; primaryKey: string[]; columns: Column[] };
type Overview = { counts: { name: string; count: number }[]; tableCount: number; totalRows: number; approvedBusinesses: number; pendingBusinesses: number; recentEvents: number; eventBreakdown: { type: string; count: number }[] };

const title = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const display = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
};

export default function AdminDashboard({ sessionActive, userName, onRequestLogin }: { sessionActive: boolean; userName?: string; onRequestLogin: () => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const limit = 50;

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await apiFetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json',  ...init.headers } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error?.message || 'No fue posible completar la operación.');
    return result.data;
  }, []);

  const loadOverview = useCallback(async () => {
    const [stats, available] = await Promise.all([request('/admin/overview'), request('/admin/tables')]);
    setOverview(stats as Overview);
    setTables(available as TableInfo[]);
    setAuthorized(true);
  }, [request]);

  const loadTable = useCallback(async (table: string, pageOffset = 0) => {
    if (!table) return;
    setBusy(true); setError('');
    try {
      const result = await request(`/admin/tables/${encodeURIComponent(table)}?limit=${limit}&offset=${pageOffset}`);
      setRows(result.rows as Record<string, unknown>[]); setColumns(result.columns as Column[]); setPrimaryKey(result.primaryKey as string[]); setTotal(result.total as number); setOffset(pageOffset);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'No se pudo cargar la tabla.'); }
    finally { setBusy(false); }
  }, [request]);

  useEffect(() => {
    if (!sessionActive) { setAuthorized(false); return; }
    loadOverview().then(() => setError('')).catch((problem) => {
      const message = problem instanceof Error ? problem.message : 'No se pudo consultar la base de datos.';
      setAuthorized(false); setError(message);
    });
  }, [sessionActive, loadOverview]);

  useEffect(() => { if (authorized && selected) void loadTable(selected, 0); }, [authorized, selected, loadTable]);

  const visibleRows = useMemo(() => rows.filter((row) => !query || Object.values(row).some((value) => display(value).toLowerCase().includes(query.toLowerCase()))), [rows, query]);
  const writableColumns = columns.filter((column) => column.writable && !column.hasDefault);
  const visibleColumns = columns.filter((column) => !['password_hash', 'google_id'].includes(column.name) && column.dataType !== 'bytea');
  const binaryColumns = columns.filter((column) => column.dataType === 'bytea');

  const addRecord = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const input: Record<string, unknown> = {};
      for (const column of writableColumns) {
        const raw = values[column.name]?.trim();
        if (!raw) continue;
        if (column.dataType === 'bytea') input[column.name] = raw;
        else if (column.dataType.endsWith('[]')) input[column.name] = raw.split(',').map((item) => item.trim()).filter(Boolean);
        else if (column.dataType === 'json' || column.dataType === 'jsonb') input[column.name] = JSON.parse(raw);
        else if (['integer', 'bigint', 'numeric', 'double precision', 'real'].includes(column.dataType)) input[column.name] = Number(raw);
        else if (column.dataType === 'boolean') input[column.name] = raw === 'true';
        else input[column.name] = raw;
      }
      await request(`/admin/tables/${encodeURIComponent(selected)}`, { method: 'POST', body: JSON.stringify({ values: input }) });
      setValues({}); setFormOpen(false); setNotice('Registro creado en la base de datos.'); await Promise.all([loadOverview(), loadTable(selected, 0)]);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'No se pudo crear el registro.'); }
    finally { setBusy(false); }
  };

  const deleteRecord = async (row: Record<string, unknown>) => {
    const key = Object.fromEntries(primaryKey.map((field) => [field, row[field]]));
    if (!window.confirm('¿Eliminar este registro de forma permanente? Si tiene datos relacionados, la base de datos puede impedirlo o aplicar sus reglas de borrado.')) return;
    setBusy(true); setError(''); setNotice('');
    try { await request(`/admin/tables/${encodeURIComponent(selected)}`, { method: 'DELETE', body: JSON.stringify({ key }) }); setNotice('Registro eliminado.'); await Promise.all([loadOverview(), loadTable(selected, offset)]); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'No se pudo eliminar el registro.'); }
    finally { setBusy(false); }
  };

  if (!sessionActive) return <main className="admin-gate"><div className="admin-gate-card"><span className="admin-kicker">PUERTO ESCONDIDO · ADMINISTRACIÓN</span><div className="admin-lock">⌑</div><h1>Panel de administración</h1><p>Inicia sesión con una cuenta autorizada para consultar las estadísticas y administrar los registros.</p><button className="admin-primary" onClick={onRequestLogin}>Iniciar sesión</button><small>El panel no tiene enlaces en la navegación pública y la API valida el rol de administrador.</small></div></main>;

  if (authorized === false) return <main className="admin-gate"><div className="admin-gate-card"><span className="admin-kicker">ACCESO RESTRINGIDO</span><div className="admin-lock">⌑</div><h1>Se requiere una cuenta administradora</h1><p>{error || `La cuenta ${userName || 'actual'} no tiene permisos para este panel.`}</p><button className="admin-secondary" onClick={() => window.location.assign('/')}>Volver al sitio</button><small>Asigna el rol SUPERADMIN a una cuenta autorizada en PostgreSQL y vuelve a iniciar sesión.</small></div></main>;

  return <main className="admin-shell"><aside className="admin-sidebar"><a className="admin-brand" href="/">P. <span>Puerto<br/>Escondido</span></a><span className="admin-kicker">CENTRO DE CONTROL</span><p className="admin-side-caption">Administración</p><nav aria-label="Secciones del panel"><a className="admin-side-active" href="#resumen">▦ <span>Resumen</span></a><a href="#datos">▤ <span>Base de datos</span></a><a href="#metricas">⌁ <span>Analítica</span></a></nav><div className="admin-side-user"><span className="admin-avatar">{(userName || 'A').slice(0, 1)}</span><div><b>{userName || 'Administrador'}</b><small>SUPERADMIN</small></div></div></aside>
    <section className="admin-main"><header className="admin-topbar"><div><span className="admin-kicker">PUERTO ESCONDIDO · CÓRDOBA</span><h1>Panel de control</h1></div><div className="admin-live"><i/> Base de datos conectada</div></header>
      {error && <div className="admin-alert">{error}<button onClick={() => setError('')} aria-label="Cerrar">×</button></div>}{notice && <div className="admin-notice">{notice}<button onClick={() => setNotice('')} aria-label="Cerrar">×</button></div>}
      <section id="resumen" className="admin-section"><div className="admin-section-heading"><div><span className="admin-kicker">VISTA GENERAL</span><h2>Tu municipio, en cifras</h2></div><button className="admin-refresh" onClick={() => void loadOverview()}>↻ Actualizar</button></div>
        {overview ? <div className="admin-stat-grid"><article><span>Registros en total</span><b>{overview.totalRows.toLocaleString('es-CO')}</b><small>{overview.tableCount} tablas disponibles</small></article><article><span>Negocios publicados</span><b>{overview.approvedBusinesses}</b><small>Visibles en el directorio</small></article><article><span>Por revisar</span><b>{overview.pendingBusinesses}</b><small>Solicitudes de anfitriones</small></article><article><span>Eventos (30 días)</span><b>{overview.recentEvents}</b><small>Actividad registrada</small></article></div> : <div className="admin-loading">Conectando con la base de datos…</div>}</section>
      <section id="metricas" className="admin-section"><div className="admin-section-heading"><div><span className="admin-kicker">TRÁFICO Y USO</span><h2>Actividad registrada</h2></div></div><div className="admin-events">{overview?.eventBreakdown.length ? overview.eventBreakdown.map((event) => <article key={event.type}><div><span className="admin-event-icon">↗</span><b>{title(event.type)}</b></div><strong>{event.count}</strong></article>) : <p>Todavía no hay eventos analíticos registrados.</p>}</div></section>
      <section id="datos" className="admin-section admin-data-section"><div className="admin-section-heading"><div><span className="admin-kicker">EXPLORADOR DE DATOS</span><h2>Base de datos</h2><p>Consulta las filas por tabla. Las imágenes se muestran como tamaño de archivo y no se descargan en bloque.</p></div></div><div className="admin-data-layout"><aside className="admin-table-list"><label>Tablas <span>{tables.length}</span></label>{tables.map((table) => <button className={selected === table.name ? 'active' : ''} key={table.name} onClick={() => { setSelected(table.name); setQuery(''); setFormOpen(false); }}><span>{title(table.name)}</span><b>{table.count}</b></button>)}</aside><div className="admin-table-content"><div className="admin-table-toolbar"><div><h3>{selected ? title(selected) : 'Selecciona una tabla'}</h3><small>{total.toLocaleString('es-CO')} registros</small></div><div className="admin-table-actions"><input aria-label="Buscar en los registros cargados" placeholder="Buscar en esta página…" value={query} onChange={(event) => setQuery(event.target.value)}/><button disabled={!selected || !writableColumns.length} onClick={() => { setValues({}); setFormOpen((open) => !open); }}>＋ Agregar</button></div></div>
          {formOpen && <form className="admin-create-form" onSubmit={(event) => void addRecord(event)}><div className="admin-form-heading"><b>Nuevo registro · {title(selected)}</b><button type="button" onClick={() => setFormOpen(false)}>×</button></div><div className="admin-form-grid">{writableColumns.map((column) => <label key={column.name}><span>{title(column.name)}{!column.nullable && <i> requerido</i>}</span>{column.dataType === 'bytea' ? <input type="file" accept="image/jpeg,image/png,image/webp" required={!column.nullable} onChange={(event) => {const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) {setError('Las imágenes deben pesar máximo 5 MB.'); event.target.value = ''; return;} const reader = new FileReader(); reader.onload = () => {const base64 = String(reader.result).split(',')[1] || ''; const mimeName = column.name === 'coverImageData' ? 'coverMimeType' : 'mimeType'; setValues((current) => ({ ...current, [column.name]: base64, [mimeName]: file.type }));}; reader.readAsDataURL(file); }}/>: column.dataType === 'boolean' ? <select value={values[column.name] || ''} required={!column.nullable} onChange={(event) => setValues({ ...values, [column.name]: event.target.value })}><option value="">Seleccionar…</option><option value="true">Sí</option><option value="false">No</option></select> : <input value={values[column.name] || ''} required={!column.nullable} placeholder={column.dataType.endsWith('[]') ? 'Separar valores con comas' : column.dataType.startsWith('timestamp') ? '2026-01-30T12:00:00Z' : column.dataType} onChange={(event) => setValues({ ...values, [column.name]: event.target.value })}/>}</label>)}</div><div className="admin-form-actions"><span>Los campos con valor predeterminado los genera PostgreSQL. Imágenes JPG, PNG o WebP de hasta 5 MB.</span><button className="admin-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button></div></form>}
          <div className="admin-grid-scroll">{selected ? busy && !rows.length ? <p className="admin-loading">Cargando registros…</p> : <table><thead><tr>{visibleColumns.map((column) => <th key={column.name}>{title(column.name)}</th>)}{binaryColumns.map((column) => <th key={column.name}>{title(column.name)} · tamaño</th>)}<th>Acciones</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={primaryKey.map((key) => String(row[key])).join('-') || index}>{visibleColumns.map((column) => <td key={column.name} title={display(row[column.name])}>{display(row[column.name])}</td>)}{binaryColumns.map((column) => <td key={`${column.name}__bytes`}>{row[`${column.name}__bytes`] ? `${display(row[`${column.name}__bytes`])} bytes` : 'Sin archivo'}</td>)}<td><button className="admin-delete" disabled={!primaryKey.length || busy} onClick={() => void deleteRecord(row)} title="Eliminar registro">Eliminar</button></td></tr>)}</tbody></table> : <p className="admin-empty">Elige una tabla del panel lateral para inspeccionar sus registros.</p>}</div>
          {selected && <div className="admin-pagination"><span>Filtrados en esta página: {visibleRows.length} · Total: {total}</span><div><button disabled={offset === 0 || busy} onClick={() => void loadTable(selected, Math.max(0, offset - limit))}>← Anterior</button><button disabled={offset + limit >= total || busy} onClick={() => void loadTable(selected, offset + limit)}>Siguiente →</button></div></div>}
        </div></div></section>
      <footer className="admin-footer">Panel privado de Puerto Escondido · Los cambios se escriben directamente en PostgreSQL.</footer>
    </section></main>;
}
