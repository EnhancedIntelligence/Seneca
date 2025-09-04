"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * RecordButton Component
 *
 * A hold-to-record button with visual feedback and timer display.
 * Used for capturing voice memories in the Memory Vault app.
 *
 * @component
 * @example
 * ```tsx
 * <RecordButton
 *   onRecordStart={() => console.log('Recording started')}
 *   onRecordEnd={(duration) => console.log(`Recorded for ${duration} seconds`)}
 * />
 * ```
 */

export interface RecordButtonProps {
  /** Callback fired when recording starts */
  onRecordStart?: () => void;
  /** Callback fired when recording ends with duration in seconds */
  onRecordEnd?: (duration: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant of the button */
  size?: "sm" | "md" | "lg";
}

export function RecordButton({
  onRecordStart,
  onRecordEnd,
  className,
  disabled = false,
  size = "lg",
}: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = () => {
    if (disabled) return;

    setIsRecording(true);
    startTimeRef.current = Date.now();

    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    onRecordStart?.();
  };

  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onRecordEnd?.(duration);
  };

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-36 h-36",
    lg: "w-44 h-44",
  };

  const iconSizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        className={cn(
          "relative rounded-full transition-all duration-300",
          "bg-gradient-to-br shadow-xl",
          "cursor-pointer select-none",
          "focus:outline-none focus-visible:ring-4",
          isRecording
            ? "from-red-500 to-red-600 shadow-red-500/40 focus-visible:ring-red-500/50 animate-pulse"
            : "from-violet-600 to-blue-600 shadow-violet-500/40 hover:shadow-violet-500/60 focus-visible:ring-violet-500/50",
          "border-4 border-white/30",
          disabled && "opacity-50 cursor-not-allowed",
          sizeClasses[size],
          className,
        )}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        disabled={disabled}
        aria-label={
          isRecording ? "Recording... Release to stop" : "Hold to record"
        }
        aria-pressed={isRecording}
      >
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "transition-all duration-300",
              iconSizeClasses[size],
              "bg-white",
              isRecording ? "rounded-lg scale-75" : "rounded-full",
            )}
          />
        </div>

        {/* Pulsing ring effect when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-red-500 opacity-10 animate-ping animation-delay-200" />
          </>
        )}
      </button>

      {/* Recording status text */}
      <div className="text-center">
        <p className="text-lg text-white/80">
          {isRecording ? "Recording..." : "Hold to record memory"}
        </p>

        {/* Timer display */}
        {isRecording && (
          <p className="text-2xl font-semibold text-red-500 mt-2 tabular-nums">
            {formatTime(recordingTime)}
          </p>
        )}
      </div>
    </div>
  );
}
