"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export interface SaveJournalEntryInput {
  date: string;
  habits: string[];
  notes?: string | null;
}

/** Upserts today's (or yesterday's) journal entry via the session-scoped client. */
export async function saveJournalEntry(input: SaveJournalEntryInput) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("journal_entries").upsert(
    {
      user_id: user.id,
      date: input.date,
      habits: input.habits,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );

  if (error) throw error;

  revalidatePath("/today");
}
