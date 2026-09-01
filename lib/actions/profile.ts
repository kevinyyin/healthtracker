"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { todayLocalDateString } from "@/lib/date";
import type { UnitSystem } from "@/lib/units";

export interface SaveProfileInput {
  dateOfBirth: string;
  biologicalSex: "male" | "female";
  timezone: string;
  unitSystem: UnitSystem;
}

const MAX_AGE_YEARS = 120;

function isValidTimezone(timezone: string): boolean {
  try {
    // Intl throws a RangeError on an unrecognized IANA zone name.
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Upserts the signed-in user's profile (date of birth, biological sex, timezone) via the session-scoped client. */
export async function saveProfile(input: SaveProfileInput) {
  const { supabase, user } = await requireUser();

  if (!isValidTimezone(input.timezone)) {
    throw new Error("Invalid timezone.");
  }

  // Validate against the timezone being saved in this same submission, not a
  // possibly-stale one already on the user's row.
  const today = todayLocalDateString(input.timezone);
  if (input.dateOfBirth > today) {
    throw new Error("Date of birth can't be in the future.");
  }
  const earliestAllowed = `${new Date().getUTCFullYear() - MAX_AGE_YEARS}-01-01`;
  if (input.dateOfBirth < earliestAllowed) {
    throw new Error("Date of birth is too far in the past.");
  }
  if (input.biologicalSex !== "male" && input.biologicalSex !== "female") {
    throw new Error("Invalid biological sex.");
  }
  if (input.unitSystem !== "metric" && input.unitSystem !== "imperial") {
    throw new Error("Invalid unit system.");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      date_of_birth: input.dateOfBirth,
      biological_sex: input.biologicalSex,
      timezone: input.timezone,
      unit_system: input.unitSystem,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/biological-age");
  revalidatePath("/today");
  revalidatePath("/sleep");
  revalidatePath("/trends");
  revalidatePath("/activity");
}
