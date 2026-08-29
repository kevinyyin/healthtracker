import { requireUser } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
