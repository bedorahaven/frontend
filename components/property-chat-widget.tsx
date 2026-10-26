"use client";

import { FormEvent, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
      >
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="min-w-0 truncate">Message {hostName}</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          Optional
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[min(760px,calc(100dvh-2rem))] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-3xl border border-border bg-card p-0 shadow-2xl sm:max-w-lg"
          showCloseButton
        >
          <div className="bg-gradient-to-br from-primary to-accent px-6 py-7 pr-14 text-white">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <MessageCircle className="h-6 w-6" />
            </div>
            <DialogHeader className="gap-2 text-left">
              <DialogTitle className="text-xl font-bold text-white">
                Chat with {hostName}
              </DialogTitle>
              <DialogDescription className="line-clamp-2 text-sm text-white/80">
                Ask a question about {propertyName} before you book.
              </DialogDescription>
            </DialogHeader>
          </div>

          {isSent ? (
            <div className="space-y-4 px-6 py-8 text-center">
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
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Your booking is not affected
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Send a note to the host, or close this window and continue
                  straight to payment.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    placeholder="How should the host address you?"
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
                  rows={5}
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
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                We&apos;ll email the host and send a copy to you. Replies go
                straight to your inbox.
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
