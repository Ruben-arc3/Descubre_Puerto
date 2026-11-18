import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mantiene un origen local estable: Google OAuth compara el origen (protocolo,
// host y puerto) exactamente con los registrados en Google Cloud Console.
export default defineConfig({ plugins: [react()], root: '.', server: { port: 5174, strictPort: true } });
