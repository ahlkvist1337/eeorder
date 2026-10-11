import { describe, it, expect } from "vitest";
import { isValidPlannedDate } from "@/lib/utils";

describe("isValidPlannedDate", () => {
  it("accepts empty values", () => {
    expect(isValidPlannedDate(undefined)).toBe(true);
    expect(isValidPlannedDate(null)).toBe(true);
    expect(isValidPlannedDate("")).toBe(true);
  });

  it("accepts normal four-digit years", () => {
    expect(isValidPlannedDate("2026-10-08")).toBe(true);
    expect(isValidPlannedDate("2026-10-23T00:00:00.000Z")).toBe(true);
    expect(isValidPlannedDate("2000-01-01")).toBe(true);
    expect(isValidPlannedDate("2099-12-31")).toBe(true);
  });

  it("rejects years with more than four digits", () => {
    expect(isValidPlannedDate("202610-01-01")).toBe(false);
    expect(isValidPlannedDate("+202610-01-01")).toBe(false);
  });

  it("rejects unparseable dates", () => {
    expect(isValidPlannedDate("not-a-date")).toBe(false);
    expect(isValidPlannedDate("2026-13-99")).toBe(false);
  });

  it("rejects years outside the allowed range", () => {
    expect(isValidPlannedDate("1999-12-31")).toBe(false);
    expect(isValidPlannedDate("2100-01-01")).toBe(false);
  });
});
