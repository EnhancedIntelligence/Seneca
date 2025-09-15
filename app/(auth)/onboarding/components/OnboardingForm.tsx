"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

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

// Hook for username suggestions with debouncing and safeguards
function useUsernameSuggestions(username: string) {
  const [data, setData] = useState<{ available: boolean; suggestions: string[] }>();
  const [limited, setLimited] = useState(false);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const lastValueRef = useRef<string>("");
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();

    // Early exit if we're rate limited
    if (limited) {
      setData(prev => prev ?? { available: false, suggestions: [] });
      return;
    }

    // guard + skip identical values (prevents StrictMode double-fetch)
    // Only check minimum length - let server handle validation and generate suggestions
    if (!trimmed || trimmed.length < 2 || trimmed === lastValueRef.current) {
      if (!trimmed || trimmed.length < 2) {
        setData(undefined);
        setLimited(false);
      }
      abortRef.current?.abort();
      return;
    }
    lastValueRef.current = trimmed;

    // cancel previous
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(
            `/api/onboarding/username-suggestions?q=${encodeURIComponent(trimmed)}`,
            { signal: controller.signal, cache: "no-store" }
          );

          if (res.status === 429) {
            const retryAfter = Number(res.headers.get('retry-after') ?? '60');
            setLimited(true);
            
            // Clear any existing timer before setting a new one
            if (limitTimerRef.current) {
              clearTimeout(limitTimerRef.current);
            }
            
            // Automatically clear the rate limit flag after the retry period (capped at 5 minutes)
            limitTimerRef.current = setTimeout(() => {
              setLimited(false);
              limitTimerRef.current = null;
            }, Math.min(retryAfter, 300) * 1000);
            
            setData({ available: false, suggestions: [] });
            return;
          }
          setLimited(false);
          
          if (!res.ok) {
            setData({ available: false, suggestions: [] });
            return;
          }

          const json = await res.json().catch(() => ({}));
          const available = Boolean(json?.available);
          const suggestions = Array.isArray(json?.suggestions) ? json.suggestions.slice(0, 5) : [];
          setData({ available, suggestions });
        } catch {
          if (!controller.signal.aborted) {
            setData({ available: false, suggestions: [] });
            setLimited(false);
          }
        }
      });
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      // Clean up the rate limit timer
      if (limitTimerRef.current) {
        clearTimeout(limitTimerRef.current);
        limitTimerRef.current = null;
      }
    };
  }, [username, limited]);

  return { data, isPending, limited };
}


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
  const [usernameDraft, setUsernameDraft] = useState("");
  const { data: suggest, isPending: suggestPending, limited } = useUsernameSuggestions(usernameDraft);


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
            value={usernameDraft}
            onChange={(e) => setUsernameDraft(e.target.value)}
            onBlur={(e) => {
              const normalized = e.target.value.toLowerCase().trim();
              setUsernameDraft(normalized);
            }}
            aria-invalid={hasError("username") || undefined}
            aria-errormessage={getErrorId("username")}
            aria-describedby={usernameDraft && suggest ? "username-status" : undefined}
          />
          
          {/* Availability status */}
          {usernameDraft && suggest && (
            <p 
              id="username-status"
              className="mt-1 text-sm text-muted-foreground" 
              role="status" 
              aria-live="polite"
            >
              {suggestPending
                ? "Checking availability…"
                : limited
                ? "You're checking too fast—please try again in a moment."
                : suggest.available
                ? "Nice—this username is available."
                : "That username is taken. Try one of these:"}
            </p>
          )}
          
          {/* Suggestion chips - simplified ARIA without listbox semantics */}
          {usernameDraft && suggest && !suggest.available && !limited && suggest.suggestions.length > 0 && (
            <div 
              className="mt-2 flex flex-wrap gap-2" 
              aria-label="Username suggestions"
            >
              {suggest.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border px-3 py-1 text-sm hover:bg-muted transition-colors"
                  onClick={() => setUsernameDraft(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          
          {/* Server-side error */}

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
