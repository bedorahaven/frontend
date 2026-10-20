"use client";

import React, { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, Link as LinkIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const format = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const captureSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const applyLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enteredUrl = linkUrl.trim();
    if (!enteredUrl) {
      setLinkError("Enter a URL.");
      return;
    }

    const normalizedUrl = /^[a-z][a-z\d+.-]*:/i.test(enteredUrl)
      ? enteredUrl
      : `https://${enteredUrl}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      setLinkError("Enter a valid URL.");
      return;
    }

    if (!["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol)) {
      setLinkError("Use an http, https, mailto, or tel link.");
      return;
    }

    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range || !editor.contains(range.commonAncestorContainer)) {
      setLinkError("Select text in the editor before adding a link.");
      return;
    }
    if (!range.toString().trim()) {
      setLinkError("Select text in the editor before adding a link.");
      return;
    }

    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("createLink", false, parsedUrl.href);
    onChange(editor.innerHTML);
    setLinkPopoverOpen(false);
    setLinkError("");
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-input bg-transparent overflow-hidden transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-3 py-1.5">
        <button
          type="button"
          onClick={() => format("bold")}
          onMouseDown={(event) => event.preventDefault()}
          title="Bold"
          aria-label="Bold"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => format("italic")}
          onMouseDown={(event) => event.preventDefault()}
          title="Italic"
          aria-label="Italic"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => format("underline")}
          onMouseDown={(event) => event.preventDefault()}
          title="Underline"
          aria-label="Underline"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <Popover
          open={linkPopoverOpen}
          onOpenChange={setLinkPopoverOpen}
        >
          <PopoverTrigger
            render={
              <button
                type="button"
                title="Insert Link"
                aria-label="Insert Link"
                onMouseDown={(event) => {
                  captureSelection();
                  event.preventDefault();
                }}
                onClick={() => {
                  setLinkUrl("");
                  setLinkError("");
                }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            }
          />
          <PopoverContent align="start">
            <PopoverHeader>
              <PopoverTitle>Add link</PopoverTitle>
              <PopoverDescription>
                Add a URL to the selected text.
              </PopoverDescription>
            </PopoverHeader>
            <form onSubmit={applyLink} className="flex flex-col gap-2">
              <Input
                type="text"
                inputMode="url"
                value={linkUrl}
                onChange={(event) => {
                  setLinkUrl(event.target.value);
                  setLinkError("");
                }}
                placeholder="https://example.com"
                aria-label="Link URL"
                aria-invalid={Boolean(linkError)}
                autoFocus
              />
              {linkError && (
                <p className="text-xs text-destructive" role="alert">
                  {linkError}
                </p>
              )}
              <Button type="submit" size="sm">
                Apply link
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editable Area with locked LTR styles */}
      <div
        ref={editorRef}
        contentEditable
        dir="ltr"
        onInput={(e) => {
          onChange(e.currentTarget.innerHTML);
        }}
        data-placeholder={placeholder}
        className="min-h-32 w-full px-3 py-2.5 text-xs text-foreground text-left [direction:ltr] [unicode-bidi:isolate] focus:outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground overflow-y-auto resize-y"
      />
    </div>
  );
}
