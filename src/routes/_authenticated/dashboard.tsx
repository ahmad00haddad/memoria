import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
