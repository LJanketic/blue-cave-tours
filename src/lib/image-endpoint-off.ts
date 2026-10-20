import type { APIRoute } from 'astro';

/**
 * Stands in for Astro's on-demand /_image endpoint in production builds (see
 * astro.config.mjs). Prerendered pages get their images optimised at build
 * time and server-rendered pages use prebuilt thumbnails, so nothing needs
 * resizing at request time, and nobody can make the function run sharp.
 */
export const GET: APIRoute = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=86400' } });
