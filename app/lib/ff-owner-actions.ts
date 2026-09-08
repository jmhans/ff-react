'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { getClaimedOwner } from '@/app/lib/ff-draft-helpers';

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
  const claimed = await getClaimedOwner();
  if (!claimed || (claimed.id !== ownerId && !claimed.isAdmin)) {
    return;
  }

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
  revalidatePath(`/dashboard/teams/${ownerId}`);
  revalidatePath('/dashboard/standings');
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

export async function addOwnerLogin(ownerId: string, formData: FormData) {
  const auth0UserIdRaw = formData.get('auth0UserId');
  const emailRaw = formData.get('email');
  const auth0UserId = typeof auth0UserIdRaw === 'string' ? auth0UserIdRaw.trim() : '';
  const email = typeof emailRaw === 'string' && emailRaw.trim().length > 0 ? emailRaw.trim() : null;
  if (!auth0UserId) return;

  await sql`
    INSERT INTO ff_owner_logins (owner_id, auth0_user_id, email)
    VALUES (${ownerId}, ${auth0UserId}, ${email})
    ON CONFLICT (auth0_user_id) DO NOTHING
  `;

  revalidatePath(`/dashboard/admin/owners/${ownerId}`);
  revalidatePath('/dashboard/draft');
}

export async function removeOwnerLogin(loginId: string, formData: FormData) {
  const ownerIdRaw = formData.get('ownerId');
  const ownerId = typeof ownerIdRaw === 'string' ? ownerIdRaw : '';

  await sql`DELETE FROM ff_owner_logins WHERE id = ${loginId}`;

  if (ownerId) revalidatePath(`/dashboard/admin/owners/${ownerId}`);
  revalidatePath('/dashboard/draft');
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
