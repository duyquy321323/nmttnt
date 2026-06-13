/** Web Speech API helpers — STT/TTS tiếng Việt trên trình duệt. */

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

/** Đếm số từ trước vị trí charIndex (dùng sync highlight TTS). */
export function countWordsUpTo(text: string, charIndex: number): number {
  return (text.slice(0, charIndex).match(/\S+/g) ?? []).length;
}

/** Đếm tổng số từ trong một đoạn. */
export function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

/** Chuyển ký hiệu toán / so sánh sang từ đọc được cho TTS tiếng Việt. */
export function normalizeSymbolsForSpeech(text: string): string {
  let result = text;

  const phraseRules: Array<[RegExp, string]> = [
    [/≤/g, " nhỏ hơn hoặc bằng "],
    [/≥/g, " lớn hơn hoặc bằng "],
    [/≠/g, " khác "],
    [/→/g, " suy ra "],
    [/←/g, " quay lại "],
    [/⇒/g, " suy ra "],
    [/⇔/g, " tương đương "],
    [/±/g, " cộng trừ "],
    [/×/g, " nhân "],
    [/÷/g, " chia "],
    [/√/g, " căn bậc hai "],
    [/π/g, " pi "],
    [/∞/g, " vô cực "],
    [/°/g, " độ "],
    [/<=/g, " nhỏ hơn hoặc bằng "],
    [/>=/g, " lớn hơn hoặc bằng "],
    [/!=/g, " khác "],
    [/<>/g, " khác "],
    [/==/g, " bằng "],
    [/=>/g, " suy ra "],
    [/->/g, " suy ra "],
    [/<-/g, " từ "],
    [/\.\.\./g, " ba chấm "],
  ];

  for (const [pattern, replacement] of phraseRules) {
    result = result.replace(pattern, replacement);
  }

  // Toán tử hai ngữ cảnh: số/chữ cả hai vế (2+3, x * y)
  const operand = String.raw`0-9A-Za-z_\u00C0-\u024F\u1E00-\u1EFF`;
  result = result.replace(
    new RegExp(`(?<=[${operand}])\\s*([+*/])\\s*(?=[${operand}])`, "g"),
    (_, op: string) => {
      if (op === "+") return " cộng ";
      if (op === "*") return " nhân ";
      return " chia ";
    },
  );

  // Trừ: tránh tách từ nối kiểu "học-sinh"
  result = result
    .replace(new RegExp(`(?<=[${operand}])\\s+-\\s+(?=[${operand}])`, "g"), " trừ ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1 trừ $2");

  // Ký hiệu đơn còn lại
  const singleRules: Array<[RegExp, string]> = [
    [/%/g, " phần trăm "],
    [/\^/g, " mũ "],
    [/=/g, " bằng "],
    [/</g, " nhỏ hơn "],
    [/>/g, " lớn hơn "],
    [/\+/g, " cộng "],
    [/\*/g, " nhân "],
    [/(?<![\dA-Za-z])-(?=\d)/g, " âm "],
  ];

  for (const [pattern, replacement] of singleRules) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s+/g, " ").trim();
}

export function pickVietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  const viVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith("vi")) ??
    voices.find((v) => v.lang.toLowerCase().includes("vi"));
  return viVoice ?? null;
}

export function waitForVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const timer = window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);

    function onChange() {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    }

    window.speechSynthesis.addEventListener("voiceschanged", onChange);
  });
}
