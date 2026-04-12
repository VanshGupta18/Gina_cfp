import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { groqPool, geminiPool } from '../ratelimit/keyPool.js';
import { runGroqQueued } from '../ratelimit/queue.js';
import type { ResultRow } from './dbExecutor.js';

export type NarratorInput = {
  question: string;
  understandingCard: string;
  primaryRows: ResultRow[];
  secondaryRows?: ResultRow[];
  autoInsights: string[];
};

/** §6.6 – System prompt: plain-English analyst; trap-aware (rates, periods, vague asks). */
const SYSTEM_PROMPT = `You are a plain English data analyst. Explain the query result clearly and concisely. Identify the main driver if decomposition data is present. Never invent numbers — use only the data provided. Use percentages (upto 2 decimal places max) where appropriate when they appear in the data.

Length: Usually 2–3 short sentences. If the user asks to summarise trends, key themes, weekly or yearly metrics, or a "year in review", you may use up to 4–5 short sentences (still plain English, no lists or markdown).

Traps to avoid:
- Partial periods: If comparing years or ranges and the result mixes a full year with a shorter window (e.g. 2025 is only part of a year), say so explicitly and do not treat raw totals as directly comparable unless the data clearly supports it; prefer describing normalised views (e.g. per week or per month) only when those values are in the result.
- Relative time ("last year", "YTD", "recent"): State your calendar assumption in one phrase (e.g. which year you mean relative to the data) and note if dataset coverage is partial.
- Vague quality ("performing well", "doing badly"): Do not answer yes/no alone. Name at least one concrete metric from the data and a comparison (e.g. vs other groups or vs another period). If the result does not support a comparison, say what is missing instead of guessing.
- Small differences: When averages or scores are close across groups, describe them as similar; do not claim a large gap unless the numbers clearly show one.
- Rates vs counts: When the user asked for a rate, per-unit, or share, describe it as such — do not imply a raw count answers a rate question.`;

function buildUserMessage(input: NarratorInput): string {
  const { question, understandingCard, primaryRows, secondaryRows, autoInsights } = input;
  return [
    `Dataset context: ${understandingCard}`,
    `User question: ${question}`,
    `Primary result: ${JSON.stringify(primaryRows.slice(0, 20))}`,
    secondaryRows && secondaryRows.length > 0
      ? `Secondary result (driver decomposition): ${JSON.stringify(secondaryRows.slice(0, 10))}`
      : 'Secondary result: null',
    autoInsights.length > 0
      ? `AutoInsights detected: ${JSON.stringify(autoInsights)}`
      : 'AutoInsights detected: none',
    '',
    'Dataset context may describe date coverage; use it when explaining time assumptions.',
    'Respond in plain English only. No markdown, no bullet points, no headers.',
  ].join('\n');
}

/** Narrator via Gemini 2.5 Flash (USE_GEMINI_NARRATOR=true). */
async function narrateWithGemini(input: NarratorInput): Promise<string> {
  const apiKey = geminiPool.next();
  const ai = new GoogleGenAI({ apiKey });
  const userMessage = buildUserMessage(input);

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }],
      },
    ],
  });

  const text = response.text ?? '';
  if (!text.trim()) throw new Error('Gemini returned empty narration');
  return text.trim();
}

/** Narrator via Groq Llama 4 Maverick (default). */
async function narrateWithGroq(input: NarratorInput): Promise<string> {
  const result = await runGroqQueued(() => {
    const groq = new Groq({ apiKey: groqPool.next() });
    return groq.chat.completions
      .create({
        model: env.GROQ_MODEL_NARRATOR,
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(input) },
        ],
      })
      .withResponse();
  });

  const text = result.choices[0]?.message?.content ?? '';
  if (!text.trim()) throw new Error('Groq narrator returned empty response');
  return text.trim();
}

/**
 * §6.6 — Generate a 2-3 sentence plain-English narration of the query result.
 * Routes to Gemini Flash when USE_GEMINI_NARRATOR=true, otherwise Groq.
 * On Gemini failure, falls back to Groq automatically.
 */
export async function generateNarration(input: NarratorInput): Promise<string> {
  if (env.USE_GEMINI_NARRATOR) {
    try {
      return await narrateWithGemini(input);
    } catch {
      // Fall back to Groq on Gemini error
      return narrateWithGroq(input);
    }
  }
  return narrateWithGroq(input);
}
