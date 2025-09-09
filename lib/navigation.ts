/**
 * Central navigation configuration
 * Single source of truth for all routes and navigation types
 */

export const ROUTES = {
  capture: "/capture",
  overview: "/overview",
  memories: "/memories",
  children: "/children",
  analytics: "/analytics",
  settings: "/settings",
  milestones: "/milestones",
  insights: "/insights",
  profile: "/profile",
  help: "/help",
  home: "/home",
} as const;

// Derive types from ROUTES constant
export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

// Store-managed views (subset of all routes)
export const STORE_VIEWS = [
  "capture",
  "overview",
  "memories",
  "children",
  "analytics",
  "settings",
] as const;

export type StoreView = (typeof STORE_VIEWS)[number];

// Type-safe route keys array
export const ROUTE_KEYS = Object.keys(ROUTES) as RouteKey[];

// Reverse lookup map for finding route keys by path
export const PATH_TO_ROUTE_KEY = Object.fromEntries(
  ROUTE_KEYS.map((k) => [ROUTES[k], k]),
) as Record<RoutePath, RouteKey>;

// Type guards
export const isRouteKey = (value: string): value is RouteKey => value in ROUTES;

export const isRoutePath = (path: string): path is RoutePath =>
  path in PATH_TO_ROUTE_KEY;

export const isStoreView = (value: string): value is StoreView =>
  (STORE_VIEWS as readonly string[]).includes(value);

// Helper functions
export const route = (key: RouteKey): RoutePath => ROUTES[key];

export const getRoutePath = (key: RouteKey): RoutePath => ROUTES[key];

export const findRouteKey = (path: string): RouteKey | undefined =>
  (PATH_TO_ROUTE_KEY as Partial<Record<string, RouteKey>>)[path];

// Development-time validation
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<RoutePath>();
  for (const k of ROUTE_KEYS) {
    const p = ROUTES[k];
    if (seen.has(p)) {
      throw new Error(`Duplicate route path detected: ${p} (key: ${k})`);
    }
    seen.add(p);
  }

  // Validate STORE_VIEWS are valid route keys
  for (const view of STORE_VIEWS) {
    if (!isRouteKey(view)) {
      throw new Error(`Store view "${view}" is not a valid route key`);
    }
  }
}
