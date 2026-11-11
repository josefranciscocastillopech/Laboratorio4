# Laboratorio 4 — PWA

Página web progresiva del juego (HTML + CSS + JS, sin dependencias). Consume la API
`https://laboratorio4api.onrender.com` y funciona sin conexión.

## Ejecutar en local

```bash
node server.mjs
```

Abre http://localhost:5173 . El servidor sirve `public/` y reenvía `/api/*` a la API
(la API no tiene CORS, por eso el navegador no puede llamarla directamente).

## Editar contenido

- `public/data/contenido.json`: datos del **evento** (fecha, hora, lugar, programa), dinámicas,
  eventos de la historia, enemigos y herramientas. **Cambia el evento por los datos reales.**
- `public/img/`: imágenes. `public/icons/`: íconos de la app instalada.
- Historia, personajes, controles y créditos vienen de la API.

## Publicar (HTTPS)

**Netlify** (recomendado): sube la carpeta con "Add new site → Deploy manually" o conecta el repositorio.
`netlify.toml` ya publica `public/` y configura el proxy de la API.

**Vercel**: importa el proyecto; `vercel.json` ya incluye lo mismo.

GitHub Pages no sirve a menos que actives CORS en la API y pongas la URL directa en `public/js/config.js`.

## Qué cubre el proyecto

- PWA instalable (`manifest.webmanifest`) y offline (`sw.js`).
- Páginas informativas: inicio, historia, personajes, enemigos, controles, créditos y evento.
- Navegación propia, búsqueda, filtros, favoritos, selección de personaje, ajustes y formulario de registro.
- Datos dinámicos desde la API y `localStorage`.

Si subes cambios, sube también `VERSION` en `public/sw.js` para que los usuarios reciban los archivos nuevos.
