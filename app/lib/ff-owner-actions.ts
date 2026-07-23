'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

const ACTIVE_SEASON = process.env.SEASON || '2025';

function normalizeSeasonInput(seasonInput: FormDataEntryValue | null): string | null {
  if (typeof seasonInput !== 'string') {
    return null;
  }

  const trimmed = seasonInput.trim();
  if (!/^\d{4}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export async function updateOwnerTeamName(ownerId: string, formData: FormData) {
  const teamNameRaw = formData.get('teamName');
  const teamName = typeof teamNameRaw === 'string' ? teamNameRaw.trim() : '';

  await sql`
    UPDATE ff_owners
    SET
      team_name = ${teamName.length > 0 ? teamName : null},
      updated_at = now()
    WHERE id = ${ownerId}
  `;

  revalidatePath('/dashboard/admin/owners');
  revalidatePath(`/dashboard/admin/owners/${ownerId}`);
}

export async function addOwnerSeason(ownerId: string, formData: FormData) {
  const normalizedSeason = normalizeSeasonInput(formData.get('season'));
  if (!normalizedSeason) {
    return;
  }

  await sql`
    UPDATE ff_owners
    SET
      seasons = (
        SELECT ARRAY(
          SELECT DISTINCT season_value
          FROM unnest(COALESCE(seasons, ARRAY[]::text[]) || ${normalizedSeason}::text) AS season_value
          ORDER BY season_value
        )
      ),
      active = EXISTS (
        SELECT 1
        FROM unnest(COALESCE(seasons, ARRAY[]::text[]) || ${normalizedSeason}::text) AS season_value
        WHERE season_value = ${ACTIVE_SEASON}
      ),
      updated_at = now()
    WHERE id = ${ownerId}
  `;

  revalidatePath('/dashboard/admin/owners');
  revalidatePath(`/dashboard/admin/owners/${ownerId}`);
}

export async function removeOwnerSeason(ownerId: string, formData: FormData) {
  const seasonRaw = formData.get('season');
  const season = typeof seasonRaw === 'string' ? seasonRaw.trim() : '';
  if (!season) {
    return;
  }

  await sql`
    UPDATE ff_owners
    SET
      seasons = array_remove(COALESCE(seasons, ARRAY[]::text[]), ${season}),
      active = EXISTS (
        SELECT 1
        FROM unnest(array_remove(COALESCE(seasons, ARRAY[]::text[]), ${season})) AS season_value
        WHERE season_value = ${ACTIVE_SEASON}
      ),
      updated_at = now()
    WHERE id = ${ownerId}
  `;

  revalidatePath('/dashboard/admin/owners');
  revalidatePath(`/dashboard/admin/owners/${ownerId}`);
}
