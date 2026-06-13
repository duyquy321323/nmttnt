import type { Element, Root, Text } from "hast";

/** Thẻ block — mỗi block tương ứng một segment TTS (ngắt câu giữa các đoạn). */
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "td",
  "th",
  "dt",
  "dd",
  "blockquote",
]);

export function isInsidePre(ancestors: Element[]): boolean {
  return ancestors.some((node) => node.tagName === "pre");
}

export function splitDisplayWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

type HastParent = Root | Element;

interface HastSpeechWalkCallbacks {
  onWord: (word: string) => void;
  onLineBreak?: () => void;
}

interface HastSpeechMutableCallbacks {
  onText?: (parent: HastParent, index: number, node: Text) => void;
  onLineBreak?: () => void;
}

/** Duyệt HAST mutable — cùng thứ tự với walkHastForSpeech. */
export function walkHastForSpeechMutable(
  parent: HastParent,
  ancestors: Element[],
  callbacks: HastSpeechMutableCallbacks,
): void {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.type === "text") {
      if (isInsidePre(ancestors)) continue;
      callbacks.onText?.(parent, i, child);
      continue;
    }

    if (child.type !== "element") continue;

    if (child.tagName === "pre") continue;

    if (child.tagName === "br") {
      callbacks.onLineBreak?.();
      continue;
    }

    walkHastForSpeechMutable(child, [...ancestors, child], callbacks);

    if (BLOCK_TAGS.has(child.tagName)) {
      callbacks.onLineBreak?.();
    }
  }
}

interface SpeechTextNodeRef {
  parent: HastParent;
  index: number;
  node: Text;
  startWordIndex: number;
}

/** Thu thập text node theo thứ tự đọc — dùng trước khi bọc span highlight. */
export function collectSpeechTextNodes(tree: Root): SpeechTextNodeRef[] {
  const refs: SpeechTextNodeRef[] = [];
  let wordIndex = 0;

  walkHastForSpeechMutable(tree, [], {
    onText: (parent, index, node) => {
      refs.push({ parent, index, node, startWordIndex: wordIndex });
      wordIndex += splitDisplayWords(node.value).length;
    },
  });

  return refs;
}

/** Duyệt HAST theo thứ tự đọc — dùng chung cho alignment và highlight. */
export function walkHastForSpeech(
  parent: HastParent,
  ancestors: Element[],
  callbacks: HastSpeechWalkCallbacks,
): void {
  for (const child of parent.children) {
    if (child.type === "text") {
      if (isInsidePre(ancestors)) continue;
      for (const word of splitDisplayWords(child.value)) {
        callbacks.onWord(word);
      }
      continue;
    }

    if (child.type !== "element") continue;

    if (child.tagName === "pre") continue;

    if (child.tagName === "br") {
      callbacks.onLineBreak?.();
      continue;
    }

    walkHastForSpeech(child, [...ancestors, child], callbacks);

    if (BLOCK_TAGS.has(child.tagName)) {
      callbacks.onLineBreak?.();
    }
  }
}

/** Trích danh sách từ hiển thị theo thứ tự HAST. */
export function extractDisplayWords(tree: Root): string[] {
  const words: string[] = [];
  walkHastForSpeech(tree, [], {
    onWord: (word) => words.push(word),
  });
  return words;
}

/** Nhóm từ theo block / xuống dòng cho TTS segments. */
export function extractDisplayWordBlocks(tree: Root): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  };

  walkHastForSpeech(tree, [], {
    onWord: (word) => {
      current.push(word);
    },
    onLineBreak: flush,
  });

  flush();
  return blocks;
}

/** Tách text node thành word + whitespace (giữ khoảng trắng gốc). */
export function splitTextPreservingSpaces(value: string): string[] {
  return value.split(/(\s+)/).filter((part) => part.length > 0);
}

export function isSpeechWordPart(part: string): boolean {
  return /\S/.test(part);
}

/** Thay text node bằng span bọc từng word — chỉ số bắt đầu cố định (khớp walkHastForSpeech). */
export function replaceTextWithWordSpansAtIndex(
  parent: HastParent,
  index: number,
  node: Text,
  startWordIndex: number,
  activeDisplayIdx: number | undefined,
): void {
  const parts = splitTextPreservingSpaces(node.value);
  const nodes: Array<Text | Element> = [];
  let wordIndex = startWordIndex;

  for (const part of parts) {
    if (!isSpeechWordPart(part)) {
      nodes.push({ type: "text", value: part });
      continue;
    }

    const isActive = wordIndex === activeDisplayIdx;

    nodes.push({
      type: "element",
      tagName: "span",
      properties: {
        className: isActive
          ? ["rounded-sm", "px-0.5", "bg-yellow-300", "text-text-strong"]
          : [],
        dataDisplayWordIdx: String(wordIndex),
      },
      children: [{ type: "text", value: part }],
    });

    wordIndex += 1;
  }

  parent.children.splice(index, 1, ...nodes);
}
