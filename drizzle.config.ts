import { defineConfig } from 'drizzle-kit';

// Use the appropriate database URL based on environment
// Local dev and preview: dev branch
// Production: main branch
const dbUrl = process.env.POSTGRES_URL;

if (!dbUrl) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export default defineConfig({
  out: './drizzle',
  schema: './app/lib/db/ff-schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});
