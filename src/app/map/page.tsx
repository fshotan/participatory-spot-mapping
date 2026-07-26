import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import MapView from "@/components/MapView";

export default async function MapPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <MapView userEmail={user.email} />;
}
