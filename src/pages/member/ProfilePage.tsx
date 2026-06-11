import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiFileText,
  FiHeart,
  FiLock,
  FiLogOut,
  FiMail,
  FiPhone,
  FiShield,
  FiUploadCloud,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { PiUserDuotone } from "react-icons/pi";
import { api } from "@/services/api";
import {
  memberPortalApi,
  type BeneficiaryChangeRequest,
} from "@/services/memberApi";
import { EmptyState } from "@/components/ui/Feedback";
import Spinner from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  SegmentedTabs,
  type SegmentedTab,
} from "@/components/ui/SegmentedTabs";
import { DependantsPanel } from "@/components/members/DependantsPanel";
import { MemberAvatar } from "@/components/member/MemberAvatar";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/auth";
import type { Member } from "@/types/member";
import type { AuthUser } from "@/lib/workspaces";

type ProfileTab = "personal" | "family" | "documents";

function parseProfileTab(value: string | null): ProfileTab {
  if (value === "family" || value === "documents") return value;
  return "personal";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "error" in error.response.data
  ) {
    return String(error.response.data.error);
  }
  return fallback;
}

function DetailLine({
  label,
  value,
  icon,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] gap-3 py-3">
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {icon ?? <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold uppercase text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 wrap-break-word text-sm font-semibold text-slate-950">
          {value ?? "-"}
        </div>
      </div>
    </div>
  );
}

