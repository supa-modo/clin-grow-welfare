import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import SlideOver from "@/components/ui/SlideOver";
import Select from "@/components/ui/Select";
import { money, tone } from "@/pages/admin/shared/adminFormatters";
import type { MeetingRecord, MeetingRoster } from "../../types";
import { finePreview, isCorrectionMode, resolveAttendanceStatus } from "../../utils";
import { FaSave } from "react-icons/fa";
import { TbEdit } from "react-icons/tb";

type AttendanceRow = {
  id: string;
  memberId: string;
  membershipNumber: string;
  name: string;
  apology: MeetingRoster["members"][0]["apology"];
  status: string;
  finePreview: number;
  isMarked: boolean;
  apologyLocked: boolean;
};

type Props = {
  meeting: MeetingRecord;
  roster: MeetingRoster | null;
  busy: string;
  attendanceDraft: Record<string, string>;
  setAttendanceDraft: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  savedAttendanceIds: Record<string, boolean>;
  showFinalize: boolean;
  onSaveRow: (memberId: string) => void;
  onSaveAll: () => void;
  onCloseFinalize: () => void;
  onFinalize: () => void;
  onReviewApology: (id: string, decision: "ACCEPTED" | "REJECTED") => void;
};

function attendanceRowClass(status: string) {
  if (["PRESENT_ON_TIME", "VIRTUAL_PRESENT", "EXCUSED"].includes(status))
    return "bg-ink-50";
  if (["PRESENT_LATE", "LATE", "LEFT_EARLY"].includes(status))
    return "bg-amber-50";
  if (status === "ABSENT_WITH_APOLOGY") return "bg-sky-50";
  if (status === "ABSENT_WITHOUT_APOLOGY") return "bg-red-50";
  return "";
}

