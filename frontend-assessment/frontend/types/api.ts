export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLog = {
  id: string;
  action?: string;
  info?: string;
  when: string;
};

// Every /api/* route responds with the same { data } envelope, even where the backend doesn't.
export type DataResponse<T> = {
  data: T;
};

export type TasksResponse = DataResponse<Task[]>;

export type TaskResponse = DataResponse<Task>;

export type ActivityResponse = DataResponse<ActivityLog[]>;

export type TaskStatus = "todo" | "in-progress" | "done";

export type TasksSummary = {
  total: number;
  byStatus: Record<TaskStatus, number>;
  recentActivityCount: number;
};

export type TasksSummaryResponse = DataResponse<TasksSummary>;

export type ErrorResponse = {
  error?: {
    message?: string;
  };
};

export type TaskFilter = "all" | "completed" | "pending";
