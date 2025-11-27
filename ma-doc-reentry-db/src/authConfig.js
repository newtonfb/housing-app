const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common'
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || ''
const redirectUri =
  import.meta.env.VITE_AZURE_REDIRECT_URI ||
  (typeof window !== 'undefined' ? window.location.origin : '')

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

export const loginRequest = {
  scopes: (import.meta.env.VITE_AZURE_SCOPES || 'User.Read')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean),
}
