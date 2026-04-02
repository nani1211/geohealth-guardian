/**
 * useVoiceAssistant.js — Voice command engine for GeoHealth Guardian.
 *
 * Converts SpeechRecognition transcript → intent → action.
 * Supports: place-type filters, weather alerts, navigation, and search fallback.
 *
 * Usage:
 *   const { startListening, stopListening, isListening, lastIntent } = useVoiceAssistant();
 */

import { useState, useRef, useCallback } from 'react';

// ─── Intent definitions ──────────────────────────────────────────
// Each intent has: id, keywords (any match triggers), action description
const INTENTS = [
  {
    id: 'show_food',
    keywords: ['food', 'restaurant', 'restaurants', 'eat', 'eating', 'hungry', 'lunch', 'dinner', 'breakfast', 'meal', 'diner', 'burger', 'pizza', 'taco'],
    filter: 'food',
    label: 'Showing food stops',
    emoji: '🍔',
  },
  {
    id: 'show_gas',
    keywords: ['gas', 'fuel', 'gas station', 'refuel', 'petrol', 'fill up', 'gasoline'],
    filter: 'gas',
    label: 'Showing gas stations',
    emoji: '⛽',
  },
  {
    id: 'show_rest',
    keywords: ['rest', 'rest area', 'rest stop', 'restroom', 'bathroom', 'break', 'stretch', 'pull over', 'parking'],
    filter: 'rest',
    label: 'Showing rest areas',
    emoji: '🛑',
  },
  {
    id: 'show_hospital',
    keywords: ['hospital', 'emergency', 'doctor', 'medical', 'urgent care', 'pharmacy', 'clinic', 'ambulance', 'help'],
    filter: 'hospital',
    label: 'Showing medical facilities',
    emoji: '🏥',
  },
  {
    id: 'show_mechanic',
    keywords: ['mechanic', 'car repair', 'tire', 'tow', 'auto repair', 'fix car', 'breakdown'],
    filter: 'mechanic',
    label: 'Showing auto repair',
    emoji: '🔧',
  },
  {
    id: 'weather_ahead',
    keywords: ['weather', 'weather ahead', 'storm', 'rain ahead', 'conditions', 'forecast', 'storms', 'severe weather', 'snow ahead'],
    action: 'weather_ahead',
    label: 'Checking weather ahead',
    emoji: '⛈️',
  },
  {
    id: 'clear_all',
    keywords: ['clear', 'reset', 'remove', 'hide', 'close', 'dismiss'],
    action: 'clear',
    label: 'Clearing filters',
    emoji: '✨',
  },
  {
    id: 'show_all',
    keywords: ['show all', 'show everything', 'all stops', 'everything'],
    action: 'show_all',
    label: 'Showing all stops',
    emoji: '📍',
  },
];

/**
 * Match a transcript to the best intent.
 * Uses longest-keyword-first matching to prefer specific phrases over generic words.
 *
 * @param {string} transcript — lowercased speech text
 * @returns {{ intent: object, matched: string } | null}
 */
function matchIntent(transcript) {
  // Sort all keyword-intent pairs by keyword length (longest first)
  const candidates = [];
  for (const intent of INTENTS) {
    for (const kw of intent.keywords) {
      candidates.push({ intent, keyword: kw });
    }
  }
  candidates.sort((a, b) => b.keyword.length - a.keyword.length);

  for (const { intent, keyword } of candidates) {
    if (transcript.includes(keyword)) {
      return { intent, matched: keyword };
    }
  }

  return null;
}

/**
 * React hook providing voice command functionality.
 *
 * @param {Object} handlers — callback map for executing actions
 * @param {Function} handlers.onFilterToggle — (filterType: string) => void
 * @param {Function} handlers.onEnablePlaces — () => void
 * @param {Function} handlers.onWeatherAhead — () => void
 * @param {Function} handlers.onClearFilters — () => void
 * @param {Function} handlers.onShowAll — () => void
 * @param {Function} handlers.onSearch — (query: string) => void
 * @param {Function} handlers.onSetSearchQuery — (text: string) => void
 * @returns {Object}
 */
export default function useVoiceAssistant(handlers = {}) {
  const [isListening, setIsListening] = useState(false);
  const [lastIntent, setLastIntent] = useState(null); // { label, emoji, transcript }
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setLastIntent({ label: 'Voice not supported in this browser', emoji: '❌', transcript: '' });
      return;
    }

    // If already listening, stop
    if (isListening) {
      stopListening();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setLastIntent({ label: 'Listening...', emoji: '🎙️', transcript: '' });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('[Voice] Transcript:', transcript);

      handlers.onSetSearchQuery?.(transcript);

      // Try to match an intent
      const match = matchIntent(transcript);

      if (match) {
        const { intent, matched } = match;
        console.log(`[Voice] Matched intent: ${intent.id} (keyword: "${matched}")`);

        setLastIntent({
          label: intent.label,
          emoji: intent.emoji,
          transcript,
        });

        // Execute the action
        if (intent.filter) {
          handlers.onFilterToggle?.(intent.filter, true); // force enable
          handlers.onEnablePlaces?.();
        } else if (intent.action === 'weather_ahead') {
          handlers.onWeatherAhead?.();
        } else if (intent.action === 'clear') {
          handlers.onClearFilters?.();
        } else if (intent.action === 'show_all') {
          handlers.onShowAll?.();
        }
      } else {
        // No intent matched — fall back to search
        console.log('[Voice] No intent matched, falling back to search');
        setLastIntent({
          label: `Searching: "${transcript}"`,
          emoji: '🔍',
          transcript,
        });
        handlers.onSearch?.(transcript);
      }

      stopListening();
    };

    recognition.onerror = (event) => {
      console.warn('[Voice] Error:', event.error);
      const messages = {
        'no-speech': 'No speech detected',
        'audio-capture': 'No microphone found',
        'not-allowed': 'Microphone access denied',
        'network': 'Network error',
      };
      setLastIntent({
        label: messages[event.error] || 'Voice error',
        emoji: '⚠️',
        transcript: '',
      });
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Auto-timeout after 8 seconds
    timeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        setLastIntent({ label: 'Timed out — try again', emoji: '⏱️', transcript: '' });
        stopListening();
      }
    }, 8000);

    recognition.start();
  }, [isListening, stopListening, handlers]);

  // Clear the toast after a delay
  const clearIntent = useCallback(() => {
    setLastIntent(null);
  }, []);

  return {
    isListening,
    lastIntent,
    startListening,
    stopListening,
    clearIntent,
  };
}
