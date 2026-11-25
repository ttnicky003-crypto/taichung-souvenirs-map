"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[2000] bg-[#241c16]/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[2001] left-1/2 top-auto bottom-0 w-full max-h-[88dvh] -translate-x-1/2 overflow-y-auto rounded-t-3xl bg-[#fffaf3] p-5 shadow-2xl sm:bottom-auto sm:top-1/2 sm:max-w-md sm:-translate-y-1/2 sm:rounded-3xl",
            className,
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="text-lg font-black text-[#241c16]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-full border border-[#e4d9c8] px-3 py-1 text-xs font-bold text-[#6b5c4d]">
              關閉
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
