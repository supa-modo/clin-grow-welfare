import { describe, expect, it } from "vitest";
import { loanRepaymentBucket, meetingWeekRange } from "./loanDates";

describe("loanRepaymentBucket", () => {
  const meetingDate = "2026-06-17T10:00:00.000Z";

  it("returns due when repayment falls in the meeting week", () => {
    const { start } = meetingWeekRange(meetingDate);
    const disbursed = new Date(start);
    disbursed.setMonth(disbursed.getMonth() - 1);
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("due");
  });

  it("returns due when repayment is before the meeting week", () => {
    const { start } = meetingWeekRange(meetingDate);
    const disbursed = new Date(start);
    disbursed.setMonth(disbursed.getMonth() - 2);
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("due");
  });

  it("returns advance when repayment is after the meeting week", () => {
    const { end } = meetingWeekRange(meetingDate);
    const disbursed = new Date(end);
    disbursed.setMonth(disbursed.getMonth() - 1);
    expect(
      loanRepaymentBucket(
        { disbursedAt: disbursed.toISOString(), status: "ACTIVE" },
        meetingDate,
      ),
    ).toBe("advance");
  });

  it("returns due for overdue status regardless of due date", () => {
    const { end } = meetingWeekRange(meetingDate);
    const futureDue = new Date(end);
    futureDue.setMonth(futureDue.getMonth() + 2);
    expect(
      loanRepaymentBucket(
        { nextInterestDate: futureDue.toISOString(), status: "OVERDUE" },
        meetingDate,
      ),
    ).toBe("due");
  });
});
