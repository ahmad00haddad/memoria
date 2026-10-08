import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  /** The confirm button stays disabled until this exact text is typed. */
  requireText?: string;
};

type Resolver = (v: boolean) => void;

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const [typed, setTyped] = useState("");

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setTyped("");
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    setOpen(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    if (r) r(v);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => { if (!o) close(false); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title ?? "تأكيد"}</AlertDialogTitle>
            {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {opts?.requireText && (
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">للتأكيد اكتبي: <strong dir="ltr" className="text-foreground select-all">{opts.requireText}</strong></span>
              <input
                autoFocus
                dir="ltr"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2"
              />
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>{opts?.cancelText ?? "إلغاء"}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!opts?.requireText && typed.trim() !== opts.requireText}
              onClick={() => close(true)}
              className={opts?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {opts?.confirmText ?? "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}