import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <>
      <div className="pb-20 md:pb-0">
        <Outlet />
      </div>
      <MobileBottomNav />
    </>
  );
}
