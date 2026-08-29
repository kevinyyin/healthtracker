import { requireUser } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import type { ActivityStatus } from "@/lib/activity-status";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();

  const { data: openStatus } = await supabase
    .from("activity_status_periods")
    .select("status")
    .eq("user_id", user.id)
    .is("ended_on", null)
    .maybeSingle();

  const currentStatus: ActivityStatus = (openStatus?.status as ActivityStatus | undefined) ?? "active";

  return (
    <div className="flex min-h-screen flex-col">
      <Nav currentStatus={currentStatus} />
      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <BottomTabBar />
    </div>
  );
}
