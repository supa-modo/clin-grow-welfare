import { useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiCheckCircle } from "react-icons/fi";
import { PiUserPlusDuotone } from "react-icons/pi";
import {
  TbChevronLeft,
  TbMailFilled,
  TbPhoneCall,
  TbPhoneFilled,
} from "react-icons/tb";

import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  AuthErrorBanner,
  AuthLogoHeader,
  AuthPageShell,
} from "@/components/auth/AuthPageShell";
import { registrationAuthHighlights } from "@/components/auth/authHighlights";
import { memberApi } from "@/services/memberApi";
import type { MemberFormValues } from "@/types/member";

const registrationSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().min(7, "Phone number is required"),
  idNumber: z.string().trim().optional(),
  beneficiaryName: z.string().trim().min(2, "Beneficiary name is required"),
  beneficiaryPhone: z.string().trim().min(7, "Beneficiary phone is required"),
  beneficiaryRelationship: z.string().trim().min(2, "Relationship is required"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

function apiErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string; error?: string } } }
    ).response;
    return (
      response?.data?.message ?? response?.data?.error ?? "Registration failed"
    );
  }
  return "Registration failed";
}

export function MemberRegistrationPage() {
  const [submitted, setSubmitted] = useState<{
    memberNo: string;
    name: string;
  } | null>(null);
  const [apiError, setApiError] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    setApiError("");
    try {
      const { member } = await memberApi.register(values as MemberFormValues);
      setSubmitted({ memberNo: member.membershipNumber, name: member.name });
    } catch (error) {
      setApiError(apiErrorMessage(error));
    }
  });

  if (submitted) {
    return (
      <AuthPageShell
        heading="Application received"
        sub="Your submission is under review. You will be notified once membership is approved."
        highlights={registrationAuthHighlights}
      >
        <AuthLogoHeader />
        <div className="py-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <FiCheckCircle className="h-8 w-8 text-brand-700" />
            <h2 className="font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
              Application received
            </h2>
          </div>
          <p className="mx-auto mb-3 max-w-sm text-xs leading-6 text-gray-500 md:text-[0.8rem] lg:text-[0.85rem]">
            Thank you, <span className="font-semibold">{submitted?.name}</span>.
            Your provisional member number is{" "}
            <span className="font-google font-bold text-brand-800">
              {submitted?.memberNo}
            </span>
            .
          </p>
          <p className="mx-auto mb-6 max-w-sm text-xs leading-6 text-gray-500 md:text-[0.8rem] lg:text-[0.85rem]">
            You will be notified once an official approves your membership.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 underline-offset-4 transition-colors hover:text-brand-600 hover:underline lg:text-sm"
          >
            <TbChevronLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      heading="Member registration"
      sub="Submit your details for review by the welfare committee."
      highlights={registrationAuthHighlights}
      contentMaxWidth="max-w-2xl"
      cardClassName="px-5 py-6 md:px-6 md:py-7 lg:px-7"
    >
      <AuthLogoHeader />
      <div className="pb-1 text-center">
        <h2 className="mb-1 font-google text-base font-extrabold text-brand-700 md:text-[1.1rem]">
          New Member registration
        </h2>
        <p className="text-xs text-slate-500 md:text-[0.8rem] lg:text-[0.85rem]">
          Complete the form below to apply for welfare membership.
        </p>
      </div>

      {apiError ? <AuthErrorBanner message={apiError} /> : null}

      <form
        onSubmit={submit}
        className="-mx-2 lg:mx-0 flex flex-col gap-4 pt-2"
        noValidate
      >
        <div className="flex flex-col gap-4 px-1 lg:px-4">
          <div>
            <p className="pb-2 pl-1 text-xs lg:text-sm font-semibold text-secondary-600">
              Fill in Your Personal Details
            </p>

            <div className="grid gap-3 grid-cols-2 mb-2.5">
              <Input
                label="First name"
                labelClassName="text-gray-600"
                placeholder="- Opuk"
                error={errors.firstName?.message}
                autoComplete="given-name"
                {...register("firstName")}
              />
              <Input
                label="Last name"
                labelClassName="text-gray-600"
                placeholder="- Jamandas"
                error={errors.lastName?.message}
                autoComplete="family-name"
                {...register("lastName")}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Email"
                labelClassName="text-gray-600"
                type="email"
                inputMode="email"
                leftIcon={<TbMailFilled className="h-4 md:h-5 w-4 md:w-5" />}
                placeholder="you@example.com"
                error={errors.email?.message}
                autoComplete="email"
                {...register("email")}
              />
              <Input
                label="Phone"
                labelClassName="text-gray-600"
                type="tel"
                inputMode="tel"
                leftIcon={<TbPhoneCall className="h-4 md:h-5 w-4 md:w-5" />}
                placeholder="07..."
                error={errors.phone?.message}
                autoComplete="tel"
                {...register("phone")}
              />
              <Input
                label="ID number"
                labelClassName="text-gray-600"
                placeholder="Your national ID Number"
                error={errors.idNumber?.message}
                wrapperClassName="sm:col-span-2"
                {...register("idNumber")}
              />
            </div>
          </div>

          <div className="border-t border-ink-100 pt-4">
            <p className="pb-2 pl-1 text-xs lg:text-sm font-semibold text-secondary-600">
              Beneficiary Information
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full name"
                labelClassName="text-gray-600"
                placeholder="Beneficiary name"
                error={errors.beneficiaryName?.message}
                {...register("beneficiaryName")}
              />
              <Input
                label="Phone"
                labelClassName="text-gray-600"
                type="tel"
                leftIcon={<TbPhoneCall className="h-4 md:h-5 w-4 md:w-5" />}
                placeholder="07..."
                error={errors.beneficiaryPhone?.message}
                {...register("beneficiaryPhone")}
              />
              <Input
                label="Relationship"
                labelClassName="text-gray-600"
                placeholder="e.g. Spouse, Parent"
                error={errors.beneficiaryRelationship?.message}
                wrapperClassName="sm:col-span-2"
                {...register("beneficiaryRelationship")}
              />
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          rounded="full"
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="w-full bg-brand-700 py-[0.6rem] hover:bg-brand-600 md:py-2.5 lg:py-3"
          loadingText="Submitting..."
        >
          <div className="font-google flex items-center justify-center gap-2 text-[0.7rem] md:text-[0.78rem] lg:text-[0.82rem]">
            <PiUserPlusDuotone className="h-[1.1rem] w-[1.1rem] lg:h-5 lg:w-5" />
            <span>Submit application</span>
          </div>
        </Button>

        <p className="pt-3 text-center text-xs text-ink-500 md:text-[0.8rem] lg:pt-4 lg:text-[0.85rem]">
          Already registered?{" "}
          <Link
            to="/login"
            className="text-xs font-semibold text-brand-700 underline underline-offset-4 hover:text-red-600 lg:text-sm"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthPageShell>
  );
}
