import { redirect } from "next/navigation";

// Orders now open a chat page right after checkout; old links go to order tracking.
export default function OrderSuccessPage() {
  redirect("/track");
}
