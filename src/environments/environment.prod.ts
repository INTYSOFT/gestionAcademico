export const environment = {
  production: true,
  oidc: {
    authority: 'https://YOUR_DOMAIN/.well-known/openid-configuration',
    clientId: 'YOUR_CLIENT_ID',
    redirectUrl: 'https://yourapp.yourdomain.com',
    postLogoutRedirectUri: 'https://yourapp.yourdomain.com',
    responseType: 'code',
    scope: 'openid profile email offline_access',
    useRefreshToken: true,
    renewTimeBeforeTokenExpiresInSeconds: 60,
    secureRoutes: ['https://api.yourdomain.com'],
    roleClaim: 'roles',
    customParamsAuthRequest: { audience: 'YOUR_API_AUDIENCE' },
    provider: 'Auth0',
    persistTokens: false
  }
} as const;
