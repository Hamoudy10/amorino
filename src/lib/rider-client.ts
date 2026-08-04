"use client";

export async function getUserRole(): Promise<"loading" | "unauthenticated" | "unauthorized" | "ok"> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok || !json.data) return "unauthenticated";
    if (json.data.role !== "rider" && json.data.role !== "owner" && json.data.role !== "admin") {
      return "unauthorized";
    }
    return "ok";
  } catch {
    return "unauthenticated";
  }
}