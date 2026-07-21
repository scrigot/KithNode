import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { AssistantDatabaseError } from "@/lib/assistant/repository";

export class AssistantHttpError extends Error {
  constructor(public status: number, public code: string, message: string, public retryable = true) {
    super(message);
  }
}

export function assistantErrorResponse(error: unknown) {
  if (error instanceof AssistantHttpError) {
    return NextResponse.json({ error: error.message, code: error.code, retryable: error.retryable }, { status: error.status });
  }
  if (error instanceof AssistantDatabaseError || error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
    console.error("Assistant database failure", { name: error.name, code: "code" in error ? error.code : undefined });
    return NextResponse.json({
      error: "Career Copilot cannot reach its data store. Check the database connection and migration readiness, then retry.",
      code: "database_unavailable",
      retryable: true,
    }, { status: 503 });
  }
  console.error("Assistant request failure", error);
  return NextResponse.json({
    error: "Career Copilot could not save this request. Your approval boundary was preserved and no external action ran.",
    code: "persistence_failed",
    retryable: true,
  }, { status: 500 });
}
