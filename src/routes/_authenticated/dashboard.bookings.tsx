import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/bookings")({ component: BookingsLayout });

function BookingsLayout() {
  return <Outlet />;
}