function SectionBand({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function DocumentRow({
  fileName,
  createdAt,
}: {
  fileName: string;
  createdAt: string;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-1 border-t border-slate-200 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
          <FiFileText className="h-4 w-4" />
        </span>
        <p
          className="min-w-0 wrap-break-word text-sm font-semibold text-slate-900"
          title={fileName}
        >
          {fileName}
        </p>
      </div>
      <span className="shrink-0 pl-11 text-xs font-semibold text-slate-500 sm:pl-0">
        {formatDate(createdAt)}
      </span>
    </li>
  );
}

export function MemberProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const token = useAuthStore((s) => s.token);
  const authUser = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tab = parseProfileTab(searchParams.get("tab"));
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ email: "", phone: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [registrationFeeAmount, setRegistrationFeeAmount] =
    useState<number | null>(null);
  const [pendingBeneficiary, setPendingBeneficiary] =
    useState<BeneficiaryChangeRequest | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    proposedName: "",
    proposedPhone: "",
    proposedRelationship: "",
    proposedIdNumber: "",
    note: "",
  });
  const [editingBeneficiary, setEditingBeneficiary] = useState(false);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [portalDocuments, setPortalDocuments] = useState<
    Array<{ id: string; fileName: string; createdAt: string }>
  >([]);

  const avatarUser = useMemo<AuthUser | null>(() => {
    if (!authUser) return null;
    return {
      ...authUser,
      name: member?.name ?? authUser.name,
      email: member?.email ?? authUser.email,
      phone: member?.phone ?? authUser.phone,
      memberProfileImageUpdatedAt:
        member?.profileImageUpdatedAt ?? authUser.memberProfileImageUpdatedAt,
    };
  }, [authUser, member]);

  const syncAuthMember = (updated: Member) => {
    if (!token || !authUser) return;
    setAuth(token, {
      ...authUser,
      name: updated.name ?? authUser.name,
      email: updated.email ?? authUser.email,
      phone: updated.phone ?? authUser.phone,
      memberProfileImageUpdatedAt:
        updated.profileImageUpdatedAt ?? authUser.memberProfileImageUpdatedAt,
    });
  };

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      memberPortalApi.profile(),
      api.get<{ registrationFeeAmount?: number }>("/member-portal/dashboard"),
    ])
      .then(([m, dash]) => {
        setMember(m);
        setContactForm({ email: m.email ?? "", phone: m.phone ?? "" });
        setRegistrationFeeAmount(
          Number(dash.data.registrationFeeAmount ?? 0) || null,
        );
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

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!member) return;
    void memberPortalApi
      .beneficiaryChangeRequest()
      .then(setPendingBeneficiary)
      .catch(() => setPendingBeneficiary(null));
    void api
      .get<{ documents: Array<{ id: string; fileName: string; createdAt: string }> }>(
        "/member-portal/documents",
      )
      .then((res) => setPortalDocuments(res.data.documents ?? []))
      .catch(() => setPortalDocuments([]));
  }, [member?.id]);

  const tabs = useMemo<readonly SegmentedTab<ProfileTab>[]>(
    () => [
      { value: "personal", label: "Profile", icon: <FiUser /> },
      { value: "family", label: "Family", icon: <FiUsers /> },
      {
        value: "documents",
        label: "Documents",
        icon: <FiFileText />,
        count: portalDocuments.length || undefined,
      },
    ],
    [portalDocuments.length],
  );

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const updated = await memberPortalApi.updateContact({
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
      });
      setMember(updated);
      syncAuthMember(updated);
      setEditingContact(false);
      toastSuccess("Contact updated", "Your contact details were saved.");
    } catch (e: unknown) {
      toastError("Update failed", apiErrorMessage(e, "Could not update contact details."));
    } finally {
      setSavingContact(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Unsupported file", "Upload a PNG, JPG, or WebP image.");
      return;
    }
    setSavingAvatar(true);
    try {
      const updated = await memberPortalApi.uploadAvatar(file);
      setMember(updated);
      syncAuthMember(updated);
      toastSuccess("Photo updated", "Your profile image has been changed.");
    } catch (e: unknown) {
      toastError("Upload failed", apiErrorMessage(e, "Could not update your profile image."));
    } finally {
      setSavingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const changePassword = async () => {
    if (!passwordForm.currentPassword || passwordForm.newPassword.length < 8) {
      toastError(
        "Password details required",
        "Enter your current password and a new password of at least 8 characters.",
      );
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      toastSuccess("Password changed", "Use your new password next time you sign in.");
    } catch (e: unknown) {
      toastError("Password change failed", apiErrorMessage(e, "Could not change password."));
    } finally {
      setSavingPassword(false);
    }
  };

  const submitBeneficiaryChange = async () => {
    if (
      !beneficiaryForm.proposedName.trim() ||
      !beneficiaryForm.proposedRelationship.trim()
    ) {
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
      toastError(
        "Submission failed",
        apiErrorMessage(e, "Could not submit beneficiary change."),
      );
    } finally {
      setSavingBeneficiary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="grid gap-6">
        <EmptyState
          title="Profile unavailable"
          message={error || "Your account is not linked to a member profile."}
        />
      </div>
    );
  }

  const standing =
    member.status === "ACTIVE" && member.registrationFeePaid
      ? "In good standing"
      : "Action may be required";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-6 border-b border-slate-200 bg-[#f8fafc] px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 shrink-0">
              <MemberAvatar
                user={avatarUser}
                name={member.name}
                className="h-24 w-24 bg-slate-100 text-slate-500"
                iconClassName="h-12 w-12"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={savingAvatar}
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-white bg-primary-700 text-white shadow-md transition hover:bg-primary-600 disabled:opacity-60"
                aria-label="Change profile photo"
              >
                {savingAvatar ? (
                  <Spinner size="sm" />
                ) : (
                  <FiUploadCloud className="h-4 w-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void uploadAvatar(event.target.files?.[0])}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={member.status === "ACTIVE" ? "success" : "warning"}>
                  {member.status.replace(/_/g, " ")}
                </Badge>
                <Badge tone={member.registrationFeePaid ? "success" : "warning"}>
                  Registration {member.registrationFeePaid ? "paid" : "pending"}
                </Badge>
              </div>
              <h1 className="mt-3 wrap-break-word text-2xl font-extrabold text-slate-950 md:text-3xl">
                {member.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {member.membershipNumber} / Joined {formatDate(member.dateJoined)}
              </p>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-600 lg:min-w-64 lg:text-right">
            <p className="font-bold text-slate-950">{standing}</p>
            <p>Approved {formatDate(member.approvedAt)}</p>
            <p>{member.email ?? member.phone ?? "Member workspace"}</p>
          </div>
        </div>

        <div className="px-4 pt-4 sm:px-6 lg:px-8">
          <SegmentedTabs
            variant="line"
            tabs={tabs}
            value={tab}
            onChange={(next) => {
              setSearchParams(next === "personal" ? {} : { tab: next }, { replace: true });
            }}
            aria-label="Profile sections"
          />
        </div>

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          {tab === "personal" ? (
            <div className="grid gap-6">
              <SectionBand
                title="Identity"
                description="Membership details kept on the welfare register."
              >
                <div className="grid gap-x-8 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
                  <DetailLine label="Full name" value={member.name} icon={<FiUser />} />
                  <DetailLine label="ID / Passport" value={member.idNumber} icon={<FiShield />} />
                  <DetailLine label="Member number" value={member.membershipNumber} />
                  <DetailLine label="Registration fee" value={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {registrationFeeAmount ? (
                        <span>KES {registrationFeeAmount.toLocaleString()}</span>
                      ) : null}
                      <Badge tone={member.registrationFeePaid ? "success" : "warning"}>
                        {member.registrationFeePaid ? "Paid" : "Pending"}
                      </Badge>
                    </span>
                  } />
                </div>
              </SectionBand>

              <SectionBand
                title="Contact"
                description="Your current phone and email for welfare communication."
                action={
                  !editingContact ? (
                    <Button size="sm" variant="secondary" onClick={() => setEditingContact(true)}>
                      Edit contact
                    </Button>
                  ) : null
                }
              >
                {editingContact ? (
                  <div className="max-w-2xl space-y-4">
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
                        onClick={() => void saveContact()}
                        isLoading={savingContact}
                        loadingText="Saving..."
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
                  <div className="grid gap-x-8 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
                    <DetailLine label="Phone" value={member.phone} icon={<FiPhone />} />
                    <DetailLine label="Email" value={member.email} icon={<FiMail />} />
                  </div>
                )}
              </SectionBand>

              <SectionBand title="Security" description="Account access for this portal.">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <Input
                    label="Current password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                  />
                  <Input
                    label="New password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                  />
                  <Button
                    className="w-full lg:w-auto"
                    icon={<FiLock />}
                    onClick={() => void changePassword()}
                    isLoading={savingPassword}
                    loadingText="Saving..."
                  >
                    Change password
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-red-700 transition hover:text-red-600"
                >
                  <FiLogOut className="h-4 w-4" />
                  Sign out
                </button>
              </SectionBand>
            </div>
          ) : null}

          {tab === "family" ? (
            <div className="grid gap-6">
              <SectionBand
                title="Beneficiary"
                description="Any change is sent to officials for verification."
                action={
                  !pendingBeneficiary && !editingBeneficiary ? (
                    <Button size="sm" variant="secondary" onClick={() => setEditingBeneficiary(true)}>
                      Request change
                    </Button>
                  ) : null
                }
              >
                {pendingBeneficiary ? (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-bold text-amber-900">
                      Pending official verification
                    </p>
                    <div className="mt-3 grid gap-x-8 divide-y divide-amber-200 sm:grid-cols-2 sm:divide-y-0">
                      <DetailLine label="Proposed name" value={pendingBeneficiary.proposedName} icon={<FiHeart />} />
                      <DetailLine label="Relationship" value={pendingBeneficiary.proposedRelationship} />
                      <DetailLine label="Phone" value={pendingBeneficiary.proposedPhone} icon={<FiPhone />} />
                    </div>
                  </div>
                ) : null}

                {editingBeneficiary ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Name"
                        value={beneficiaryForm.proposedName}
                        onChange={(e) =>
                          setBeneficiaryForm((f) => ({ ...f, proposedName: e.target.value }))
                        }
                      />
                      <Input
                        label="Relationship"
                        value={beneficiaryForm.proposedRelationship}
                        onChange={(e) =>
                          setBeneficiaryForm((f) => ({
                            ...f,
                            proposedRelationship: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Phone"
                        value={beneficiaryForm.proposedPhone}
                        onChange={(e) =>
                          setBeneficiaryForm((f) => ({ ...f, proposedPhone: e.target.value }))
                        }
                      />
                      <Input
                        label="ID number (optional)"
                        value={beneficiaryForm.proposedIdNumber}
                        onChange={(e) =>
                          setBeneficiaryForm((f) => ({ ...f, proposedIdNumber: e.target.value }))
                        }
                      />
                    </div>
                    <Input
                      label="Note for officials"
                      value={beneficiaryForm.note}
                      onChange={(e) =>
                        setBeneficiaryForm((f) => ({ ...f, note: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => void submitBeneficiaryChange()}
                        isLoading={savingBeneficiary}
                        loadingText="Submitting..."
                      >
                        Submit for verification
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingBeneficiary(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-x-8 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
                    <DetailLine label="Name" value={member.beneficiaryName} icon={<FiHeart />} />
                    <DetailLine label="Relationship" value={member.beneficiaryRelationship} />
                    <DetailLine label="Phone" value={member.beneficiaryPhone} icon={<FiPhone />} />
                    <DetailLine label="Allocation" value="100% primary allocation" />
                  </div>
                )}
              </SectionBand>

              <div className="border-t border-slate-200 pt-5">
                <DependantsPanel scope="member" embedded />
              </div>
            </div>
          ) : null}

          {tab === "documents" ? (
            <SectionBand
              title="Documents"
              description="Files currently attached to your member record."
            >
              {portalDocuments.length ? (
                <ul>
                  {portalDocuments.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      fileName={doc.fileName}
                      createdAt={doc.createdAt}
                    />
                  ))}
                </ul>
              ) : (
                <div className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                  <PiUserDuotone className="h-10 w-10 text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No documents on file yet.
                  </p>
                </div>
              )}
            </SectionBand>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default MemberProfilePage;
