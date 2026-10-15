import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import OpenAI from "openai";

const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const gemini = geminiKey
  ? new GoogleGenAI({ apiKey: geminiKey })
  : null;

const groq = groqKey
  ? new Groq({
      apiKey: groqKey,
      maxRetries: 0,
      timeout: 20_000,
    })
  : null;

const openai = openaiKey
  ? new OpenAI({
      apiKey: openaiKey,
      maxRetries: 0,
      timeout: 20_000,
    })
  : null;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SYSTEM_PROMPT =
  "You are BrainScribe, an academic study-planning assistant. " +
  "Return exactly one complete, valid JSON object. " +
  "Do not use Markdown fences or explanatory text.";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function generateStudyPlanResponse(
  prompt: string,
): Promise<string> {
  if (groq) {
    try {
      const response = await groq.chat.completions.create(
        {
          model:
            process.env.GROQ_STUDY_PLAN_MODEL ||
            "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content:
                'You are BrainScribe, an academic study planner. Return only a valid JSON object with "subjects", "sessions", and "warning". Follow the requested schema exactly. Keep plans practical and concise.',
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 5000,
          response_format: { type: "json_object" },
        },
        { timeout: 25000, maxRetries: 0 },
      );

      const choice = response.choices[0];
      const text = choice?.message?.content?.trim();

      if (text && choice.finish_reason !== "length") {
        return text;
      }

      throw new Error("The fast study-plan response was empty or truncated.");
    } catch (error) {
      console.warn(
        "[AI Study Plan] Fast model failed; falling back to the existing AI service.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return generateAIResponse(prompt);
}

export async function generateSubjectExtractionResponse(
  prompt: string,
): Promise<string> {
  // Use a smaller, faster Groq model for simple subject identification.
  if (groq) {
    try {
      const response = await groq.chat.completions.create(
        {
          model:
            process.env.GROQ_SUBJECT_MODEL || "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content:
                'Identify academic course names. Return only JSON in the format {"subjects":["Course Name"]}. Do not list units or chapters.',
            },
            { role: "user", content: prompt },
          ],
          temperature: 0,
          max_tokens: 500,
          response_format: { type: "json_object" },
        },
        { timeout: 15000, maxRetries: 0 },
      );

      const text = response.choices[0]?.message?.content?.trim();

      if (text && response.choices[0]?.finish_reason !== "length") {
        console.log("[AI Service] Subject extraction completed using fast Groq model");
        return text;
      }

      throw new Error("Fast subject extraction returned an incomplete response.");
    } catch (error) {
      console.warn(
        "[AI Service] Fast subject extraction failed; using existing AI fallback.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return generateAIResponse(prompt);
}

export async function generateAIResponse(
  prompt: string,
): Promise<string> {
  const failures: string[] = [];

  // 1. Gemini — primary provider.
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      console.info(
        `[AI Service] Generated response using ${GEMINI_MODEL}`,
      );

      return text;
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push(`Gemini (${GEMINI_MODEL}): ${message}`);

      console.warn(
        `[AI Service] Gemini failed; trying Groq if configured: ${message}`,
      );
    }
  } else {
    failures.push("Gemini: API key not configured");
  }

  // 2. Groq — first fallback.
  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        response_format: {
          type: "json_object",
        },
      });

      const choice = response.choices[0];
      const text = choice?.message?.content?.trim();

      if (!text) {
        throw new Error(
          `Groq returned an empty response. Finish reason: ${
            choice?.finish_reason ?? "unknown"
          }`,
        );
      }

      if (choice.finish_reason === "length") {
        throw new Error(
          "Groq truncated its response. Try a smaller syllabus or fewer study sessions.",
        );
      }

      console.info(
        `[AI Service] Generated response using ${GROQ_MODEL}`,
      );

      return text;
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push(`Groq (${GROQ_MODEL}): ${message}`);

      console.warn(
        `[AI Service] Groq failed; trying OpenAI if configured: ${message}`,
      );
    }
  } else {
    failures.push("Groq: API key not configured");
  }

  // 3. OpenAI — final fallback.
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        response_format: {
          type: "json_object",
        },
      });

      const choice = response.choices[0];
      const text = choice?.message?.content?.trim();

      if (!text) {
        throw new Error(
          `OpenAI returned an empty response. Finish reason: ${
            choice?.finish_reason ?? "unknown"
          }`,
        );
      }

      if (choice.finish_reason === "length") {
        throw new Error(
          "OpenAI truncated its response. Try a smaller syllabus or fewer study sessions.",
        );
      }

      console.info(
        `[AI Service] Generated response using ${OPENAI_MODEL}`,
      );

      return text;
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push(`OpenAI (${OPENAI_MODEL}): ${message}`);
    }
  } else {
    failures.push("OpenAI: API key not configured");
  }

  console.error(
    "[AI Service] All configured AI providers failed.",
    failures,
  );

  throw new Error(
    `BrainScribe could not generate an AI response. ${failures.join(" | ")}`,
  );
}
