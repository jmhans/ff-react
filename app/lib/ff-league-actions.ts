'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

export async function setLeagueIncluded(leagueId: string, formData: FormData) {
  const included = formData.get('included') === 'true';

  await sql`
    UPDATE ff_leagues
    SET include_in_pool = ${included}, updated_at = now()
    WHERE id = ${leagueId}
  `;

  revalidatePath('/dashboard/admin/league-picker');
}
