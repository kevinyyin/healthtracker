"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { todayLocalDateString } from "@/lib/date";

export interface SaveProfileInput {
  dateOfBirth: string;
  biologicalSex: "male" | "female";
}

const MAX_AGE_YEARS = 120;

/** Upserts the signed-in user's profile (date of birth, biological sex) via the session-scoped client. */
export async function saveProfile(input: SaveProfileInput) {
  const { supabase, user } = await requireUser();

  const today = todayLocalDateString();
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

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      date_of_birth: input.dateOfBirth,
      biological_sex: input.biologicalSex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;

  revalidatePath("/settings");
  revalidatePath("/biological-age");
}
