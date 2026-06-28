import { describe, it, expect } from "vitest";
import { needsSsl } from "../../server/config";

describe("needsSsl", () => {
  it("returns false for local hosts (no TLS needed)", () => {
    expect(needsSsl("postgres://postgres:postgres@localhost:5432/db")).toBe(false);
    expect(needsSsl("postgres://u:p@127.0.0.1:5432/db")).toBe(false);
  });

  it("returns true for managed hosts (TLS required)", () => {
    expect(needsSsl("postgres://u:p@ep-x.region.aws.neon.tech/db?sslmode=require")).toBe(true);
    expect(needsSsl("postgres://u:p@db.supabase.co:5432/postgres")).toBe(true);
  });
});
