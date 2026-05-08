"use client";

import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "danger" | "default";
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

  const confirm = useCallback(
    (
      title: string,
      description: string,
      options?: { confirmLabel?: string; cancelLabel?: string; variant?: "danger" | "default" }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveFn = resolve;
        setState({
          open: true,
          title,
          description,
          confirmLabel: options?.confirmLabel || "Bestätigen",
          cancelLabel: options?.cancelLabel || "Abbrechen",
          variant: options?.variant || "default",
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

  return { confirm, state, handleConfirm, handleCancel };
}
