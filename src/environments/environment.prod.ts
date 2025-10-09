export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api',
  oidc: {
    authority: 'https://YOUR_DOMAIN/.well-known/openid-configuration',
    clientId: 'YOUR_CLIENT_ID',
    redirectUrl: 'https://app.yourdomain.com',
    postLogoutRedirectUri: 'https://app.yourdomain.com',
    responseType: 'code',
    scope: 'openid profile email offline_access',
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 60,
    secureRoutes: ['https://api.yourdomain.com'],
    roleClaim: 'roles',
    customParamsAuthRequest: { audience: 'YOUR_API_AUDIENCE' },
    providerName: 'Auth0',
    persistTokensInSessionStorage: false
  }
} as const;
