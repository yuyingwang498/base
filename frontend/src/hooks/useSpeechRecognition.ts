import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (text: string) => void;
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Whether currently listening */
  isListening: boolean;
  /** Start speech recognition */
  start: () => void;
  /** Stop speech recognition */
  stop: () => void;
}

const SpeechRecognitionCtor: (new () => any) | undefined =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const { lang = "zh-CN", onResult, onEnd } = options;

  const isSupported = !!SpeechRecognitionCtor;
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const callbacksRef = useRef({ onResult, onEnd });

  // Keep callbacks fresh without re-creating recognition
  useEffect(() => {
    callbacksRef.current = { onResult, onEnd };
  }, [onResult, onEnd]);

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor || recognitionRef.current) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      callbacksRef.current.onResult?.(text);
    };

    recognition.onerror = (event: any) => {
      // "aborted" is expected when we call stop()
      if (event.error !== "aborted") {
        console.warn("SpeechRecognition error:", event.error);
      }
      recognitionRef.current = null;
      setIsListening(false);
      callbacksRef.current.onEnd?.();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      callbacksRef.current.onEnd?.();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isSupported, isListening, start, stop };
}
