/** Global toast notification system */

type ToastType = "success" | "error" | "warning";
type Listener = (msg: string, type: ToastType) => void;

let listener: Listener | null = null;

export function onToast(fn: Listener) { listener = fn; }

export function toast(msg: string, type: ToastType = "success") {
  if (listener) listener(msg, type);
}

export function toastError(msg: string) { toast(msg, "error"); }
export function toastSuccess(msg: string) { toast(msg, "success"); }
export function toastWarning(msg: string) { toast(msg, "warning"); }
