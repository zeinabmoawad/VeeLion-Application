import Link from "next/link";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default function ActivityPage() {
  return (
    <main className="stack">
      <nav>
        <Link href="/" className="button">
          Back
        </Link>
      </nav>
      <ActivityFeed />
    </main>
  );
}
