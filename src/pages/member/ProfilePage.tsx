import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiFileText,
  FiHeart,
  FiLock,
  FiLogOut,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { api } from '@/services/api';
import { memberPortalApi, type BeneficiaryChangeRequest } from '@/services/memberApi';
import { EmptyState } from '@/components/ui/Feedback';
import Spinner from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs, type SegmentedTab } from '@/components/ui/SegmentedTabs';
import { getInitials } from '@/components/member/MemberPortalUi';
import {
  ProfileDetailTile,
  ProfileFieldGrid,
  ProfileSection,
} from '@/components/member/ProfileSection';
import { DependantsPanel } from '@/components/members/DependantsPanel';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/auth';
import type { Member } from '@/types/member';

type ProfileTab = 'personal' | 'family' | 'documents';

function parseProfileTab(value: string | null): ProfileTab {
  if (value === 'family' || value === 'documents') return value;
  return 'personal';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'error' in error.response.data
  ) {
    return String(error.response.data.error);
  }
  return fallback;
}

function DocumentRow({
  fileName,
  createdAt,
}: {
  fileName: string;
  createdAt: string;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <FiFileText className="h-4 w-4" />
        </span>
        <p
          className="min-w-0 wrap-break-word text-[0.8rem] font-semibold text-slate-900"
          title={fileName}
        >
          {fileName}
        </p>
      </div>
      <span className="shrink-0 pl-10 text-xs font-medium text-slate-500 sm:pl-0">
        {formatDate(createdAt)}
      </span>
    </li>
  );
}

function PendingBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-bold text-amber-900">Pending official verification</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function MemberProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toastSuccess = useUiStore((s) => s.toastSuccess);
  const toastError = useUiStore((s) => s.toastError);
  const logout = useAuthStore((s) => s.logout);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tab = parseProfileTab(searchParams.get('tab'));
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ email: '', phone: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [registrationFeeAmount, setRegistrationFeeAmount] = useState<number | null>(null);
  const [pendingBeneficiary, setPendingBeneficiary] = useState<BeneficiaryChangeRequest | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    proposedName: '',
    proposedPhone: '',
    proposedRelationship: '',
    proposedIdNumber: '',
    note: '',
  });
  const [editingBeneficiary, setEditingBeneficiary] = useState(false);
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);
  const [portalDocuments, setPortalDocuments] = useState<
    Array<{ id: string; fileName: string; createdAt: string }>
  >([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      memberPortalApi.profile(),
      api.get<{ registrationFeeAmount?: number }>('/member-portal/dashboard'),
    ])
      .then(([m, dash]) => {
        setMember(m);
        setContactForm({ email: m.email ?? '', phone: m.phone ?? '' });
        setRegistrationFeeAmount(Number(dash.data.registrationFeeAmount ?? 0) || null);
        setBeneficiaryForm({
          proposedName: m.beneficiaryName,
          proposedPhone: m.beneficiaryPhone,
          proposedRelationship: m.beneficiaryRelationship,
          proposedIdNumber: '',
          note: '',
        });
      })
      .catch(() => setError('We could not load your profile details.'))
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
        '/member-portal/documents',
      )
      .then((res) => setPortalDocuments(res.data.documents ?? []))
      .catch(() => setPortalDocuments([]));
  }, [member?.id]);

  const tabs = useMemo<readonly SegmentedTab<ProfileTab>[]>(
    () => [
      { value: 'personal', label: 'Personal', icon: <FiUser /> },
      { value: 'family', label: 'Family', icon: <FiUsers /> },
      {
        value: 'documents',
        label: 'Documents',
        icon: <FiFileText />,
        count: portalDocuments.length || undefined,
      },
    ],
    [portalDocuments.length],
  );

  const changePassword = async () => {
    if (!passwordForm.currentPassword || passwordForm.newPassword.length < 8) {
      toastError(
        'Password details required',
        'Enter your current password and a new password of at least 8 characters.',
      );
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toastSuccess('Password changed', 'Use your new password next time you sign in.');
    } catch (e: unknown) {
      toastError('Password change failed', apiErrorMessage(e, 'Could not change password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const updated = await memberPortalApi.updateContact({
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
      });
      setMember(updated);
      setEditingContact(false);
      toastSuccess('Contact updated', 'Your contact details were saved.');
    } catch (e: unknown) {
      toastError('Update failed', apiErrorMessage(e, 'Could not update contact details.'));
    } finally {
      setSavingContact(false);
    }
  };

  const submitBeneficiaryChange = async () => {
    if (!beneficiaryForm.proposedName.trim() || !beneficiaryForm.proposedRelationship.trim()) {
      toastError('Details required', 'Enter beneficiary name and relationship.');
      return;
    }
    setSavingBeneficiary(true);
    try {
      const res = await memberPortalApi.submitBeneficiaryChange(beneficiaryForm);
      setPendingBeneficiary(res.request);
      setEditingBeneficiary(false);
      toastSuccess('Submitted for review', res.message);
    } catch (e: unknown) {
      toastError(
        'Submission failed',
        apiErrorMessage(e, 'Could not submit beneficiary change.'),
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
        <PageHeader
          title="My Profile"
          description="Your membership, contact, family, and document records."
        />
        <EmptyState
          title="Profile unavailable"
          message={error || 'Your account is not linked to a member profile.'}
        />
      </div>
    );
  }

  const standing =
    member.status === 'ACTIVE' && member.registrationFeePaid
      ? 'In good standing'
      : 'Action may be required';

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My Profile"
        description="Your membership, contact, family, and document records."
      />

      <Card className="overflow-hidden rounded-lg border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-base font-extrabold text-primary-700 md:h-16 md:w-16 md:text-lg">
                {getInitials(member.name)}
              </div>
              <div className="min-w-0">
                <h2 className="wrap-break-word text-[0.9rem] font-extrabold text-slate-950 md:text-xl">
                  {member.name}
                </h2>
                <p className="mt-0.5 text-[0.8rem] font-semibold text-slate-500">
                  {member.membershipNumber}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={member.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {member.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge tone={member.approvedAt ? 'success' : 'warning'}>
                    {member.approvedAt ? 'Approved' : 'Pending approval'}
                  </Badge>
                  <Badge tone={member.registrationFeePaid ? 'success' : 'warning'}>
                    Registration {member.registrationFeePaid ? 'paid' : 'pending'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="min-w-0 text-sm md:max-w-xs md:text-right">
              <p className="font-semibold text-slate-900">{standing}</p>
              <p className="mt-1 text-slate-500">Joined {formatDate(member.dateJoined)}</p>
              {member.approvedAt ? (
                <p className="mt-0.5 text-slate-500">
                  Approved {formatDate(member.approvedAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 md:px-6">
          <SegmentedTabs
            variant="line"
            tabs={tabs}
            value={tab}
            onChange={(next) => {
              setSearchParams(next === 'personal' ? {} : { tab: next }, { replace: true });
            }}
            aria-label="Profile sections"
          />
        </div>

        <div className="p-4 md:p-6">
          {tab === 'personal' ? (
            <div className="grid gap-5">
              <ProfileSection
                title="Personal & membership"
                description="Your identity and standing on the welfare register."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <ProfileDetailTile label="Full name" value={member.name} icon={<FiUser />} />
                  <ProfileDetailTile
                    label="ID / Passport"
                    value={member.idNumber}
                    icon={<FiShield />}
                  />
                  <ProfileDetailTile
                    label="Member number"
                    value={member.membershipNumber}
                  />
                  <ProfileDetailTile
                    label="Join date"
                    value={formatDate(member.dateJoined)}
                  />
                  <ProfileDetailTile
                    label="Registration fee"
                    value={
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {registrationFeeAmount ? (
                          <span>KES {registrationFeeAmount.toLocaleString()}</span>
                        ) : null}
                        <Badge tone={member.registrationFeePaid ? 'success' : 'warning'}>
                          {member.registrationFeePaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </span>
                    }
                  />
                  {member.nonComplianceReasons ? (
                    <ProfileDetailTile
                      label="Notes"
                      value={member.nonComplianceReasons}
                      className="md:col-span-2"
                    />
                  ) : null}
                </div>
              </ProfileSection>

              <ProfileSection
                title="Contact details"
                description="How we reach you for welfare notices and approvals."
                action={
                  !editingContact ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingContact(true)}>
                      Edit contact
                    </Button>
                  ) : null
                }
              >
                {editingContact ? (
                  <div className="mx-auto max-w-xl space-y-4">
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
                        loadingText="Saving…"
                      >
                        Save changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingContact(false);
                          setContactForm({
                            email: member.email ?? '',
                            phone: member.phone ?? '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ProfileDetailTile
                      label="Phone"
                      value={member.phone ?? '—'}
                      icon={<FiPhone />}
                    />
                    <ProfileDetailTile
                      label="Email"
                      value={member.email ?? '—'}
                      icon={<FiMail />}
                    />
                  </div>
                )}
              </ProfileSection>

              <ProfileSection
                title="Security"
                description="Change your password or end this session."
              >
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
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <Button
                    variant="secondary"
                    icon={<FiLogOut />}
                    onClick={() => {
                      logout();
                      window.location.href = '/login';
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </ProfileSection>
            </div>
          ) : null}

          {tab === 'family' ? (
            <div className="grid gap-5">
              <ProfileSection
                title="Primary beneficiary"
                description="Officials must verify any change before it replaces your current beneficiary."
                action={
                  !pendingBeneficiary && !editingBeneficiary ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingBeneficiary(true)}>
                      Request change
                    </Button>
                  ) : null
                }
              >
                {pendingBeneficiary ? (
                  <PendingBanner>
                    <ProfileFieldGrid>
                      <ProfileDetailTile
                        label="Proposed name"
                        value={pendingBeneficiary.proposedName}
                        icon={<FiHeart />}
                      />
                      <ProfileDetailTile
                        label="Relationship"
                        value={pendingBeneficiary.proposedRelationship}
                      />
                      <ProfileDetailTile
                        label="Phone"
                        value={pendingBeneficiary.proposedPhone}
                        icon={<FiPhone />}
                      />
                    </ProfileFieldGrid>
                  </PendingBanner>
                ) : null}

                {editingBeneficiary ? (
                  <div className="space-y-4">
                    <ProfileFieldGrid>
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
                    </ProfileFieldGrid>
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
                  <ProfileFieldGrid>
                    <ProfileDetailTile
                      label="Name"
                      value={member.beneficiaryName}
                      icon={<FiHeart />}
                    />
                    <ProfileDetailTile
                      label="Relationship"
                      value={member.beneficiaryRelationship}
                    />
                    <ProfileDetailTile
                      label="Phone"
                      value={member.beneficiaryPhone}
                      icon={<FiPhone />}
                    />
                    <ProfileDetailTile label="Allocation" value="100% primary allocation" />
                  </ProfileFieldGrid>
                )}
              </ProfileSection>

              <DependantsPanel scope="member" embedded />
            </div>
          ) : null}

          {tab === 'documents' ? (
            <ProfileSection
              title="My documents"
              description="Files uploaded to your member record."
            >
              {portalDocuments.length ? (
                <ul className="overflow-hidden rounded-lg border border-slate-200">
                  {portalDocuments.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      fileName={doc.fileName}
                      createdAt={doc.createdAt}
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No documents on file yet. Contact officials if you need to upload ID or
                  membership papers.
                </p>
              )}
            </ProfileSection>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export default MemberProfilePage;
