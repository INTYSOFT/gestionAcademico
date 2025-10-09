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

## Configuración de OAuth2/OIDC

La aplicación usa `angular-auth-oidc-client` con Authorization Code + PKCE, almacenamiento en memoria para tokens y renovación anticipada del refresh token (60 segundos antes de expirar). Para habilitar la autenticación debes:

1. Registrar la SPA en tu proveedor (Auth0, Keycloak o Azure AD/Entra ID).
2. Habilitar PKCE, `offline_access` y **Refresh Token Rotation** (si el proveedor lo soporta).
3. Configurar las URL de callback y logout que se indican a continuación.
4. Actualizar los archivos `src/environments/environment.ts` y `src/environments/environment.prod.ts` con los valores de tu IdP.

### URLs requeridas por proveedor

| Proveedor | Callback / Redirect URI | Post logout redirect | Web Origins / CORS | Claim de roles típico |
|-----------|-------------------------|-----------------------|--------------------|-----------------------|
| Auth0 | `http://localhost:4200`, `https://app.yourdomain.com` | `http://localhost:4200`, `https://app.yourdomain.com` | `http://localhost:4200`, `https://app.yourdomain.com` | `https://YOUR_DOMAIN/roles` (regla personalizada) |
| Keycloak | `http://localhost:4200`, `https://app.yourdomain.com` | `http://localhost:4200`, `https://app.yourdomain.com` | `http://localhost:4200`, `https://app.yourdomain.com` | `realm_access.roles` (o `resource_access.<client>.roles`) |
| Azure AD (Entra ID) | `http://localhost:4200`, `https://app.yourdomain.com` | `http://localhost:4200`, `https://app.yourdomain.com` | `https://app.yourdomain.com` | `roles` |

> 💡 En Auth0 habilita **Rotating Refresh Tokens** y la grant type `Refresh Token`. En Keycloak marca "Use PKCE" dentro del cliente público y activa la política de refresh tokens. En Azure AD crea una aplicación de tipo "Single-page application" y habilita el flujo Authorization Code.

### Configuración `environment.oidc`

| Propiedad | Descripción | Ejemplo Auth0 | Ejemplo Keycloak | Ejemplo Azure AD |
|-----------|-------------|---------------|------------------|------------------|
| `authority` | URL del documento `.well-known/openid-configuration`. | `https://TENANT.eu.auth0.com/.well-known/openid-configuration` | `https://idp.yourdomain.com/realms/mi-realm/.well-known/openid-configuration` | `https://login.microsoftonline.com/TENANT_ID/v2.0/.well-known/openid-configuration` |
| `clientId` | ID de cliente registrado en el proveedor. | `spa_dashboard` | `gestion-academica-spa` | `00000000-0000-0000-0000-000000000000` |
| `redirectUrl` | URL de callback en desarrollo. | `http://localhost:4200` | `http://localhost:4200` | `http://localhost:4200` |
| `postLogoutRedirectUri` | URL donde regresará tras `end_session`. | `http://localhost:4200` | `http://localhost:4200` | `http://localhost:4200` |
| `responseType` | Tipo de respuesta OIDC. | `code` | `code` | `code` |
| `scope` | Scopes solicitados. Debe incluir `offline_access` para refresh tokens. | `openid profile email offline_access` | `openid profile email offline_access` | `openid profile email offline_access api://API_ID/.default` |
| `useRefreshToken` | Activa el uso de refresh tokens. | `true` | `true` | `true` |
| `renewTimeBeforeTokenExpiresInSeconds` | Tiempo (segundos) para renovar antes de expirar. | `60` | `60` | `60` |
| `secureRoutes` | API protegidas donde se inyecta `Authorization`. | `['http://localhost:3000', 'https://api.yourdomain.com']` | `['http://localhost:8080']` | `['https://api.yourdomain.com']` |
| `roleClaim` | Claim que contiene los roles. | `https://TENANT.eu.auth0.com/roles` | `realm_access.roles` | `roles` |
| `customParamsAuthRequest` | Parámetros adicionales en la autorización (opcional). | `{ audience: 'https://api.yourdomain.com' }` | `{}` | `{}` |
| `providerName` | Texto mostrado en la pantalla de login. | `Auth0` | `Keycloak` | `Azure AD` |
| `persistTokensInSessionStorage` | Usa `sessionStorage` del navegador en lugar del almacenamiento en memoria (por defecto `false`). Actívalo solo si necesitas que la sesión sobreviva a un refresh del navegador. | `false` | `false` | `true` (opcional) |

Tras actualizar los entornos ejecuta `npm start` para desarrollo o `npm run build` para producción. Recuerda exponer tu API en una de las rutas configuradas dentro de `secureRoutes` para que los interceptores agreguen el token Bearer automáticamente.
