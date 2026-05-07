export const DEMO_USER = {
  id: "demo-user-id",
  email: "admin@dsd.ch",
  full_name: "Demo Admin",
  role: "admin" as const,
};

export const DEMO_COOKIE_NAME = "demo_auth";

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
