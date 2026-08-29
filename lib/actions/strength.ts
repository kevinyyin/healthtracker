"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export interface LogSetInput {
  sessionId: string;
  date: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: number | null;
}

/** Logs one set immediately, via the session-scoped (RLS-respecting) client — not admin. */
export async function logStrengthSet(input: LogSetInput) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("strength_workouts").insert({
    user_id: user.id,
    session_id: input.sessionId,
    date: input.date,
    exercise_name: input.exerciseName,
    set_number: input.setNumber,
    reps: input.reps,
    weight_kg: input.weightKg,
    rpe: input.rpe ?? null,
  });

  if (error) throw error;

  revalidatePath("/strength");
}

export async function deleteStrengthSet(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("strength_workouts").delete().eq("id", id).eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/strength");
}
