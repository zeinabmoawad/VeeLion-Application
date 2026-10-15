import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { firstParam } from "@/lib/url";

type ActivityPageProps = {
  searchParams: {
    q?: string | string[];
  };
};

export default function ActivityPage({ searchParams }: ActivityPageProps) {
  return (
    <main className="page-container">
      <ActivityFeed initialQuery={firstParam(searchParams.q) ?? ""} />
    </main>
  );
}
