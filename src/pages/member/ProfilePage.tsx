import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import { memberPortalApi, type BeneficiaryChangeRequest } from "@/services/memberApi";
import { EmptyState, Spinner } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { MemberHero, MemberSection } from "@/components/member/MemberCards";
import { ProfileField, ProfileFieldGrid, ProfileSection } from "@/components/member/ProfileSection";
import { DependantsPanel } from "@/components/members/DependantsPanel";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/auth";
import type { Member } from "@/types/member";

type ProfileTab = "personal" | "family" | "documents";

function parseProfileTab(value: string | null): ProfileTab {
  if (value === "family" || value === "documents") return value;
  return "personal";
}

export function MemberProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const logout = useAuthStore((s) => s.logout);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tab = parseProfileTab(searchParams.get("tab"));
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ email: "", phone: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [registrationFeeAmount, setRegistrationFeeAmount] = useState<number | null>(null);
  const [pendingBeneficiary, setPendingBeneficiary] = useState<BeneficiaryChangeRequest | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    proposedName: "",
    proposedPhone: "",
    proposedRelationship: "",
    proposedIdNumber: "",
    note: "",
  });
  const [editingBeneficiary, setEditingBeneficiary] = useState(false);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [portalDocuments, setPortalDocuments] = useState<Array<{ id: string; fileName: string; createdAt: string }>>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      memberPortalApi.profile(),
      api.get<{ registrationFeeAmount?: number }>('/member-portal/dashboard'),
    ])
      .then(([m, dash]) => {
        setMember(m);
        setContactForm({ email: m.email ?? "", phone: m.phone ?? "" });
        setRegistrationFeeAmount(Number(dash.data.registrationFeeAmount ?? 0) || null);
        setBeneficiaryForm({
          proposedName: m.beneficiaryName,
          proposedPhone: m.beneficiaryPhone,
          proposedRelationship: m.beneficiaryRelationship,
          proposedIdNumber: "",
          note: "",
        });
      })
      .catch(() => setError("We could not load your profile details."))
      .finally(() => setLoading(false));
  };

  const changePassword = async () => {
    if (!passwordForm.currentPassword || passwordForm.newPassword.length < 8) {
      toastError("Password details required", "Enter your current password and a new password of at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      toastSuccess("Password changed", "Use your new password next time you sign in.");
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
          : "Could not change password.";
      toastError("Password change failed", msg);
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!member) return;
    void memberPortalApi.beneficiaryChangeRequest().then(setPendingBeneficiary).catch(() => setPendingBeneficiary(null));
    void api.get<{ documents: Array<{ id: string; fileName: string; createdAt: string }> }>('/member-portal/documents')
      .then((res) => setPortalDocuments(res.data.documents ?? []))
      .catch(() => setPortalDocuments([]));
  }, [member?.id]);

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

  const submitBeneficiaryChange = async () => {
    if (!beneficiaryForm.proposedName.trim() || !beneficiaryForm.proposedRelationship.trim()) {
      toastError("Details required", "Enter beneficiary name and relationship.");
      return;
    }
    setSavingBeneficiary(true);
    try {
      const res = await memberPortalApi.submitBeneficiaryChange(beneficiaryForm);
      setPendingBeneficiary(res.request);
      setEditingBeneficiary(false);
      toastSuccess("Submitted for review", res.message);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e &&
        e.response && typeof e.response === "object" && "data" in e.response &&
        e.response.data && typeof e.response.data === "object" && "error" in e.response.data
          ? String(e.response.data.error)
          : "Could not submit beneficiary change.";
      toastError("Submission failed", msg);
    } finally {
      setSavingBeneficiary(false);
    }
  };

  const tabs = [
    { value: "personal" as const, label: "Personal" },
    { value: "family" as const, label: "Family & dependants" },
    { value: "documents" as const, label: "Documents" },
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
          setSearchParams(next === "personal" ? {} : { tab: next }, { replace: true });
        }}
      />

      {tab === "personal" ? (
        <div className="space-y-4">
          <MemberSection
            title="Personal & membership"
            description="Your identity and standing on the welfare register"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <ProfileField label="Full name" value={member.name} />
              <ProfileField label="ID / Passport" value={member.idNumber} />
              <ProfileField label="Member number" value={member.membershipNumber} />
              <ProfileField
                label="Join date"
                value={new Date(member.dateJoined).toLocaleDateString()}
              />
              <ProfileField
                label="Approval"
                value={
                  <Badge tone={member.approvedAt ? "success" : "warning"}>
                    {member.approvedAt ? "Approved" : "Pending"}
                  </Badge>
                }
              />
              <ProfileField
                label="Registration fee"
                value={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {registrationFeeAmount ? (
                      <span>KES {registrationFeeAmount.toLocaleString()}</span>
                    ) : null}
                    <Badge
                      tone={member.registrationFeePaid ? "success" : "warning"}
                    >
                      {member.registrationFeePaid ? "Paid" : "Pending"}
                    </Badge>
                  </span>
                }
              />
              {member.approvedAt ? (
                <ProfileField
                  label="Approved date"
                  value={new Date(member.approvedAt).toLocaleDateString()}
                />
              ) : null}
              {member.nonComplianceReasons ? (
                <ProfileField label="Notes" value={member.nonComplianceReasons} />
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
                <ProfileField label="Phone" value={member.phone} />
                <ProfileField label="Email" value={member.email} />
              </div>
            )}
          </MemberSection>

          <MemberSection
            title="Security"
            description="Change your password or end this session"
          >
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input
                label="Current password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
              />
              <Input
                label="New password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              />
              <div className="flex items-end">
                <Button onClick={changePassword} isLoading={savingPassword} loadingText="Saving...">Change password</Button>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
              >
                Sign out
              </Button>
            </div>
          </MemberSection>
        </div>
      ) : null}

      {tab === "family" ? (
        <div className="space-y-4">
          <ProfileSection
            title="Primary beneficiary (verified on file)"
            description="Officials must verify any change before it replaces your current beneficiary."
            action={
              !pendingBeneficiary && !editingBeneficiary ? (
                <Button size="sm" variant="secondary" onClick={() => setEditingBeneficiary(true)}>
                  Request change
                </Button>
              ) : null
            }
          >
            {pendingBeneficiary ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Pending official verification</p>
                <ProfileFieldGrid>
                  <ProfileField label="Proposed name" value={pendingBeneficiary.proposedName} />
                  <ProfileField label="Relationship" value={pendingBeneficiary.proposedRelationship} />
                  <ProfileField label="Phone" value={pendingBeneficiary.proposedPhone} />
                </ProfileFieldGrid>
              </div>
            ) : null}
            {editingBeneficiary ? (
              <div className="space-y-3">
                <ProfileFieldGrid>
                  <Input label="Name" value={beneficiaryForm.proposedName} onChange={(e) => setBeneficiaryForm((f) => ({ ...f, proposedName: e.target.value }))} />
                  <Input label="Relationship" value={beneficiaryForm.proposedRelationship} onChange={(e) => setBeneficiaryForm((f) => ({ ...f, proposedRelationship: e.target.value }))} />
                  <Input label="Phone" value={beneficiaryForm.proposedPhone} onChange={(e) => setBeneficiaryForm((f) => ({ ...f, proposedPhone: e.target.value }))} />
                  <Input label="ID number (optional)" value={beneficiaryForm.proposedIdNumber} onChange={(e) => setBeneficiaryForm((f) => ({ ...f, proposedIdNumber: e.target.value }))} />
                </ProfileFieldGrid>
                <Input label="Note for officials" value={beneficiaryForm.note} onChange={(e) => setBeneficiaryForm((f) => ({ ...f, note: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void submitBeneficiaryChange()} isLoading={savingBeneficiary} loadingText="Submitting...">
                    Submit for verification
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingBeneficiary(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <ProfileFieldGrid>
                <ProfileField label="Name" value={member.beneficiaryName} />
                <ProfileField label="Relationship" value={member.beneficiaryRelationship} />
                <ProfileField label="Phone" value={member.beneficiaryPhone} />
                <ProfileField label="Allocation" value="100% primary allocation" />
              </ProfileFieldGrid>
            )}
          </ProfileSection>

          <DependantsPanel scope="member" />
        </div>
      ) : null}

      {tab === "documents" ? (
        <ProfileSection title="My documents" description="Files uploaded to your member record">
          {portalDocuments.length ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {portalDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-800">{doc.fileName}</span>
                  <span className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No documents on file yet. Contact officials if you need to upload ID or membership papers.</p>
          )}
        </ProfileSection>
      ) : null}
    </div>
  );
}

export default MemberProfilePage;
