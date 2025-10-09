# Gestión Académica Admin

Template de panel administrativo construido con Angular 20, Angular Material 20 y TailwindCSS 3 siguiendo un enfoque multi-layout inspirado en Fuse.

## Scripts

- `npm start`: levanta el servidor de desarrollo.
- `npm run build`: genera el build de producción.
- `npm test`: ejecuta Jest.
- `npm run e2e`: ejecuta Playwright.
- `npm run lint`: ejecuta ESLint.

## Calidad y DX

Este proyecto integra ESLint 9, Prettier 3, Husky, lint-staged y commitlint (Convencional). Ejecuta `npm install` y luego `npm run prepare` para inicializar los ganchos.

## Docker

Para construir la imagen Docker:

```bash
docker build -t gestion-academico-admin .
```

Luego ejecuta:

```bash
docker run -p 8080:80 gestion-academico-admin
```
