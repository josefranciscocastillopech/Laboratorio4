// Dónde se consulta la API.
// "/api/laboratorio" usa el proxy del mismo dominio (server.mjs en local, netlify.toml / vercel.json en producción).
// Si activas CORS en la API, puedes poner la URL directa:
//   apiBase: 'https://laboratorio4api.onrender.com/api/laboratorio'
window.APP_CONFIG = {
  apiBase: '/api/laboratorio',
};
