import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/apiResponse";
import { getTasksFromBackend } from "@/lib/backendApi";

export async function GET() {
  try {
    const tasks = await getTasksFromBackend();
    return NextResponse.json({ data: tasks }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Unable to fetch tasks.");
  }
}
