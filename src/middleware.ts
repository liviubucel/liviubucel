import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // New simplified routing:
  // / and /en/* -> English (default)
  // /ro/* -> Romanian
  // No middleware redirection needed - routes are handled directly by pages
  return next();
});
