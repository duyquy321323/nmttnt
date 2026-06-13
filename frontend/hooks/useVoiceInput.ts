"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isSpeechRecognitionSupported } from "@/lib/voice";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

function createRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance })
      .SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
      .webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

interface UseVoiceInputOptions {
  onFinalText: (text: string) => void;
  onInterimText?: (text: string) => void;
  lang?: string;
}

export function useVoiceInput({
  onFinalText,
  onInterimText,
  lang = "vi-VN",
}: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(isSpeechRecognitionSupported);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbacksRef = useRef({ onFinalText, onInterimText });

  useEffect(() => {
    callbacksRef.current = { onFinalText, onInterimText };
  }, [onFinalText, onInterimText]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError("");
    const recognition = createRecognition();
    if (!recognition) {
      setError("Trình duyệt không hỗ trợ nhận giọng nói. Dùng Chrome hoặc Edge.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim && callbacksRef.current.onInterimText) {
        callbacksRef.current.onInterimText(interim.trim());
      }
      if (finalText.trim()) {
        callbacksRef.current.onFinalText(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        setError(event.error === "no-speech" ? "Không nghe thấy giọng nói. Em thử nói lại nhé." : "");
      } else if (event.error === "not-allowed") {
        setError("Em cần cho phép micro trong trình duyệt.");
      } else {
        setError("Không nhận diện được giọng nói. Em thử lại nhé.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Micro đang bận. Em thử lại sau vài giây.");
      setListening(false);
    }
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    supported,
    listening,
    error,
    toggleListening,
    stopListening,
  };
}
