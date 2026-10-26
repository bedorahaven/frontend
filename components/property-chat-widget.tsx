"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
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

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
}

interface SavedChat {
  conversationId: string | null;
  accessToken: string;
  guestName: string;
  guestEmail: string;
  messages: ChatMessage[];
}

const EMPTY_CHAT = "__bedorahaven_chat_empty__";
const CHAT_STORAGE_EVENT = "bedorahaven:chat-storage";
const EMPTY_MESSAGES: ChatMessage[] = [];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSavedChat(value: unknown): value is SavedChat {
  if (typeof value !== "object" || value === null) return false;
  const chat = value as Record<string, unknown>;
  return (
    (chat.conversationId === null ||
      (typeof chat.conversationId === "string" &&
        UUID_PATTERN.test(chat.conversationId))) &&
    typeof chat.accessToken === "string" &&
    UUID_PATTERN.test(chat.accessToken) &&
    typeof chat.guestName === "string" &&
    typeof chat.guestEmail === "string" &&
    Array.isArray(chat.messages) &&
    chat.messages.every(
      (message: unknown) =>
        typeof message === "object" &&
        message !== null &&
        "id" in message &&
        typeof message.id === "string" &&
        "content" in message &&
        typeof message.content === "string" &&
        "createdAt" in message &&
        typeof message.createdAt === "string" &&
        Number.isFinite(Date.parse(message.createdAt)),
    )
  );
}

function subscribeToChat(
  storageKey: string,
  onStoreChange: () => void,
): () => void {
  const handleStorageChange = (event: Event) => {
    if (
      !(event instanceof StorageEvent) ||
      event.key === storageKey ||
      event.key === null
    ) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(CHAT_STORAGE_EVENT, handleStorageChange);
  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(CHAT_STORAGE_EVENT, handleStorageChange);
  };
}

function getChatSnapshot(storageKey: string): string {
  try {
    return window.localStorage.getItem(storageKey) ?? EMPTY_CHAT;
  } catch (error) {
    console.error("Property chat could not be loaded from this device:", error);
    return EMPTY_CHAT;
  }
}

function parseSavedChat(snapshot: string): SavedChat | null {
  if (snapshot === EMPTY_CHAT) return null;
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return isSavedChat(parsed) ? parsed : null;
  } catch (error) {
    console.error("Saved property chat has invalid data:", error);
    return null;
  }
}

function saveChat(storageKey: string, chat: SavedChat): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(chat));
    window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
  } catch (error) {
    console.error("Property chat could not be saved on this device:", error);
  }
}

