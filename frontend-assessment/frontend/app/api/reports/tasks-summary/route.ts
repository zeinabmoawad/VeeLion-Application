import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/apiResponse";
import { getTasksSummaryFromBackend } from "@/lib/backendApi";

export async function GET() {
  try {
    const summary = await getTasksSummaryFromBackend();
    return NextResponse.json({ data: summary }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Unable to fetch the tasks summary.");
  }
}
