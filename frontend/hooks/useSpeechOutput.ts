"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  countWords,
  countWordsUpTo,
  isSpeechSynthesisSupported,
  pickVietnameseVoice,
  waitForVoices,
} from "@/lib/voice";
import { getCachedSpeechAlignment, rehypeSpeechPrepare } from "@/lib/rehype-highlight-words";
import { prepareSpeechSegments as prepareSpeechSegmentsFromContent } from "@/lib/speech-alignment";

/** Khoảng nghỉ giữa các dòng (ms) — giúp TTS dễ nghe hơn. */
const LINE_PAUSE_MS = 500;

export function useSpeechOutput() {
  const [supported] = useState(isSpeechSynthesisSupported);
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | number | null>(null);
  const [highlightWordIndex, setHighlightWordIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const stopSpeaking = useCallback(() => {
    cancelledRef.current = true;

    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
    setSpeakingId(null);
    setHighlightWordIndex(null);
  }, []);

  const speak = useCallback(
    async (text: string, id?: string | number) => {
      if (!supported || typeof window === "undefined") return;

      const cached = getCachedSpeechAlignment(text);
      const segments = cached?.segments ?? prepareSpeechSegmentsFromContent(text);
      if (segments.length === 0) return;

      stopSpeaking();
      cancelledRef.current = false;
      await waitForVoices();

      const viVoice = pickVietnameseVoice();

      const speakSegment = (segmentIndex: number, wordOffset: number) => {
        if (cancelledRef.current || segmentIndex >= segments.length) {
          setSpeaking(false);
          setSpeakingId(null);
          setHighlightWordIndex(null);
          return;
        }

        const segment = segments[segmentIndex];

        const utterance = new SpeechSynthesisUtterance(segment);
        utterance.lang = "vi-VN";
        utterance.rate = 0.95;
        utterance.pitch = 1;

        if (viVoice) {
          utterance.voice = viVoice;
        }

        utterance.onstart = () => {
          setSpeaking(true);
          setSpeakingId(id ?? null);
          setHighlightWordIndex(wordOffset);
        };

        utterance.onboundary = (event) => {
          if (cancelledRef.current || event.charIndex <= 0) return;
          // Một số trình duyệt chỉ gửi 'word', một số gửi 'sentence' — đều dùng charIndex.
          if (event.name && event.name !== "word" && event.name !== "sentence") return;
          setHighlightWordIndex(wordOffset + countWordsUpTo(segment, event.charIndex));
        };

        utterance.onend = () => {
          if (cancelledRef.current) return;

          const nextIndex = segmentIndex + 1;
          const nextOffset = wordOffset + countWords(segment);

          if (nextIndex < segments.length) {
            pauseTimerRef.current = window.setTimeout(
              () => speakSegment(nextIndex, nextOffset),
              LINE_PAUSE_MS,
            );
          } else {
            setHighlightWordIndex(null);
            setSpeaking(false);
            setSpeakingId(null);
          }
        };

        utterance.onerror = () => {
          if (!cancelledRef.current) {
            setSpeaking(false);
            setSpeakingId(null);
            setHighlightWordIndex(null);
          }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakSegment(0, 0);
    },
    [supported, stopSpeaking],
  );

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    supported,
    speaking,
    speakingId,
    highlightWordIndex,
    speak,
    stopSpeaking,
  };
}
