import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { memberPortalApi } from "@/services/memberApi";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { MemberHero, MemberSection } from "@/components/member/MemberCards";
import { DependantsPanel } from "@/components/members/DependantsPanel";
import { useUiStore } from "@/store/uiStore";
import type { Member } from "@/types/member";

type ProfileTab = "personal" | "family";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-slate-800">
        {value || "—"}
      </div>
    </div>
  );
}

function parseProfileTab(value: string | null): ProfileTab {
  return value === "family" ? "family" : "personal";
}

export function MemberProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tab = parseProfileTab(searchParams.get("tab"));
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ email: "", phone: "" });
  const [savingContact, setSavingContact] = useState(false);

  const load = () => {
    setLoading(true);
    memberPortalApi
      .profile()
      .then((m) => {
        setMember(m);
        setContactForm({ email: m.email ?? "", phone: m.phone ?? "" });
      })
      .catch(() => setError("We could not load your profile details."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const updated = await memberPortalApi.updateContact({
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
      });
      setMember(updated);
      setEditingContact(false);
      toastSuccess("Contact updated", "Your contact details were saved.");
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "response" in e &&
        e.response &&
        typeof e.response === "object" &&
        "data" in e.response &&
        e.response.data &&
        typeof e.response.data === "object" &&
        "error" in e.response.data
          ? String(e.response.data.error)
          : "Could not update contact details.";
      toastError("Update failed", msg);
    } finally {
      setSavingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Spinner /> Loading profile…
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <EmptyState
        title="Profile unavailable"
        message={error || "Your account is not linked to a member profile."}
      />
    );
  }

  const tabs = [
    { value: "personal" as const, label: "Personal" },
    { value: "family" as const, label: "Family" },
  ];

  return (
    <div className="space-y-6">
      <MemberHero
        firstName={member.firstName ?? member.name.split(" ")[0]}
        membershipNumber={member.membershipNumber}
        status={member.status}
        registrationFeePaid={member.registrationFeePaid}
        subtitle={member.name}
      />

      <SegmentedTabs
        tabs={tabs}
        value={tab}
        onChange={(id) => {
          const next = id as ProfileTab;
          setSearchParams(next === "personal" ? {} : { tab: next }, {
            replace: true,
          });
        }}
      />

      {tab === "personal" ? (
        <div className="space-y-4">
          <MemberSection
            title="Personal & membership"
            description="Your identity and standing on the welfare register"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Full name" value={member.name} />
              <Field label="ID / Passport" value={member.idNumber} />
              <Field label="Member number" value={member.membershipNumber} />
              <Field
                label="Join date"
                value={new Date(member.dateJoined).toLocaleDateString()}
              />
              <Field
                label="Approval"
                value={
                  <Badge tone={member.approvedAt ? "success" : "warning"}>
                    {member.approvedAt ? "Approved" : "Pending"}
                  </Badge>
                }
              />
              <Field
                label="Registration fee"
                value={
                  <Badge
                    tone={member.registrationFeePaid ? "success" : "warning"}
                  >
                    {member.registrationFeePaid ? "Paid" : "Pending"}
                  </Badge>
                }
              />
              {member.approvedAt ? (
                <Field
                  label="Approved date"
                  value={new Date(member.approvedAt).toLocaleDateString()}
                />
              ) : null}
              {member.nonComplianceReasons ? (
                <Field label="Notes" value={member.nonComplianceReasons} />
              ) : null}
            </div>
          </MemberSection>

          <MemberSection
            title="Contact details"
            description="How we reach you for welfare notices and approvals"
            action={
              !editingContact ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingContact(true)}
                >
                  Edit contact
                </Button>
              ) : null
            }
          >
            {editingContact ? (
              <div className="mx-auto max-w-lg space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Phone"
                    value={contactForm.phone}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={saveContact}
                    isLoading={savingContact}
                    loadingText="Saving…"
                  >
                    Save changes
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingContact(false);
                      setContactForm({
                        email: member.email ?? "",
                        phone: member.phone ?? "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone" value={member.phone} />
                <Field label="Email" value={member.email} />
              </div>
            )}
          </MemberSection>
        </div>
      ) : null}

      {tab === "family" ? (
        <div className="space-y-4">
          <MemberSection
            title="Primary beneficiary"
            description="Read-only in the member portal. Contact officials to request changes."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name" value={member.beneficiaryName} />
              <Field
                label="Relationship"
                value={member.beneficiaryRelationship}
              />
              <Field label="Phone" value={member.beneficiaryPhone} />
              <Field label="Allocation" value="100% primary allocation" />
            </div>
          </MemberSection>

          <DependantsPanel scope="member" />
        </div>
      ) : null}
    </div>
  );
}

export default MemberProfilePage;
