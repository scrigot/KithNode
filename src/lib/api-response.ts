import { NextResponse } from "next/server";

export function routeError(
  message: string,
  status = 500,
  code = "request_failed",
  recoveryAction = "Retry the request. If it still fails, open Feedback from Home.",
) {
  return NextResponse.json(
    {
      error: message,
      code,
      recoveryAction,
    },
    { status },
  );
}

