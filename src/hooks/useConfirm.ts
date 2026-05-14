"use client";

import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "danger" | "default";
  confirmText?: string;
  confirmTextPlaceholder?: string;
  confirmTextLabel?: string;
}

let resolveFn: ((value: boolean) => void) | null = null;

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Bestätigen",
    cancelLabel: "Abbrechen",
    variant: "default",
  });

  const [confirmTextValue, setConfirmTextValue] = useState("");

  const confirm = useCallback(
    (
      title: string,
      description: string,
      options?: {
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: "danger" | "default";
        confirmText?: string;
        confirmTextPlaceholder?: string;
        confirmTextLabel?: string;
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveFn = resolve;
        setConfirmTextValue("");
        setState({
          open: true,
          title,
          description,
          confirmLabel: options?.confirmLabel || "Bestätigen",
          cancelLabel: options?.cancelLabel || "Abbrechen",
          variant: options?.variant || "default",
          confirmText: options?.confirmText,
          confirmTextPlaceholder: options?.confirmTextPlaceholder,
          confirmTextLabel: options?.confirmTextLabel,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolveFn?.(true);
    resolveFn = null;
  }, []);

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    resolveFn?.(false);
    resolveFn = null;
  }, []);

  const canConfirm = state.confirmText
    ? confirmTextValue.trim() === state.confirmText.trim()
    : true;

  return {
    confirm,
    state,
    handleConfirm,
    handleCancel,
    confirmTextValue,
    setConfirmTextValue,
    canConfirm,
  };
}
