import { TaskDashboard } from "@/components/tasks/TaskDashboard";
import { parseTaskFilter } from "@/lib/tasks";
import { firstParam } from "@/lib/url";

type TasksPageProps = {
  searchParams: {
    status?: string | string[];
  };
};

export default function TasksPage({ searchParams }: TasksPageProps) {
  return (
    <main className="page-container">
      <TaskDashboard initialFilter={parseTaskFilter(firstParam(searchParams.status))} />
    </main>
  );
}
