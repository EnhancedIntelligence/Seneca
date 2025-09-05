'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { completeOnboarding, type CompleteState, type FieldErrors } from '../actions';
import {
  USERNAME_PATTERN_HTML,
  E164_PATTERN_HTML,
  MIN_AGE,
} from '@/lib/validation/onboarding';

// CompleteState with null for initial state
type FormState = CompleteState | null;

// Helper to get local YYYY-MM-DD avoiding timezone issues
const toLocalYMD = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Completing…' : 'Complete Setup'}
    </button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useActionState<FormState, FormData>(completeOnboarding, null);
  
  // Simplify field error checking
  const fe = (state && 'fieldErrors' in state) ? state.fieldErrors : undefined;
  const has = (k: keyof FieldErrors) => Boolean(fe?.[k]?.length);
  const errId = (k: string) => `${k}-error`;
  const today = toLocalYMD();

  return (
    <form action={formAction} className="space-y-6 mt-8">
      {state && 'error' in state && state.error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-destructive/10 text-destructive p-3 rounded"
        >
          {state.message || 'An error occurred'}
        </div>
      )}

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
          aria-invalid={has('fullName')}
          aria-describedby={has('fullName') ? errId('fullName') : undefined}
        />
        {has('fullName') && (
          <p id={errId('fullName')} className="text-sm text-destructive mt-1">
            {fe!.fullName![0]}
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="johndoe"
          onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toLowerCase().trim(); }}
          aria-invalid={has('username')}
          aria-describedby={has('username') ? errId('username') : undefined}
        />
        {has('username') && (
          <p id={errId('username')} className="text-sm text-destructive mt-1">
            {fe!.username![0]}
          </p>
        )}
      </div>

      {/* Date of Birth */}
      <div>
        <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2">
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
          aria-invalid={has('dateOfBirth')}
          aria-describedby={has('dateOfBirth') ? errId('dateOfBirth') : undefined}
        />
        <p className="text-xs text-muted-foreground mt-1">
          You must be at least {MIN_AGE} years old
        </p>
        {has('dateOfBirth') && (
          <p id={errId('dateOfBirth')} className="text-sm text-destructive mt-1">
            {fe!.dateOfBirth![0]}
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
          aria-invalid={has('phone')}
          aria-describedby={has('phone') ? errId('phone') : undefined}
        />
        {has('phone') && (
          <p id={errId('phone')} className="text-sm text-destructive mt-1">
            {fe!.phone![0]}
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}