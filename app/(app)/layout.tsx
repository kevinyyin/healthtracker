import { requireUser } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { BottomTabBar } from "@/components/bottom-tab-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <BottomTabBar />
    </div>
  );
}
