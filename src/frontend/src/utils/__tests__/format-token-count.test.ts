import { formatTokenCount } from "../format-token-count";

describe("formatTokenCount", () => {
  it("should return raw number for counts under 1000", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(1)).toBe("1");
    expect(formatTokenCount(500)).toBe("500");
    expect(formatTokenCount(999)).toBe("999");
  });

  it("should format thousands with K suffix", () => {
    expect(formatTokenCount(1000)).toBe("1K");
    expect(formatTokenCount(1500)).toBe("1.5K");
    expect(formatTokenCount(2300)).toBe("2.3K");
    expect(formatTokenCount(10000)).toBe("10K");
    expect(formatTokenCount(999999)).toBe("1000K");
  });

  it("should format millions with M suffix", () => {
    expect(formatTokenCount(1000000)).toBe("1M");
    expect(formatTokenCount(1500000)).toBe("1.5M");
    expect(formatTokenCount(2300000)).toBe("2.3M");
    expect(formatTokenCount(10000000)).toBe("10M");
  });

  it("should strip trailing .0 for round numbers", () => {
    expect(formatTokenCount(1000)).toBe("1K");
    expect(formatTokenCount(2000)).toBe("2K");
    expect(formatTokenCount(1000000)).toBe("1M");
    expect(formatTokenCount(2000000)).toBe("2M");
  });
});
