"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

import {
  getCachedSpeechAlignment,
  rehypeHighlightWords,
  rehypeSpeechPrepare,
} from "@/lib/rehype-highlight-words";
import { buildSpeechAlignment } from "@/lib/speech-alignment";

interface MarkdownMessageProps {
  content: string;
  variant?: "assistant" | "user";
  /** Chỉ số từ TTS đang đọc — bật highlight karaoke trên markdown. */
  activeWordIndex?: number | null;
}

export function MarkdownMessage({
  content,
  variant = "assistant",
  activeWordIndex = null,
}: MarkdownMessageProps) {
  const isUser = variant === "user";
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackAlignment = useMemo(() => buildSpeechAlignment(content), [content]);

  const rehypePlugins: PluggableList = useMemo(() => {
    const plugins: PluggableList = [[rehypeSpeechPrepare, { contentKey: content }]];

    if (activeWordIndex !== null && activeWordIndex !== undefined) {
      plugins.push([rehypeHighlightWords, { contentKey: content, activeWordIndex }]);
    }

    return plugins;
  }, [activeWordIndex, content]);

  useEffect(() => {
    if (activeWordIndex === null || activeWordIndex === undefined) return;

    const alignment = getCachedSpeechAlignment(content) ?? fallbackAlignment;
    const activeDisplayIdx = alignment.spokenToDisplay[activeWordIndex];
    if (activeDisplayIdx === undefined) return;

    containerRef.current
      ?.querySelector(`[data-display-word-idx="${activeDisplayIdx}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeWordIndex, content, fallbackAlignment]);

  return (
    <div ref={containerRef}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={rehypePlugins}
        components={{
          p: ({ children }) => (
            <p className={`mb-2 last:mb-0 ${isUser ? "text-white" : "text-text"}`}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong className={`font-bold ${isUser ? "text-white" : "text-text-strong"}`}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-2 text-lg font-bold text-text-strong">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 text-base font-bold text-text-strong">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-3 border-b border-border pb-1 text-sm font-semibold text-brand-text first:mt-0">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-4 border-border pl-3 italic text-text-muted">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="my-2 block overflow-x-auto rounded-lg bg-surface-raised p-3 font-mono text-xs text-text-strong">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-text-strong">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 ${isUser ? "text-indigo-100" : "text-brand hover:text-brand-hover"}`}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
