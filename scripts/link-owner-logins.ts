import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

// Re-run this anytime with more entries appended — ON CONFLICT makes it a no-op for ones already linked.
const mappings = [
  { ownerName: 'Justin Hanson', auth0UserId: 'auth0|56cb65326b9c610446a02b2b', email: 'jmhans@hotmail.com' },
  { ownerName: 'Justin Hanson', auth0UserId: 'google-oauth2|109793316122013596702', email: 'justinmhanson@gmail.com' },
  { ownerName: 'Andy Martin', auth0UserId: 'google-oauth2|111095235670076981649', email: 'armartin547@gmail.com' },
  { ownerName: 'Michael Kongevick', auth0UserId: 'google-oauth2|101410846329126510932', email: 'mkongevick@gmail.com' },
  { ownerName: 'Austin Bichler', auth0UserId: 'google-oauth2|111413318866741263069', email: 'ajbichler@gmail.com' },
  { ownerName: 'Thomas Green', auth0UserId: 'google-oauth2|109190623041522841341', email: 'trex98pats@gmail.com' },
  { ownerName: 'Brendan Sheehan', auth0UserId: 'auth0|5d71736ac4cda00c96090546', email: 'brendanjamessheehan@gmail.com' },
  { ownerName: 'Eric VanderMolen', auth0UserId: 'google-oauth2|100891258175155379892', email: 'vandermolen.eric@gmail.com' },
  { ownerName: 'Kyle Hall', auth0UserId: 'google-oauth2|117393402495650700638', email: 'kmhall390@gmail.com' },
  { ownerName: 'Scott Baker', auth0UserId: 'auth0|5f5f71771e076c00797dbb28', email: 'rolandd1999@yahoo.com' },
  { ownerName: 'Scott Baker', auth0UserId: 'google-oauth2|116638571395132099739', email: 'RolandD1999@yahoo.com' },
  { ownerName: 'Scott Baker', auth0UserId: 'windowslive|fe72f54b716752a6', email: 'RolandD1999@yahoo.com' },
  { ownerName: 'Adam Hahn', auth0UserId: 'google-oauth2|101877285963063511946', email: 'arhahn22@gmail.com' },
];

async function main() {
  for (const m of mappings) {
    const owner = await sql`SELECT id FROM ff_owners WHERE display_name = ${m.ownerName}`;
    if (owner.rows.length === 0) {
      console.log(`NO OWNER MATCH for "${m.ownerName}" (${m.auth0UserId})`);
      continue;
    }
    const result = await sql`
      INSERT INTO ff_owner_logins (owner_id, auth0_user_id, email)
      VALUES (${owner.rows[0].id}, ${m.auth0UserId}, ${m.email})
      ON CONFLICT (auth0_user_id) DO NOTHING
      RETURNING id
    `;
    console.log(result.rowCount > 0 ? `Linked ${m.ownerName} <- ${m.auth0UserId}` : `Already linked: ${m.auth0UserId}`);
  }

  console.log('\nCurrent link counts by owner:');
  const counts = await sql`
    SELECT o.display_name, count(l.id) as logins
    FROM ff_owners o
    LEFT JOIN ff_owner_logins l ON l.owner_id = o.id
    GROUP BY o.display_name
    ORDER BY o.display_name
  `;
  console.table(counts.rows);
}
main();
