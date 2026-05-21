import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiCreditCard, FiUser, FiUsers } from 'react-icons/fi';
import SlideOver from '@/components/ui/SlideOver';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import type { Member, MemberFormValues } from '@/types/member';

type MemberFormErrors = Partial<Record<keyof MemberFormValues, string>>;

type MemberFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  member?: Member | null;
  submitting?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => Promise<void> | void;
};

const initialValues: MemberFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  idNumber: '',
  dateJoined: new Date().toISOString().slice(0, 10),
  introducedByMemberId: '',
  registrationFeePaid: false,
  beneficiaryName: '',
  beneficiaryPhone: '',
  beneficiaryRelationship: '',
};

function valuesFromMember(member?: Member | null): MemberFormValues {
  if (!member) return initialValues;
  return {
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    idNumber: member.idNumber ?? '',
    dateJoined: member.dateJoined ? member.dateJoined.slice(0, 10) : initialValues.dateJoined,
    introducedByMemberId: member.introducedByMemberId ?? '',
    registrationFeePaid: Boolean(member.registrationFeePaid),
    beneficiaryName: member.beneficiaryName ?? '',
    beneficiaryPhone: member.beneficiaryPhone ?? '',
    beneficiaryRelationship: member.beneficiaryRelationship ?? '',
  };
}

function validate(values: MemberFormValues) {
  const errors: MemberFormErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!values.email?.trim()) errors.email = 'Email is required for member portal login credentials.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.phone?.trim()) errors.phone = 'Phone number is required.';
  if (values.phone && !/^[+\d][\d\s-]{6,}$/.test(values.phone)) errors.phone = 'Enter a valid phone number.';
  if (!values.beneficiaryName.trim()) errors.beneficiaryName = 'Beneficiary name is required.';
  if (!values.beneficiaryPhone.trim()) errors.beneficiaryPhone = 'Beneficiary phone is required.';
  if (!values.beneficiaryRelationship.trim()) errors.beneficiaryRelationship = 'Relationship is required.';
  return errors;
}

function TextField({
  label,
  value,
  onChange,
  error,
  required,
  type = 'text',
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.08em] text-ink-500">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink-800 outline-none transition placeholder:font-medium placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <h3 className="text-sm font-extrabold text-ink-900">{title}</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function MemberFormModal({ open, mode, member, submitting, error, onClose, onSubmit }: MemberFormModalProps) {
  const [values, setValues] = useState<MemberFormValues>(initialValues);
  const [errors, setErrors] = useState<MemberFormErrors>({});

  useEffect(() => {
    if (open) {
      setValues(valuesFromMember(member));
      setErrors({});
    }
  }, [member, open]);

  const title = mode === 'create' ? 'Add member' : 'Edit member';
  const subtitle = useMemo(() => {
    if (mode === 'create') return 'Capture identity, contact, registration, and primary beneficiary details.';
    return member ? `${member.membershipNumber} - ${member.name}` : 'Update member details.';
  }, [member, mode]);

  const set = (key: keyof MemberFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email?.trim(),
      phone: values.phone?.trim(),
      idNumber: values.idNumber?.trim(),
      introducedByMemberId: values.introducedByMemberId?.trim(),
      beneficiaryName: values.beneficiaryName.trim(),
      beneficiaryPhone: values.beneficiaryPhone.trim(),
      beneficiaryRelationship: values.beneficiaryRelationship.trim(),
    });
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      widthClass="max-w-4xl"
      presentation="stacked"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-full bg-brand-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-700/15 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving member...' : mode === 'create' ? 'Create pending member' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <Section icon={<FiUser />} title="Personal information">
          <TextField label="First name" value={values.firstName} onChange={(v) => set('firstName', v)} error={errors.firstName} required />
          <TextField label="Last name" value={values.lastName} onChange={(v) => set('lastName', v)} error={errors.lastName} required />
          <TextField label="National ID / Passport" value={values.idNumber} onChange={(v) => set('idNumber', v)} placeholder="Optional" />
          <TextField label="Join date" type="date" value={values.dateJoined} onChange={(v) => set('dateJoined', v)} />
        </Section>

        <Section icon={<FiCreditCard />} title="Contact and membership">
          <TextField label="Phone number" value={values.phone} onChange={(v) => set('phone', v)} error={errors.phone} required />
          <TextField label="Email address" type="email" value={values.email} onChange={(v) => set('email', v)} error={errors.email} required placeholder="member@example.com" />
          <TextField label="Introduced by member ID" value={values.introducedByMemberId} onChange={(v) => set('introducedByMemberId', v)} placeholder="Optional UUID" />
          <div className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-ink-500">Registration fee</p>
                <p className="mt-1 text-sm font-semibold text-ink-800">
                  {values.registrationFeePaid ? 'Marked as received' : 'Awaiting confirmation'}
                </p>
              </div>
              <ToggleSwitch
                checked={Boolean(values.registrationFeePaid)}
                onChange={() => set('registrationFeePaid', !values.registrationFeePaid)}
                variant="success"
                title="Toggle registration fee status"
              />
            </div>
          </div>
        </Section>

        <Section icon={<FiUsers />} title="Primary beneficiary">
          <TextField label="Beneficiary name" value={values.beneficiaryName} onChange={(v) => set('beneficiaryName', v)} error={errors.beneficiaryName} required />
          <TextField label="Beneficiary phone" value={values.beneficiaryPhone} onChange={(v) => set('beneficiaryPhone', v)} error={errors.beneficiaryPhone} required />
          <TextField label="Relationship" value={values.beneficiaryRelationship} onChange={(v) => set('beneficiaryRelationship', v)} error={errors.beneficiaryRelationship} required />
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-semibold">This beneficiary is recorded as the primary 100% allocation contact for Phase 2.</p>
            </div>
          </div>
        </Section>
      </div>
    </SlideOver>
  );
}

export default MemberFormModal;
