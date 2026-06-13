import type { Root } from "hast";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import {
  extractDisplayWordBlocks,
  extractDisplayWords,
} from "@/lib/speech-hast-walk";
import { normalizeSymbolsForSpeech } from "@/lib/voice";

export interface SpeechAlignment {
  displayWords: string[];
  spokenToDisplay: number[];
  segments: string[];
}

/** Chuẩn hóa từng từ hiển thị → các từ TTS (symbol + tiếng Việt). */
export function spokenPartsForDisplayWord(word: string): string[] {
  const parts = normalizeSymbolsForSpeech(word).split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts : [word];
}

/** Một block display words → chuỗi TTS (cùng logic với buildSpokenToDisplayMap). */
export function blockToSpokenSegment(words: string[]): string {
  return words.flatMap(spokenPartsForDisplayWord).join(" ");
}

export function buildSpokenToDisplayMapFromWords(displayWords: string[]): number[] {
  const spokenToDisplay: number[] = [];

  displayWords.forEach((word, displayIdx) => {
    const parts = spokenPartsForDisplayWord(word);
    for (let i = 0; i < parts.length; i++) {
      spokenToDisplay.push(displayIdx);
    }
  });

  return spokenToDisplay;
}

/** Parse markdown giống react-markdown (remark-gfm + remark-breaks). */
export function parseMarkdownToHast(content: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype);

  const mdast = processor.parse(content);
  return processor.runSync(mdast) as Root;
}

export function buildSpeechAlignmentFromTree(tree: Root): SpeechAlignment {
  const displayWords = extractDisplayWords(tree);
  const blocks = extractDisplayWordBlocks(tree);
  const spokenToDisplay = buildSpokenToDisplayMapFromWords(displayWords);
  const segments = blocks.map(blockToSpokenSegment).filter((segment) => segment.length > 0);

  return { displayWords, spokenToDisplay, segments };
}

export function buildSpeechAlignment(content: string): SpeechAlignment {
  return buildSpeechAlignmentFromTree(parseMarkdownToHast(content));
}

/** Bỏ markdown, giữ xuống dòng để TTS ngắt câu theo từng block. */
export function prepareSpeechSegments(text: string): string[] {
  return buildSpeechAlignment(text).segments;
}

/** Ánh xạ chỉ số từ TTS → chỉ số từ hiển thị trên markdown. */
export function buildSpokenToDisplayMap(content: string): number[] {
  return buildSpeechAlignment(content).spokenToDisplay;
}
