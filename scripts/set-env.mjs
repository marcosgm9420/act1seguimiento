/**
 * Genera `src/environments/supabase.config.ts` a partir de variables de entorno.
 *
 * Así la URL y la clave pública (anon) de Supabase no se guardan en el repositorio:
 *  - En local se leen del fichero `.env` (ignorado por Git, ver `.env.example`).
 *  - En Vercel / GitHub Actions se leen de las variables de entorno del proyecto.
 *
 * Se ejecuta automáticamente antes de `start`, `build` y `test` (scripts `pre*` de npm).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envFile = resolve(root, '.env');

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  console.warn('[set-env] Aviso: faltan SUPABASE_URL o SUPABASE_ANON_KEY. La app mostrará un aviso de configuración.');
}

const content = `// Fichero generado por scripts/set-env.mjs. No editar ni subir a Git.
export const supabaseConfig = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;

writeFileSync(resolve(root, 'src/environments/supabase.config.ts'), content);
console.log('[set-env] src/environments/supabase.config.ts generado.');
