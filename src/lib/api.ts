import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return fail(message, 401);
}

export function forbidden(message = "Forbidden") {
  return fail(message, 403);
}

export function serverError(error: unknown) {
  console.error("[api]", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return fail(message, 500);
}
