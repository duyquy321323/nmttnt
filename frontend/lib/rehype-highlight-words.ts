import type { Root } from "hast";
import type { Plugin } from "unified";

import {
  buildSpeechAlignmentFromTree,
  type SpeechAlignment,
} from "@/lib/speech-alignment";
import {
  collectSpeechTextNodes,
  replaceTextWithWordSpansAtIndex,
} from "@/lib/speech-hast-walk";

const alignmentByContent = new Map<string, SpeechAlignment>();

export function getCachedSpeechAlignment(content: string): SpeechAlignment | undefined {
  return alignmentByContent.get(content);
}

interface RehypeSpeechPrepareOptions {
  contentKey: string;
}

/** Trích alignment từ HAST thực tế của react-markdown (chạy trước highlight). */
export const rehypeSpeechPrepare: Plugin<[RehypeSpeechPrepareOptions], Root> = (options) => {
  return (tree) => {
    alignmentByContent.set(options.contentKey, buildSpeechAlignmentFromTree(tree));
  };
};

interface RehypeHighlightWordsOptions {
  contentKey: string;
  activeWordIndex: number;
}

/**
 * Bọc từng từ trong markdown bằng span — tô vàng từ đang được TTS đọc.
 * Dùng collectSpeechTextNodes (cùng walk với alignment).
 */
export const rehypeHighlightWords: Plugin<[RehypeHighlightWordsOptions], Root> = (options) => {
  const { contentKey, activeWordIndex } = options;

  return (tree) => {
    const alignment = alignmentByContent.get(contentKey);
    if (!alignment) return;

    const activeDisplayIdx = alignment.spokenToDisplay[activeWordIndex];
    const textNodes = collectSpeechTextNodes(tree);

    for (let i = textNodes.length - 1; i >= 0; i--) {
      const ref = textNodes[i];
      replaceTextWithWordSpansAtIndex(
        ref.parent,
        ref.index,
        ref.node,
        ref.startWordIndex,
        activeDisplayIdx,
      );
    }
  };
};
