"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  completeOnboarding,
  type CompleteState,
  type FieldErrors,
} from "../actions";
import {
  USERNAME_PATTERN_HTML,
  E164_PATTERN_HTML,
  MIN_AGE,
} from "@/lib/validation/onboarding";

// CompleteState with null for initial state
type FormState = CompleteState | null;
type FieldName = keyof FieldErrors;

// Helper to get local YYYY-MM-DD avoiding timezone issues
const toLocalYMD = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Helper to merge aria-describedby targets
const describedBy = (...ids: Array<string | undefined>) =>
  ids.filter(Boolean).join(" ") || undefined;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full"
      size="lg"
    >
      {pending ? "Completing…" : "Complete Setup"}
    </Button>
  );
}

function FormFields({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} aria-busy={pending} className="space-y-6">
      {children}
    </fieldset>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    completeOnboarding,
    null,
  );

  // Field error checking with clear variable names and strong typing
  const fieldErrors =
    state && "fieldErrors" in state ? state.fieldErrors : undefined;
  const hasError = (fieldName: FieldName) =>
    Boolean(fieldErrors?.[fieldName]?.length);
  const getErrorId = (fieldName: FieldName) =>
    hasError(fieldName) ? `${fieldName}-error` : undefined;
  const today = toLocalYMD();

  return (
    <form action={formAction} className="space-y-6 mt-8" noValidate>
      {state && "error" in state && state.error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-destructive/10 text-destructive p-3 rounded"
        >
          {state.message || "An error occurred"}
        </div>
      )}

      <FormFields>
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="John Doe"
            aria-invalid={hasError("fullName") || undefined}
            aria-errormessage={getErrorId("fullName")}
          />
          {hasError("fullName") && (
            <p
              id="fullName-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {fieldErrors!.fullName![0]}
            </p>
          )}
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern={USERNAME_PATTERN_HTML}
            title="3–30 chars: a–z, 0–9, underscore or hyphen; cannot start with a hyphen"
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="johndoe"
            onBlur={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .toLowerCase()
                .trim();
            }}
            aria-invalid={hasError("username") || undefined}
            aria-errormessage={getErrorId("username")}
          />
          {hasError("username") && (
            <p
              id="username-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {fieldErrors!.username![0]}
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium mb-2"
          >
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            autoComplete="bday"
            min="1900-01-01"
            max={today}
            className="w-full px-3 py-2 border rounded-md"
            aria-invalid={hasError("dateOfBirth") || undefined}
            aria-errormessage={getErrorId("dateOfBirth")}
            aria-describedby={describedBy("dob-hint")}
          />
          <p id="dob-hint" className="text-xs text-muted-foreground mt-1">
            You must be at least {MIN_AGE} years old
          </p>
          {hasError("dateOfBirth") && (
            <p
              id="dateOfBirth-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {fieldErrors!.dateOfBirth![0]}
            </p>
          )}
        </div>

        {/* Phone (Optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone Number (Optional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            pattern={E164_PATTERN_HTML}
            title="E.164 format, e.g. +14155551234"
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="done"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="+1234567890"
            aria-invalid={hasError("phone") || undefined}
            aria-errormessage={getErrorId("phone")}
          />
          {hasError("phone") && (
            <p
              id="phone-error"
              role="alert"
              className="text-sm text-destructive mt-1"
            >
              {fieldErrors!.phone![0]}
            </p>
          )}
        </div>

        <SubmitButton />
      </FormFields>
    </form>
  );
}
