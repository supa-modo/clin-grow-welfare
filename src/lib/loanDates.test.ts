import { describe, expect, it } from "vitest";
import { DEFAULT_LOAN_PERIOD_DAYS, loanRepaymentBucket, meetingWeekRange } from "./loanDates";

describe("loanRepaymentBucket", () => {
  const meetingDate = "2026-06-17T10:00:00.000Z";

  it("returns due when repayment falls on the meeting date (28-day period)", () => {
    const disbursed = new Date("2026-05-20T10:00:00.000Z");
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("due");
  });

  it("returns due when repayment is before the meeting week", () => {
    const disbursed = new Date("2026-04-01T10:00:00.000Z");
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("due");
  });

  it("returns advance when repayment is after the meeting week", () => {
    const disbursed = new Date("2026-06-10T10:00:00.000Z");
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("advance");
  });

  it("returns due for overdue status regardless of due date", () => {
    const futureDue = new Date(meetingDate);
    futureDue.setDate(futureDue.getDate() + DEFAULT_LOAN_PERIOD_DAYS * 3);
    expect(
      loanRepaymentBucket(
        { nextInterestDate: futureDue.toISOString(), status: "OVERDUE" },
        meetingDate,
      ),
    ).toBe("due");
  });

  it("uses meeting date as week start", () => {
    const { start } = meetingWeekRange("2026-06-19T15:00:00.000Z");
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCDate()).toBe(19);
  });
});
