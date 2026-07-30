import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOAN_PERIOD_DAYS,
  loanRepaymentBucket,
  meetingRepaymentWindow,
} from "./loanDates";

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

  it("returns advance when repayment is more than two days after the meeting", () => {
    const disbursed = new Date("2026-06-10T10:00:00.000Z");
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("advance");
  });

  it("includes a repayment due within two days of a postponed meeting", () => {
    expect(
      loanRepaymentBucket(
        { nextInterestDate: "2026-06-19T10:00:00.000Z", status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("due");
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

  it("uses the meeting date as the repayment-window start", () => {
    const { start, end } = meetingRepaymentWindow("2026-06-19T15:00:00.000Z");
    expect(start.toISOString()).toBe("2026-06-18T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-21T20:59:59.999Z");
  });
});
