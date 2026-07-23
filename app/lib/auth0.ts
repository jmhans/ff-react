import { Auth0Client } from "@auth0/nextjs-auth0/server";

const previewBaseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const normalizedAuth0Domain = process.env.AUTH0_DOMAIN
  ?.replace(/^https?:\/\//i, '')
  .replace(/\/$/, '');

const appBaseUrl =
  process.env.VERCEL_ENV === 'preview'
    ? previewBaseUrl
    : process.env.APP_BASE_URL || previewBaseUrl || 'http://localhost:3000';

export const auth0 = new Auth0Client({
  appBaseUrl,
  ...(normalizedAuth0Domain ? { domain: normalizedAuth0Domain } : {}),
  beforeSessionSaved: async (session) => {
    // Auth0 v4 filters out custom claims by default - preserve them from ID token
    const namespace = process.env.AUTH0_CLAIMS_NAMESPACE || 'https://ff-react.local';
    const rolesKey = `${namespace}/roles`;

    if (session.idToken) {
      const idToken = session.idToken as Record<string, unknown>;
      const user = session.user as Record<string, unknown>;

      if (idToken[rolesKey]) {
        user[rolesKey] = idToken[rolesKey];
      }
    }

    return session;
  },
});