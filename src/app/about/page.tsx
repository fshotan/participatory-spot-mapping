import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { getAboutContent } from "@/lib/content";
import AboutView from "@/components/AboutView";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const user = await getCurrentUser();
  const content = await getAboutContent();
  const isAdmin = user?.role === "admin";

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Link href={user ? "/map" : "/login"} className="back-link">
          ← 戻る
        </Link>
        <span className="page-title">このアプリについて</span>
      </div>
      <AboutView initialContent={content} isAdmin={isAdmin} />
    </div>
  );
}
