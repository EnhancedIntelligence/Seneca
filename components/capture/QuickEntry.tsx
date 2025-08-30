"use client";

import React, { useState, useRef, useCallback } from "react";
import { Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * QuickEntry Component
 *
 * A text input component with a plus button for manual entry and a send button.
 * Supports both controlled and uncontrolled modes.
 *
 * @component
 * @example
 * ```tsx
 * // Uncontrolled
 * <QuickEntry
 *   onSend={(text) => console.log('Sending:', text)}
 *   onPlusClick={() => console.log('Opening manual entry')}
 * />
 *
 * // Controlled
 * <QuickEntry
 *   value={text}
 *   onChange={setText}
 *   onSend={handleSend}
 *   onPlusClick={openSheet}
 * />
 * ```
 */

export interface QuickEntryProps {
  /** Controlled input value. If provided, component is controlled. */
  value?: string;
  /** Controlled input change handler. Required when value is provided. */
  onChange?: (value: string) => void;
  /** Send handler; may be async */
  onSend: (text: string) => void | Promise<void>;
  /** Opens the "+" menu/sheet */
  onPlusClick: () => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to show loading state */
  isLoading?: boolean;
  /** Maximum character length */
  maxLength?: number;
}

export function QuickEntry({
  value: controlledValue,
  onChange: controlledOnChange,
  onSend,
  onPlusClick,
  placeholder = "Type a memory...",
  className,
  disabled = false,
  isLoading = false,
  maxLength = 500,
}: QuickEntryProps) {
  // Support controlled + uncontrolled
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledOnChange ?? setInternalValue;

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isLoading || disabled) return;

    await onSend(trimmedValue);

    // Only clear local state when uncontrolled; caller owns value for controlled case
    if (controlledValue === undefined) {
      setInternalValue("");
    }

    // Keep focus on the field after sending
    inputRef.current?.focus();
  }, [value, isLoading, disabled, onSend, controlledValue]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.slice(0, maxLength);
      setValue(newValue);
    },
    [setValue, maxLength],
  );

  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-4",
        "bg-white/5 backdrop-blur-xl",
        "border-t border-white/10",
        "transition-all duration-200",
        className,
      )}
    >
      {/* Input container */}
      <div className="relative flex-1 flex items-center">
        {/* Plus button */}
        <button
          onClick={onPlusClick}
          disabled={disabled || isLoading}
          className={cn(
            "absolute left-3 z-10",
            "w-8 h-8 rounded-full",
            "bg-violet-600/20 border border-violet-600/40",
            "flex items-center justify-center",
            "transition-all duration-200",
            "hover:bg-violet-600/30 hover:border-violet-600/60",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label="Open detailed entry"
        >
          <Plus className="w-4 h-4 text-violet-400" />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={cn(
            "w-full py-3 pl-14 pr-4",
            "bg-white/5 border border-white/20",
            "rounded-full",
            "text-white placeholder:text-white/40",
            "transition-all duration-200",
            "focus:outline-none focus:border-violet-500/50 focus:bg-white/10",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isFocused && "border-violet-500/50 bg-white/10",
          )}
          aria-label="Memory input"
        />

        {/* Character count */}
        {value.length > 0 && (
          <span
            className={cn(
              "absolute right-4 text-xs",
              value.length >= maxLength * 0.9
                ? "text-orange-400"
                : "text-white/40",
            )}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={cn(
          "w-10 h-10 rounded-full",
          "bg-gradient-to-br from-violet-600 to-blue-600",
          "flex items-center justify-center",
          "transition-all duration-200 transform",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          canSend
            ? "hover:scale-110 hover:shadow-lg hover:shadow-violet-500/30 active:scale-95"
            : "opacity-50 cursor-not-allowed",
        )}
        aria-label="Send memory"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}
