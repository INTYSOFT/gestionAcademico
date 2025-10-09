export const environment = {
  production: false,
  mockAuth: true,
  oidc: {
    authority: 'https://YOUR_DOMAIN/.well-known/openid-configuration',
    clientId: 'YOUR_CLIENT_ID',
    redirectUrl: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    responseType: 'code',
    scope: 'openid profile email offline_access',
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 60,
    secureRoutes: ['http://localhost:3000', 'https://api.yourdomain.com'],
    roleClaim: 'roles',
    customParamsAuthRequest: { audience: 'YOUR_API_AUDIENCE' },
    provider: 'Auth0',
    persistTokens: false
  }
} as const;
