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

## Autenticación OIDC

Esta fase integra autenticación real con OAuth2/OIDC usando el flujo Authorization Code + PKCE, tokens de actualización rotatorios y almacenamiento en memoria por defecto. El SDK [`angular-auth-oidc-client`](https://github.com/damienbod/angular-auth-oidc-client) gestiona la negociación de tokens, el refresco anticipado (60 s antes del vencimiento) y el cierre de sesión remoto (`end_session`).

### Requisitos generales

- Registrar las URIs de callback (`http://localhost:4200` en desarrollo) y post-logout (`http://localhost:4200`).
- Habilitar PKCE, `offline_access` y Refresh Token Rotation cuando el proveedor lo admita.
- Configurar los orígenes permitidos para `http://localhost:4200` y la URL pública de producción.
- No exponer secretos en el frontend: solo `clientId` y metadatos públicos.

### Configuración por proveedor

#### Auth0

- **Allowed Callback URLs**: `http://localhost:4200`, `https://tudominio.com`.
- **Allowed Logout URLs**: `http://localhost:4200`, `https://tudominio.com`.
- **Allowed Web Origins**: `http://localhost:4200`, `https://tudominio.com`.
- Activar **Refresh Token Rotation** y **Revoke Refresh Token**.
- Reclamo de roles típico: `https://YOUR_DOMAIN/roles` (defínelo como `roleClaim`).
- Si se protege una API, asigna el `audience` en `customParamsAuthRequest`.

#### Keycloak

- Configurar el cliente como **Confidential** o **Public** con PKCE habilitado.
- **Valid Redirect URIs**: `http://localhost:4200/*`, `https://tudominio.com/*`.
- **Web Origins**: `http://localhost:4200`, `https://tudominio.com`.
- Habilitar **Offline Access** y la política de rotación de refresh tokens.
- Reclamo de roles típico: `realm_access.roles` o `resource_access.api.roles` según la configuración.

#### Azure AD (Entra ID)

- Registrar una **App** tipo `Single-page application (SPA)` con redirect `http://localhost:4200`.
- Configurar logout redirect en `https://portal.azure.com` → `Authentication`.
- Habilitar `Access tokens (used for implicit flows)` y `ID tokens` para SPAs.
- Asignar el permiso de API `offline_access` y roles de aplicación; el reclamo suele estar en `roles` o `wids`.
- Para acceder a Microsoft Graph u otras APIs, usa `customParamsAuthRequest.audience` con el identificador correspondiente.

### environment.oidc

Completa los valores en `src/environments/environment*.ts` según el proveedor elegido:

| Propiedad | Descripción | Auth0 | Keycloak | Azure AD |
| --- | --- | --- | --- | --- |
| `authority` | URL del documento de configuración OpenID Connect | `https://YOUR_DOMAIN/.well-known/openid-configuration` | `https://KEYCLOAK_DOMAIN/realms/REALM/.well-known/openid-configuration` | `https://login.microsoftonline.com/TENANT/v2.0/.well-known/openid-configuration` |
| `clientId` | ID de cliente registrado | `YOUR_CLIENT_ID` | `gestion-academico-frontend` | `YOUR_APP_ID` |
| `redirectUrl` | URI de callback del SPA | `http://localhost:4200` | `http://localhost:4200` | `http://localhost:4200` |
| `postLogoutRedirectUri` | URI para retorno tras logout | `http://localhost:4200` | `http://localhost:4200` | `http://localhost:4200` |
| `responseType` | Flujo de autorización | `code` | `code` | `code` |
| `scope` | Alcances solicitados | `openid profile email offline_access` | `openid profile email offline_access` | `openid profile email offline_access api://YOUR_API/.default` |
| `useRefreshToken` | Forzar uso de refresh tokens | `true` | `true` | `true` |
| `renewTimeBeforeTokenExpiresInSeconds` | Renovación anticipada | `60` | `60` | `60` |
| `secureRoutes` | APIs protegidas con Bearer | `['http://localhost:3000', 'https://api.tudominio.com']` | `['http://localhost:8080', 'https://api.tudominio.com']` | `['https://graph.microsoft.com/v1.0']` |
| `roleClaim` | Ruta del reclamo de roles en el token | `https://YOUR_DOMAIN/roles` | `realm_access.roles` | `roles` |
| `customParamsAuthRequest` | Parámetros adicionales (opcional) | `{ audience: 'https://api.tudominio.com' }` | `{ resource: 'gestion-api' }` | `{ prompt: 'select_account' }` |
| `provider` | Texto mostrado en UI | `Auth0` | `Keycloak` | `Azure AD` |
| `persistTokens` | `false` para almacenamiento en memoria, `true` para `sessionStorage` | `false` | `false` | `false` |

> **Nota:** Si necesitas persistir tokens entre pestañas, establece `persistTokens: true`. El SDK usará `sessionStorage` en lugar del almacenamiento en memoria efímero.
