import { redirect } from "next/navigation";

// Route renamed to /dashboard/support. Redirect any stale bookmark.
export default function SubscriptionRedirect() {
  redirect("/dashboard/support");
}
