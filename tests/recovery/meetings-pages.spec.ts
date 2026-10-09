import { test, expect } from "@playwright/test";

async function setup(page: any, readOnly = false, admin = false) {
  const user = {
    id: "admin",
    name: "Secretary",
    roles: [admin ? "SystemAdmin" : "Secretary"],
    permissions: readOnly
      ? ["officialsPortal.meetings.view"]
      : [
          "officialsPortal.meetings.view",
          "officialsPortal.meetings.create",
          "officialsPortal.meetings.recordAttendance",
          "officialsPortal.meetings.publish",
        ],
  };
  const meetings = Array.from({ length: 65 }, (_, i) => ({
    id: `m${i + 1}`,
    meetingNumber: `MTG-${String(i + 1).padStart(3, "0")}`,
    meetingType: "ORDINARY",
    meetingDate: "2026-11-05T12:00:00Z",
    venue: "CREATES Meeting Room",
    agenda: "Weekly collections and loan review",
    scheduledBy: "Secretary",
    status: i === 1 ? "COLLECTIONS_OPEN" : "NOTICE_SENT",
    ceremonyStep: i === 1 ? "repayments" : null,
    attendanceFinalizedAt: i === 1 ? "2026-11-05" : null,
    collectionsFinalizedAt: i === 1 ? "2026-11-05" : null,
    collectionItems: [],
    collectionSessions: [],
    loanWindows: [],
    resolutions: [],
  }));
  const queries: URLSearchParams[] = [],
    writes: Array<{ path: string; body: any }> = [];
  await page.addInitScript((user: any) => {
    localStorage.setItem("clingrow_token", "isolated");
    localStorage.setItem("clingrow_user", JSON.stringify(user));
  }, user);
  await page.route("**/api/**", async (route: any) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace(/^\/api/, "");
    let body: any = { data: [], unreadCount: 0 };
    if (request.method() !== "GET")
      writes.push({
        path,
        body: request.postData() ? request.postDataJSON() : null,
      });
    if (path === "/auth/me") body = { user };
    else if (path === "/meetings") {
      queries.push(url.searchParams);
      const size = Number(url.searchParams.get("pageSize")),
        current = Number(url.searchParams.get("page"));
      const filtered = meetings.filter(
        (m) =>
          (!url.searchParams.get("status") ||
            m.status === url.searchParams.get("status")) &&
          (!url.searchParams.get("search") ||
            m.meetingNumber.includes(url.searchParams.get("search")!)),
      );
      body = {
        data: filtered.slice((current - 1) * size, current * size),
        meta: {
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / size)),
        },
      };
    } else {
      const m = meetings.find((m) => m.id === path.split("/")[2]);
      if (path === "/meetings/missing") {
        await route.fulfill({
          status: 404,
          json: { error: "Meeting not found" },
        });
        return;
      }
      if (path.endsWith("/roster"))
        body = {
          meeting: m,
          members: [],
          settings: {},
          collectionsPaused: true,
          lendingClosed: true,
        };
      else if (path.endsWith("/pool"))
        body = {
          pool: {
            totalLoanablePool: 0,
            remainingAmount: 0,
            reservedAmount: 0,
            lendingClosed: true,
          },
        };
      else if (path.endsWith("/rollover-candidates")) body = { candidates: [] };
      else if (path.endsWith("/collections/readiness"))
        body = { readiness: { ready: true, rows: [] } };
      else if (path.endsWith("/unclaimed-carryover")) body = { amount: 0 };
      else if (m && path.endsWith("/cancel")) {
        m.status = "CANCELLED";
        body = { meeting: m };
      } else if (m && request.method() === "DELETE") {
        meetings.splice(meetings.indexOf(m), 1);
        body = { id: m.id };
      } else if (m) body = { meeting: m };
    }
    await route.fulfill({ json: body });
  });
  return { queries, writes };
}

