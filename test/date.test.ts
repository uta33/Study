import { describe, expect, it } from "vitest";
import { addDays, daysUntil, hm, isValidDate, md, mondayOf, ymd } from "../src/lib/date";

describe("日付", () => {
  it("月曜始まりの週を求める", () => {
    expect(ymd(mondayOf(new Date(2026, 8, 29)))).toBe("2026-09-28"); // 火曜
    expect(ymd(mondayOf(new Date(2026, 9, 4)))).toBe("2026-09-28"); // 日曜は前の月曜
    expect(ymd(mondayOf(new Date(2026, 8, 28)))).toBe("2026-09-28"); // 月曜はその日
  });
  it("残り日数を数える", () => {
    const now = new Date(2026, 8, 29, 23, 59);
    expect(daysUntil("2026-10-26", now)).toBe(27);
    expect(daysUntil("2026-09-29", now)).toBe(0);
    expect(daysUntil("2026-09-28", now)).toBe(-1);
  });
  it("月末・年末をまたいで日を足す", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });
  it("表示用の書式", () => {
    expect(hm(605)).toBe("10:05");
    expect(md("2026-10-06")).toBe("10/6");
  });
  it("日付の妥当性", () => {
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("")).toBe(false);
  });
});
