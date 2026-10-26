"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

interface PropertyChatWidgetProps {
  propertyId: string;
  propertyName: string;
  hostName: string;
  defaultEmail: string;
}

export function PropertyChatWidget({
  propertyId,
  propertyName,
  hostName,
  defaultEmail,
}: PropertyChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setErrorMessage(null);
      setIsSent(false);
      setGuestEmail((currentEmail) => currentEmail || defaultEmail);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          content: message.trim(),
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const responseError =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Your message could not be sent. Please try again.";
        setErrorMessage(responseError);
        return;
      }

      setIsSent(true);
      setMessage("");
    } catch (error) {
      console.error("Property inquiry submission failed:", error);
      setErrorMessage(
        "We couldn't reach the host just now. Please try again in a moment.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <DialogPrimitive.Trigger
        className="fixed bottom-4 right-4 z-[60] flex h-14 max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-xl shadow-primary/25 transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        aria-label={`Chat with ${hostName}`}
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className="truncate">Chat with {hostName}</span>
        <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Optional
        </span>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          className="fixed inset-x-3 bottom-[5.5rem] z-[70] flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card text-sm text-card-foreground shadow-2xl outline-none data-open:animate-in data-open:slide-in-from-bottom-3 data-closed:animate-out data-closed:fade-out-0 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[min(24rem,calc(100vw-3rem))] sm:max-h-[min(42rem,calc(100dvh-7rem))]"
        >
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-br from-primary to-accent px-5 py-4 pr-14 text-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-base font-bold">
                Chat with {hostName}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="truncate text-xs text-white/80">
                About {propertyName}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close chat"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {isSent ? (
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Message sent</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your inquiry is with {hostName}. We sent a copy to{" "}
                  <span className="font-medium text-foreground">
                    {guestEmail}
                  </span>
                  . The host can reply directly to your email.
                </p>
              </div>
              <DialogPrimitive.Close className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                Done
              </DialogPrimitive.Close>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4"
            >
              <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Your booking is not affected
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Send a note to the host, or close chat and continue straight
                  to payment.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-foreground">
                  Your name{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                  <input
                    autoComplete="name"
                    maxLength={100}
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Your name"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-foreground">
                  Email address
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    maxLength={254}
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-xs font-semibold text-foreground">
                Your message
                <textarea
                  required
                  minLength={1}
                  maxLength={2000}
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask about the space, check-in, or anything else..."
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal leading-relaxed outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <span className="block text-right font-normal text-muted-foreground">
                  {message.length}/2000
                </span>
              </label>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/15 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending message…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send message
                  </>
                )}
              </button>
              <p className="pb-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                We&apos;ll email the host and send a copy to you. Replies go
                straight to your inbox.
              </p>
            </form>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