test("meeting table paginates on backend and retains list position after opening an older meeting", async ({
  page,
}) => {
  const { queries, writes } = await setup(page);
  await page.goto("/officials/meetings");
  await expect(page.getByText("Showing 1 to 50 of 65")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(50);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 51 to 65 of 65")).toBeVisible();
  expect(queries.at(-1)?.get("page")).toBe("2");
  await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('51.');
  await page.getByRole("button", { name: "Actions for MTG-051" }).click();
  await page.getByText("Start meeting", { exact: true }).click();
  await expect(page).toHaveURL(/\/officials\/meetings\/m51$/);
  await expect(page.getByRole("heading", { name: "MTG-051" })).toBeVisible();
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Actions for MTG-051" }).click();
  await page.getByText("Meeting Details", { exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Secretary", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("link", { name: "All meetings" }).click();
  await expect(page.getByText("Showing 51 to 65 of 65")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Rows per page" })
    .selectOption("10");
  await expect(page.getByText("Showing 1 to 10 of 65")).toBeVisible();
  await page.screenshot({
    path: "../outputs/meetings-list-20261009.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("aside")).toHaveCSS("position", "fixed");
  await expect.poll(() => page.locator("main").evaluate(el => el.getBoundingClientRect().left)).toBeLessThan(20);
  await page.screenshot({
    path: "../outputs/meetings-mobile-20261009.png",
    fullPage: true,
  });
  await page.getByRole("textbox", { name: "Search meetings" }).fill("MTG-065");
  await expect(page.getByText("Showing 1 to 1 of 1")).toBeVisible();
  expect(queries.at(-1)?.get("search")).toBe("MTG-065");
});

test("unstarted actions require confirmation and cancelled details have no operational controls", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.goto("/officials/meetings");
  await page.getByRole("button", { name: "Actions for MTG-001" }).click();
  await page.getByText("Cancel meeting", { exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("button", { name: "Cancel meeting" }),
  ).toBeDisabled();
  await modal.getByRole("textbox").fill("Meeting will not take place");
  await modal.getByRole("button", { name: "Cancel meeting" }).click();
  await expect
    .poll(() => writes.at(-1))
    .toEqual({
      path: "/meetings/m1/cancel",
      body: { reason: "Meeting will not take place" },
    });
  await expect(
    page.locator("tbody tr").first().getByText("Cancelled", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Actions for MTG-001" }).click();
  await expect(
    page.getByText("Reschedule meeting", { exact: true }),
  ).toHaveCount(0);
  await page.getByText("View details", { exact: true }).click();
  await expect(
    page.getByText("This meeting was cancelled. Its record has been retained."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start meeting", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("direct meeting links do not load a list or substitute a missing meeting", async ({
  page,
}) => {
  const { queries } = await setup(page, false, true);
  await page.goto("/dashboard/meetings/m61");
  await expect(page.getByRole("heading", { name: "MTG-061" })).toBeVisible();
  expect(queries).toHaveLength(0);
  await page.screenshot({
    path: "../outputs/meeting-control-room-20261009.png",
    fullPage: true,
  });
  await page.goto("/dashboard/meetings/missing");
  await expect(
    page.getByText("Meeting not found", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start meeting", exact: true }),
  ).toHaveCount(0);
  expect(queries).toHaveLength(0);
});

test("read-only officials only receive view action and status filter is sent to backend", async ({
  page,
}) => {
  const { queries } = await setup(page, true);
  await page.goto("/officials/meetings");
  await expect(
    page.getByRole("button", { name: "Schedule meeting", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Meeting status" })
    .selectOption("COLLECTIONS_OPEN");
  await expect(page.getByText("Showing 1 to 1 of 1")).toBeVisible();
  expect(queries.at(-1)?.get("status")).toBe("COLLECTIONS_OPEN");
  await page.getByRole("button", { name: "Actions for MTG-002" }).click();
  await expect(page.getByText("View details", { exact: true })).toBeVisible();
  await expect(page.getByText("Delete meeting", { exact: true })).toHaveCount(
    0,
  );
});


test('meeting rows open details with click or keyboard without hijacking row menus', async ({ page }) => {
  await setup(page);
  await page.goto('/officials/meetings');
  await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('1.');
  await page.locator('tbody tr').first().getByText('CREATES Meeting Room', { exact: true }).click();
  await expect(page).toHaveURL(/meetings\/m1$/);
  await page.getByRole('link', { name: 'All meetings' }).click();
  await page.locator('tbody tr').nth(2).focus();
  await page.locator('tbody tr').nth(2).press('Enter');
  await expect(page).toHaveURL(/meetings\/m3$/);
});

test('schedule modal submits online access and rich formatted agenda', async ({ page }) => {
  const { writes } = await setup(page);
  await page.goto('/officials/meetings');
  await page.getByRole('button', { name: 'Schedule New meeting', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Date and time (Nairobi)').fill('2026-11-05T17:45');
  await modal.getByRole('textbox', { name: 'Virtual meeting link (optional)' }).fill('https://meet.example.test/welfare');
  const agenda = modal.getByRole('textbox', { name: 'Agenda', exact: true });
  await agenda.fill('Review repayments and contributions');
  await agenda.press('ControlOrMeta+a');
  await modal.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(agenda.locator('strong')).toHaveText('Review repayments and contributions');
  await page.screenshot({ path: '../outputs/meeting-schedule-20261009.png', fullPage: true });
  await modal.getByRole('button', { name: 'Schedule and notify', exact: true }).click();
  await expect.poll(() => writes.find(w => w.path === '/meetings')?.body).toMatchObject({ virtualLink: 'https://meet.example.test/welfare', meetingDate: '2026-11-05T14:45:00.000Z', agenda: '<p><strong>Review repayments and contributions</strong></p>' });
  await expect(modal).toHaveCount(0);
});
