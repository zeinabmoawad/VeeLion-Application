import { NextResponse } from "next/server";
import { errorResponse, handleRouteError } from "@/lib/apiResponse";
import { updateTaskInBackend } from "@/lib/backendApi";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteParams) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const completed = (payload as { completed?: unknown } | null)?.completed;

  if (typeof completed !== "boolean") {
    return errorResponse("completed must be boolean", 400);
  }

  try {
    const task = await updateTaskInBackend(params.id, completed);
    return NextResponse.json({ data: task }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Unable to update task.");
  }
}
