import { describe, it, expect } from "vitest";
// NOT_FOUND_FILE is deliberately not asserted against ROUTES here: the `as const` route table makes
// the file union literal, so tsc already proves no route serves 404.html.
import { ROUTES, routeIdFromPath, pathForRoute, fileForPath } from "../../web/routes";

describe("route table", () => {
  it("round-trips every route id through its path", () => {
    for (const route of ROUTES) {
      expect(routeIdFromPath(pathForRoute(route.id))).toBe(route.id);
    }
  });

  it("tolerates a trailing slash", () => {
    expect(routeIdFromPath("/why/")).toBe("why");
    expect(routeIdFromPath("/")).toBe("home");
    expect(routeIdFromPath("//")).toBe("home");
  });

  it("returns null for anything that is not a route", () => {
    // The click interceptor relies on this: a null here means "let the browser navigate".
    expect(routeIdFromPath("/nope")).toBeNull();
    expect(routeIdFromPath("/api/stats")).toBeNull();
    expect(routeIdFromPath("/og.png")).toBeNull();
    expect(routeIdFromPath("/receiver")).toBeNull();
    expect(routeIdFromPath("/why.html")).toBeNull();
  });

  it("maps paths to their prerendered files", () => {
    expect(fileForPath("/")).toBe("index.html");
    expect(fileForPath("/why")).toBe("why.html");
    expect(fileForPath("/safe-adoption")).toBe("safe-adoption.html");
    expect(fileForPath("/nope")).toBeNull();
  });

  it("throws for an unknown route id", () => {
    // @ts-expect-error — exercising the runtime guard behind the compile-time RouteId union.
    expect(() => pathForRoute("nope")).toThrow();
  });

  it("keeps ids, paths and files unique", () => {
    const unique = <T>(xs: readonly T[]) => new Set(xs).size === xs.length;
    expect(unique(ROUTES.map((r) => r.id))).toBe(true);
    expect(unique(ROUTES.map((r) => r.path))).toBe(true);
    expect(unique(ROUTES.map((r) => r.file))).toBe(true);
  });
});
