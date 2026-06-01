import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
  variant?: "assistant" | "user";
}

export function MarkdownMessage({ content, variant = "assistant" }: MarkdownMessageProps) {
  const isUser = variant === "user";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        p: ({ children }) => (
          <p className={`mb-2 last:mb-0 ${isUser ? "text-white" : ""}`}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong className={`font-bold ${isUser ? "text-white" : "text-zinc-900"}`}>
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-base font-bold">{children}</h2>,
        h3: ({ children }) => (
          <h3 className="mb-1 mt-3 border-b border-zinc-200/80 pb-1 text-sm font-semibold text-blue-800 first:mt-0">
            {children}
          </h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-4 border-zinc-300 pl-3 italic text-zinc-600">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = Boolean(className);
          if (isBlock) {
            return (
              <code className="my-2 block overflow-x-auto rounded-lg bg-zinc-200/80 p-3 font-mono text-xs text-zinc-800">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
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
            className={`underline ${isUser ? "text-blue-100" : "text-blue-600"}`}
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-zinc-300" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
