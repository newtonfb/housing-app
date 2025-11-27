# Microsoft login

This Vite + React app now supports Microsoft (Entra ID / Azure AD) sign-in using MSAL.

## Setup
1) Install dependencies: `npm install`
2) Add environment variables (for local dev, create `.env.local` in the project root):
```
VITE_AZURE_CLIENT_ID=<application (client) id>
VITE_AZURE_TENANT_ID=<tenant id or "common">
# Optional
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_AZURE_SCOPES=User.Read
```
3) In Azure Portal, add the redirect URI above as a SPA redirect URI on your app registration.
4) Run the dev server: `npm run dev` and use the “Sign in with Microsoft” button.

The home page shows the current sign-in status, user name/email, and lets you sign out.