export function AttendanceStep({
  meeting,
  roster,
  busy,
  attendanceDraft,
  setAttendanceDraft,
  savedAttendanceIds,
  showFinalize,
  onSaveRow,
  onSaveAll,
  onCloseFinalize,
  onFinalize,
  onReviewApology,
}: Props) {
  const [search, setSearch] = useState("");
  const [markFilter, setMarkFilter] = useState("all");
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});

  const finalized = Boolean(meeting.attendanceFinalizedAt);
  const needsStart = ["SCHEDULED", "NOTICE_SENT"].includes(meeting.status);
  const blocked = !!busy || meeting.status === "CLOSED" || (finalized && !isCorrectionMode(meeting));

  const rows = useMemo<AttendanceRow[]>(() => {
    return (roster?.members ?? []).map((row) => {
      const status = resolveAttendanceStatus(
        row,
        attendanceDraft[row.member.id],
      );
      const isMarked = Boolean(
        savedAttendanceIds[row.member.id] ?? row.attendance?.attendanceStatus,
      );
      const apologyLocked = row.apology?.status === "ACCEPTED";
      return {
        id: row.member.id,
        memberId: row.member.id,
        membershipNumber: row.member.membershipNumber,
        name: row.member.name,
        apology: row.apology,
        status,
        finePreview: finePreview(status, roster?.settings),
        isMarked,
        apologyLocked,
      };
    });
  }, [attendanceDraft, roster, savedAttendanceIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (markFilter === "marked" && !row.isMarked) return false;
        if (markFilter === "unmarked" && row.isMarked) return false;
        if (!q) return true;
        return [row.membershipNumber, row.name].some((v) =>
          v.toLowerCase().includes(q),
        );
      })
      .sort((a, b) => {
        if (a.isMarked !== b.isMarked) return a.isMarked ? 1 : -1;
        return a.membershipNumber.localeCompare(b.membershipNumber);
      });
  }, [markFilter, rows, search]);

  const finalizePreview = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        label: `${row.membershipNumber} - ${row.name}`,
      })),
    [rows],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
        <p className="text-sm font-bold text-ink-900">
          Confirm attendance and apologies
        </p>
        <p className="mt-1 text-sm text-ink-600">
          {needsStart
            ? "Start the meeting before recording attendance."
            : finalized
              ? "Attendance is finalized and locked for this meeting."
              : "Mark each member, then save all and finalize before generating fines."}
        </p>
        {!needsStart && !finalized ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary2"
              disabled={blocked}
              isLoading={busy === "attendance-bulk"}
              loadingText="Saving..."
              onClick={onSaveAll}
            >
              Save all & review finalize
            </Button>
          </div>
        ) : null}
        {finalized ? (
          <p className="mt-2 text-xs font-semibold text-brand-700">
            Finalized{" "}
            {new Date(meeting.attendanceFinalizedAt!).toLocaleString()}
          </p>
        ) : null}
      </div>

      <DataTable<AttendanceRow>
        columns={[
          {
            header: "Member",
            render: (row) => (
              <div>
                <p className="font-semibold text-ink-900">{row.name}</p>
                <p className="text-xs text-ink-500">{row.membershipNumber}</p>
              </div>
            ),
          },
          {
            header: "Apology",
            render: (row) =>
              row.apology ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="xs" tone={tone(row.apology.status)}>
                      {row.apology.status}
                    </Badge>
                    {row.apology.status === "SUBMITTED" && !finalized ? (
                      <>
                        <Button
                          size="xxs"
                          variant="secondary"
                          disabled={blocked}
                          onClick={() =>
                            onReviewApology(row.apology!.id, "ACCEPTED")
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="xxs"
                          variant="danger"
                          disabled={blocked}
                          onClick={() =>
                            onReviewApology(row.apology!.id, "REJECTED")
                          }
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                  <p className="max-w-xs text-xs text-ink-500">
                    {row.apology.reason}
                  </p>
                </div>
              ) : (
                <span className="text-ink-500">None</span>
              ),
          },
          {
            header: "Status",
            render: (row) => (
              <>
                <Select
                  value={row.status}
                  onChange={(e) =>
                    setAttendanceDraft((s) => ({
                      ...s,
                      [row.memberId]: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
                >
                  <option value="PRESENT_ON_TIME">Present on time</option>
                  <option value="PRESENT_LATE">Present late</option>
                  <option value="VIRTUAL_PRESENT">Virtual present</option>
                  <option value="ABSENT_WITH_APOLOGY">
                    Absent with apology
                  </option>
                  <option value="ABSENT_WITHOUT_APOLOGY">
                    Absent without apology
                  </option>
                  <option value="EXCUSED">Excused</option>
                </Select>
              </>
            ),
          },
          {
            header: "Fine preview",
            render: (row) => (
              <span className="font-semibold">{money(row.finePreview)}</span>
            ),
          },
        ]}
        rows={filtered}
        getRowKey={(row) => row.id}
        getRowClassName={(row) => attendanceRowClass(row.status)}
        showAutoNumber
        showCheckboxes
        isRowSelected={(row) => row.isMarked}
        isRowSelectable={() => !finalized}
        search
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search member name or number"
        actionsButtons={
          <Select
            value={markFilter}
            onChange={(e) => setMarkFilter(e.target.value)}
            className="min-w-32"
          >
            <option value="all">All rows</option>
            <option value="marked">Marked only</option>
            <option value="unmarked">Unmarked only</option>
          </Select>
        }
        actions={(row) => {
          if (finalized) return null;
          const editing = editingIds[row.memberId] || !row.isMarked;
          return (
            <Button
              size="sm"
              variant="secondary"
              disabled={blocked || needsStart}
              icon={editing ? <FaSave /> : <TbEdit />}
              isLoading={busy === `attendance-${row.memberId}`}
              loadingText="Saving..."
              onClick={() => {
                if (editing) {
                  void onSaveRow(row.memberId);
                  setEditingIds((s) => ({ ...s, [row.memberId]: false }));
                } else {
                  setEditingIds((s) => ({ ...s, [row.memberId]: true }));
                }
              }}
            >
              {editing ? "Save" : "Change"}
            </Button>
          );
        }}
        emptyTitle="No members"
        emptyMessage="Active members will appear here once the roster loads."
      />

      <SlideOver
        open={showFinalize}
        onClose={onCloseFinalize}
        title="Finalize attendance"
        subtitle="Confirm all members are marked before locking attendance."
        widthClass="max-w-3xl"
        footer={
          <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">
            <Button variant="secondary" onClick={onCloseFinalize}>
              Back
            </Button>
            <Button
              isLoading={busy === "attendance-finalize"}
              loadingText="Finalizing..."
              onClick={onFinalize}
            >
              Finalize attendance
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {/* autonumber the list of members */}
          {finalizePreview.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center justify-between border-b border-gray-300 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-gray-500">
                {index + 1}. {row.label}
              </span>
              <span className="text-gray-700">
                {row.status.replace(/_/g, " ")} · {money(row.finePreview)}
              </span>
            </div>
          ))}
          {finalizePreview.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between border-b border-gray-300 px-3 py-2 text-sm"
            >
              <span className="font-semibold">{row.label}</span>
              <span className="text-gray-600">
                {row.status.replace(/_/g, " ")} · {money(row.finePreview)}
              </span>
            </div>
          ))}
        </div>
      </SlideOver>
    </div>
  );
}