export function PropertyChatWidget({
  propertyId,
  propertyName,
  hostName,
  defaultEmail,
}: PropertyChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [identity, setIdentity] = useState({
    guestName: "",
    guestEmail: defaultEmail,
  });
  const [message, setMessage] = useState("");
  const [transientChat, setTransientChat] = useState<SavedChat | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const storageKey = `bedorahaven:chat:${propertyId}`;
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeToChat(storageKey, onStoreChange),
    [storageKey],
  );
  const getSnapshot = useCallback(
    () => getChatSnapshot(storageKey),
    [storageKey],
  );
  const getServerSnapshot = useCallback(() => null, []);
  const chatSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const savedChat = useMemo(
    () => (chatSnapshot ? parseSavedChat(chatSnapshot) : null),
    [chatSnapshot],
  );
  const chat = savedChat ?? transientChat;
  const conversationId = chat?.conversationId ?? null;
  const accessToken = chat?.accessToken ?? null;
  const guestName = chat?.guestName ?? identity.guestName;
  const guestEmail = chat?.guestEmail ?? identity.guestEmail;
  const messages = useMemo(
    () => chat?.messages ?? EMPTY_MESSAGES,
    [chat],
  );
  const isReady = chatSnapshot !== null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = message.trim();
    if (!content || isSending) return;

    setErrorMessage(null);
    setIsSending(true);
    const token = accessToken ?? crypto.randomUUID();
    const draftChat: SavedChat = chat ?? {
      conversationId: null,
      accessToken: token,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      messages: [],
    };
    if (!chat) {
      setTransientChat(draftChat);
      saveChat(storageKey, draftChat);
    }

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          conversation_id: conversationId,
          access_token: token,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          content,
        }),
      });
      const result: unknown = await response.json();

      if (
        !response.ok ||
        typeof result !== "object" ||
        result === null ||
        !("conversation_id" in result) ||
        typeof result.conversation_id !== "string" ||
        !UUID_PATTERN.test(result.conversation_id)
      ) {
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

      const nextConversationId = result.conversation_id;
      const nextMessages = [
        ...messages,
        {
          id: crypto.randomUUID(),
          content,
          createdAt: new Date().toISOString(),
        },
      ];
      const nextChat: SavedChat = {
        conversationId: nextConversationId,
        accessToken: token,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        messages: nextMessages,
      };

      setTransientChat(nextChat);
      saveChat(storageKey, nextChat);
      setMessage("");
    } catch (error) {
      console.error("Property chat message could not be sent:", error);
      setErrorMessage(
        "Your message couldn't be sent. Check your connection and try again.",
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
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup className="fixed inset-x-3 bottom-[5.5rem] z-[70] flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card text-sm text-card-foreground shadow-2xl outline-none data-open:animate-in data-open:slide-in-from-bottom-3 data-closed:animate-out data-closed:fade-out-0 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[min(24rem,calc(100vw-3rem))] sm:max-h-[min(42rem,calc(100dvh-7rem))]">
          <div className="flex shrink-0 items-center gap-3 bg-gradient-to-br from-primary to-accent px-5 py-4 pr-14 text-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-base font-bold">
                Chat with {hostName}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="truncate text-xs text-white/80">
                {propertyName}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close chat"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-4"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {!isReady ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-[90%] space-y-3 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Ask {hostName} about this stay
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Start a conversation about {propertyName}. You can keep
                  chatting here.
                </p>
              </div>
            ) : (
              messages.map((chatMessage) => (
                <div key={chatMessage.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-white shadow-sm">
                    <p className="whitespace-pre-wrap break-words">
                      {chatMessage.content}
                    </p>
                    <time
                      dateTime={chatMessage.createdAt}
                      className="mt-1 block text-right text-[10px] text-white/70"
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(chatMessage.createdAt))}
                    </time>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 space-y-3 border-t border-border bg-card p-4"
          >
            {!conversationId && (
              <>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Chat is optional. You can still continue to checkout.
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="sr-only" htmlFor={`guest-name-${propertyId}`}>
                    Your name (optional)
                  </label>
                  <input
                    id={`guest-name-${propertyId}`}
                    autoComplete="name"
                    maxLength={100}
                    value={guestName}
                    onChange={(event) =>
                      setIdentity((current) => ({
                        ...current,
                        guestName: event.target.value,
                      }))
                    }
                    placeholder="Name (optional)"
                    className="h-10 min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <label className="sr-only" htmlFor={`guest-email-${propertyId}`}>
                    Your email
                  </label>
                  <input
                    id={`guest-email-${propertyId}`}
                    autoComplete="email"
                    type="email"
                    required
                    maxLength={254}
                    readOnly={Boolean(accessToken)}
                    value={guestEmail}
                    onChange={(event) =>
                      setIdentity((current) => ({
                        ...current,
                        guestEmail: event.target.value,
                      }))
                    }
                    placeholder="Email address"
                    className="h-10 min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </>
            )}

            <label className="sr-only" htmlFor={`chat-message-${propertyId}`}>
              Message
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id={`chat-message-${propertyId}`}
                required
                maxLength={2000}
                rows={2}
                value={message}
                disabled={!isReady || isSending}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Write a message..."
                className="min-h-11 max-h-32 min-w-0 flex-1 resize-y rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!isReady || isSending || !message.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {errorMessage}
              </p>
            )}
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
