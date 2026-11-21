import { describe, expect, it } from "vitest";
import { filterCities, sameCity, servesCity } from "@/lib/cities";

describe("package cities", () => {
  it("matches city names ignoring shadda and hamza", () => {
    expect(sameCity("عمّان", "عمان")).toBe(true);
    expect(sameCity("إربد", "اربد")).toBe(true);
    expect(sameCity("إربد", "عمان")).toBe(false);
  });

  it("a package without cities serves every city", () => {
    expect(servesCity({ cities: null }, "إربد")).toBe(true);
    expect(servesCity({ cities: [] }, "عمّان")).toBe(true);
    expect(servesCity({ cities: ["عمّان"] }, "إربد")).toBe(false);
    expect(servesCity({ cities: ["عمّان", "إربد"] }, "اربد")).toBe(true);
  });

  it("filter tabs come only from linked packages, add-ons ignored", () => {
    expect(filterCities([{ cities: null }, { cities: [] }])).toEqual([]);
    expect(filterCities([{ cities: ["عمّان"] }, { cities: ["عمان", "إربد"] }, { cities: null }, { cities: ["جرش"], package: "addon" }]))
      .toEqual(["عمّان", "إربد"]);
  });
});
