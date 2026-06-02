import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import Input from "@/components/ui/Input";
import DateInput from "@/components/ui/DateInput";
import SlideOver from "@/components/ui/SlideOver";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { Button } from "@/components/ui/Button";
import type { Member, MemberFormValues } from "@/types/member";

type MemberFormErrors = Partial<Record<keyof MemberFormValues, string>>;

const initialValues: MemberFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  idNumber: "",
  dateJoined: new Date().toISOString().slice(0, 10),
  introducedByMemberId: "",
  registrationFeePaid: false,
  beneficiaryName: "",
  beneficiaryPhone: "",
  beneficiaryRelationship: "",
};

function valuesFromMember(member?: Member | null): MemberFormValues {
  if (!member) return initialValues;
  return {
    firstName: member.firstName ?? "",
    lastName: member.lastName ?? "",
    email: member.email ?? "",
    phone: member.phone ?? "",
    idNumber: member.idNumber ?? "",
    dateJoined: member.dateJoined
      ? member.dateJoined.slice(0, 10)
      : initialValues.dateJoined,
    introducedByMemberId: member.introducedByMemberId ?? "",
    registrationFeePaid: Boolean(member.registrationFeePaid),
    beneficiaryName: member.beneficiaryName ?? "",
    beneficiaryPhone: member.beneficiaryPhone ?? "",
    beneficiaryRelationship: member.beneficiaryRelationship ?? "",
  };
}

function validate(values: MemberFormValues) {
  const errors: MemberFormErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";
  if (!values.email?.trim())
    errors.email = "Email is required for member portal login credentials.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email address.";
  if (!values.phone?.trim()) errors.phone = "Phone number is required.";
  else if (!/^[+\d][\d\s-]{6,}$/.test(values.phone))
    errors.phone = "Enter a valid phone number.";
  if (!values.beneficiaryName.trim())
    errors.beneficiaryName = "Beneficiary name is required.";
  if (!values.beneficiaryPhone.trim())
    errors.beneficiaryPhone = "Beneficiary phone is required.";
  if (!values.beneficiaryRelationship.trim())
    errors.beneficiaryRelationship = "Relationship is required.";
  return errors;
}

export type MemberFormSlideOverProps = {
  open: boolean;
  member?: Member | null;
  submitting?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => Promise<void> | void;
};

export function MemberFormSlideOver({
  open,
  member,
  submitting,
  error,
  onClose,
  onSubmit,
}: MemberFormSlideOverProps) {
  const isEdit = Boolean(member);
  const [values, setValues] = useState<MemberFormValues>(initialValues);
  const [errors, setErrors] = useState<MemberFormErrors>({});

  useEffect(() => {
    if (open) {
      setValues(valuesFromMember(member));
      setErrors({});
    }
  }, [member, open]);

  const set = (key: keyof MemberFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSave = () => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    void onSubmit({
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

  const title = isEdit ? "Edit member" : "Add member";
  const subtitle = useMemo(() => {
    if (!isEdit)
      return "Capture identity, contact, registration, and primary beneficiary details.";
    return member
      ? `${member.membershipNumber} — ${member.name}`
      : "Update member details.";
  }, [isEdit, member]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      widthClass="max-w-3xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-gray-500">
            Member records can be updated later after official review.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create pending member"}
            </Button>
          </div>
        </div>
      }
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <form
        id="member-form"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">Member details</h3>
            <p className="mt-1 text-xs text-gray-500">
              Core identity and membership start information.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="First name"
              value={values.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              error={errors.firstName}
              required
            />
            <Input
              label="Last name"
              value={values.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              error={errors.lastName}
              required
            />
            <Input
              label="National ID / Passport"
              value={values.idNumber ?? ""}
              onChange={(e) => set("idNumber", e.target.value)}
              placeholder="Optional"
            />
            <DateInput
              label="Join date"
              value={values.dateJoined ?? ""}
              onChange={(e) => set("dateJoined", e.target.value)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">
              Contact & registration
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Used for notifications, login access, and onboarding checks.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Phone number"
              value={values.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              error={errors.phone}
              required
            />
            <Input
              label="Email address"
              type="email"
              value={values.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              error={errors.email}
              required
              placeholder="member@example.com"
            />
            <Input
              label="Introduced by member ID"
              value={values.introducedByMemberId ?? ""}
              onChange={(e) => set("introducedByMemberId", e.target.value)}
              placeholder="Optional UUID"
            />
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex h-full items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Registration fee
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {values.registrationFeePaid
                      ? "Marked as received"
                      : "Awaiting confirmation"}
                  </p>
                </div>
                <ToggleSwitch
                  checked={Boolean(values.registrationFeePaid)}
                  onChange={() =>
                    set("registrationFeePaid", !values.registrationFeePaid)
                  }
                  variant="success"
                  title="Toggle registration fee status"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">
              Primary beneficiary
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Recorded as the default 100% allocation contact.
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Beneficiary name"
                value={values.beneficiaryName}
                onChange={(e) => set("beneficiaryName", e.target.value)}
                error={errors.beneficiaryName}
                required
              />
              <Input
                label="Beneficiary phone"
                value={values.beneficiaryPhone}
                onChange={(e) => set("beneficiaryPhone", e.target.value)}
                error={errors.beneficiaryPhone}
                required
              />
              <Input
                label="Relationship"
                value={values.beneficiaryRelationship}
                onChange={(e) =>
                  set("beneficiaryRelationship", e.target.value)
                }
                error={errors.beneficiaryRelationship}
                required
              />
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="flex items-start gap-2">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="font-semibold">
                  This beneficiary is recorded as the primary 100% allocation
                  contact.
                </p>
              </div>
            </div>
          </div>
        </section>
      </form>
    </SlideOver>
  );
}

export default MemberFormSlideOver;
