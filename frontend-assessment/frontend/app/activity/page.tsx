import Link from "next/link";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { firstParam } from "@/lib/url";

type ActivityPageProps = {
  searchParams: {
    q?: string | string[];
  };
};

export default function ActivityPage({ searchParams }: ActivityPageProps) {
  return (
    <main className="stack">
      <nav>
        <Link href="/" className="button">
          Back
        </Link>
      </nav>
      <ActivityFeed initialQuery={firstParam(searchParams.q) ?? ""} />
    </main>
  );
}
