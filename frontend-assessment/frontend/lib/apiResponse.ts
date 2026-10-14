import { NextResponse } from "next/server";
import { ApiError } from "@/lib/http";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// Forwards the backend status (404, 400, 502...) instead of collapsing everything into 500.
export function handleRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.status);
  }

  return errorResponse(fallbackMessage, 500);
}
