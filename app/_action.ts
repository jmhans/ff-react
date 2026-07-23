"use server";

import { revalidatePath } from "next/cache";

// Legacy file - all functionality has been moved to individual model action files
// See: app/lib/models/*/actions.ts

/**
 * Server Action: Create a new shift.
 * @deprecated Use shift model actions instead
 */
export async function createShiftAction({
  startTime,
  endTime,
  startLocation, 
  endLocation, 
  description, 
  path
}: {
  startTime?: Date ; 
  endTime: Date ;
  startLocation: string ;
  endLocation: string ;
  description: string ;
  path:string;
}) {
  // Functionality moved to app/lib/models/shift/actions.ts
  revalidatePath(path);
}

/**
 * Server Action: Update an existing shift.
 * @deprecated Use shift model actions instead
 */
export async function updateShiftAction(
  id: string,
  update: { startDate?: Date; endDate?: Date, startLocation?: string; endLocation?: string; description?: string; },
  path: string
) {
  // Functionality moved to app/lib/models/shift/actions.ts
  revalidatePath(path);
}

/**
 * Server Action: Delete a shift.
 * @deprecated Use shift model actions instead
 */
export async function deleteShiftAction({
  id,
  path,
}: {
  id: string;
  path: string;
}) {
  // Functionality moved to app/lib/models/shift/actions.ts
  revalidatePath(path);
}


/**
 * Server Action: Create a new prize.
 * @deprecated Use prize model actions instead
 */
export async function createPrizeAction({
  summary,
  description, 
  path
}: {

  summary: string ;
  description: string ;
  path:string;
}) {
  // Functionality moved to app/lib/models/prizes/actions.ts
  revalidatePath(path);
}

/**
 * Server Action: Update an existing prize.
 * @deprecated Use prize model actions instead
 */
export async function updatePrizeAction(
  id: string,
  update: { summary?: string; description?: string; },
  path: string
) {
  // Functionality moved to app/lib/models/prizes/actions.ts
  revalidatePath(path);
}

/**
 * Server Action: Delete a prize.
 * @deprecated Use prize model actions instead
 */
export async function deletePrizeAction({
  id,
  path,
}: {
  id: string;
  path: string;
}) {
  // Functionality moved to app/lib/models/prizes/actions.ts
  revalidatePath(path);
}
