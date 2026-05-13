/** Geliştirmede yerel FastAPI (uvicorn); production'da uzak adres veya VITE_API_URL */
export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  (import.meta.env.DEV
    ? 'http://localhost:8000'
    : 'https://manici.yefeblgn.net/mireditor/api')
) as string;
