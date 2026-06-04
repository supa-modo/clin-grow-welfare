import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import Input from "@/components/ui/Input";
import DateInput from "@/components/ui/DateInput";
import SlideOver from "@/components/ui/SlideOver";
import SearchableDropdown, {
  type DropdownOption,
} from "@/components/ui/SearchableDropdown";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { Button } from "@/components/ui/Button";
import { memberApi } from "@/services/memberApi";
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
  const [introducerOptions, setIntroducerOptions] = useState<DropdownOption[]>(
    [],
  );

  const loadIntroducers = useCallback(
    async (search = "") => {
      try {
        const data = await memberApi.list({
          page: 1,
          pageSize: 50,
          search,
          status: "ACTIVE",
        });
        const rows = data.data ?? data.members ?? [];
        setIntroducerOptions(
          rows
            .filter((row) => row.id !== member?.id)
            .map((row) => ({
              value: row.id,
              label: `${row.membershipNumber} - ${row.name}`,
            })),
        );
      } catch {
        setIntroducerOptions([]);
      }
    },
    [member?.id],
  );

  useEffect(() => {
    if (open) {
      setValues(valuesFromMember(member));
      setErrors({});
      void loadIntroducers();
    }
  }, [member, open, loadIntroducers]);

  const introducerDropdownOptions = useMemo(() => {
    const selectedId = values.introducedByMemberId?.trim();
    if (!selectedId || introducerOptions.some((o) => o.value === selectedId)) {
      return introducerOptions;
    }
    const intro = member?.introducedBy;
    if (intro?.id === selectedId) {
      return [
        {
          value: intro.id,
          label: `${intro.membershipNumber} - ${intro.name}`,
        },
        ...introducerOptions,
      ];
    }
    return introducerOptions;
  }, [introducerOptions, member?.introducedBy, values.introducedByMemberId]);

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
        <section className="border-b border-gray-200 bg-white pb-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-secondary-700">Member details</h3>
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

        <section className="border-b border-gray-200 bg-white pb-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-secondary-700">
              Contact & registration fee
            </h3>
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
            <SearchableDropdown
              label="Introduced by"
              options={introducerDropdownOptions}
              value={values.introducedByMemberId ?? ""}
              onChange={(memberId) => set("introducedByMemberId", memberId)}
              onSearchChange={(query) => {
                void loadIntroducers(query);
              }}
              placeholder={
                introducerDropdownOptions.length
                  ? "Search active member (optional)"
                  : "Loading members…"
              }
              clearable
            />
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex h-full items-center justify-between gap-3">
                <div>
                  <p className="text-xs lg:text-[0.8rem] font-semibold text-primary-600">
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
                  disabled={Boolean(member?.registrationFeePaid)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-200 bg-white pb-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-secondary-700">
              Primary beneficiary
            </h3>
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
                onChange={(e) => set("beneficiaryRelationship", e.target.value)}
                error={errors.beneficiaryRelationship}
                required
              />
            </div>
          </div>
        </section>
      </form>
    </SlideOver>
  );
}

export default MemberFormSlideOver;
