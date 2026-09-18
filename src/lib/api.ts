import { NextResponse } from "next/server";
import type { ZodSafeParseResult } from "zod";

/** Consistent API envelope: { ok: true, data } | { ok: false, error } */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

export function zodFail(result: ZodSafeParseResult<unknown>) {
  const issue = result.error?.issues?.[0];
  return fail(
    400,
    "VALIDATION",
    issue ? `${issue.path.join(".") ? issue.path.join(".") + ": " : ""}${issue.message}` : "Invalid request body",
  );
}

export function getClientInfo(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  return { ip, userAgent };
}
