import { Router } from 'express';
import { z } from 'zod';

export const attractionsRouter = Router();

// Nominatim es un servicio compartido: cacheamos resultados y limitamos consultas nuevas.
const searchCache = new Map<string, { expiresAt: number; results: { lat: string; lon: string; display_name: string }[] }>();
let lastSearchAt = 0;

attractionsRouter.get('/search', async (req, res) => {
  const query = z.string().trim().min(3).max(160).parse(req.query.q);
  const cacheKey = query.toLocaleLowerCase('es-CO');
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ data: cached.results });
    return;
  }

  const waitMs = Math.max(0, 1_000 - (Date.now() - lastSearchAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastSearchAt = Date.now();

  const parameters = new URLSearchParams({
    q: `${query}, Puerto Escondido, Córdoba, Colombia`, format: 'jsonv2', addressdetails: '1',
    countrycodes: 'co', limit: '5', viewbox: '-76.6,9.3,-76.0,8.8', bounded: '0',
  });
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${parameters}`, {
      headers: { 'User-Agent': 'PuertoEscondidoTourism/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);
    const rows = await response.json() as { lat: string; lon: string; display_name: string }[];
    const results = rows.slice(0, 5).map(({ lat, lon, display_name }) => ({ lat, lon, display_name }));
    searchCache.set(cacheKey, { expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, results });
    res.json({ data: results });
  } catch (error) {
    console.warn('No se pudo consultar Nominatim para el registro local:', error instanceof Error ? error.message : error);
    res.status(503).json({ error: { message: 'El buscador del mapa no está disponible en este momento. Puedes colocar el pin manualmente.' } });
  }
});
