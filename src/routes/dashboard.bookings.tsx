import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/bookings")({ component: BookingsLayout });

function BookingsLayout() {
  return <Outlet />;
}