# Angular Admin Template

Plantilla administrativa basada en Angular 20 con Angular Material, TailwindCSS y un sistema de layouts tipo Fuse. Incluye configuración de calidad con ESLint, Prettier, Husky, lint-staged, commitlint, Jest y Playwright, además de soporte i18n y Docker.

## Scripts principales

- `npm start`: levanta el servidor de desarrollo.
- `npm run build`: compila la aplicación para producción.
- `npm run lint`: ejecuta ESLint sobre los archivos TypeScript.
- `npm run format`: formatea los archivos con Prettier.
- `npm test`: ejecuta las pruebas unitarias con Jest.
- `npm run e2e`: ejecuta las pruebas end-to-end con Playwright.

## Husky

Ejecuta lint-staged y commitlint durante los ganchos de Git. Inicializa Husky con `npm install` (script `prepare`).

## Docker

Genera una imagen de producción multi-stage. Construye y ejecuta con:

```bash
docker build -t angular-admin .
docker run -p 8080:80 angular-admin
```

La aplicación estará disponible en `http://localhost:8080`.
