import { describe, expect, it } from "vitest";
import { estimateDeliveryDate, formatDeliveryDate } from "@/lib/delivery";

describe("delivery estimates", () => {
  it("estimates seven weekdays after the payment date", () => {
    expect(estimateDeliveryDate(new Date("2026-10-26T06:00:00.000Z"))).toBe("2026-11-04");
  });

  it("skips weekends when calculating the expected date", () => {
    expect(estimateDeliveryDate(new Date("2026-10-30T06:00:00.000Z"))).toBe("2026-11-10");
  });

  it("formats the date for display in India", () => {
    expect(formatDeliveryDate("2026-11-04")).toBe("4 November 2026");
    expect(formatDeliveryDate(null)).toBeNull();
  });
});
