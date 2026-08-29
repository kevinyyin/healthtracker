"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { isWidgetKey } from "@/lib/dashboard-widgets";

/** Upserts the signed-in user's Today-page widget selection/order via the session-scoped client. */
export async function saveDashboardWidgets(widgetKeys: string[]) {
  const { supabase, user } = await requireUser();

  const cleaned = widgetKeys.filter(isWidgetKey);

  const { error } = await supabase.from("dashboard_widgets").upsert(
    {
      user_id: user.id,
      widget_keys: cleaned,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;

  revalidatePath("/today");
}
