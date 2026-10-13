import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

const gemini = geminiKey
  ? new GoogleGenAI({ apiKey: geminiKey })
  : null;

const groq = groqKey
  ? new Groq({ apiKey: groqKey })
  : null;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export async function generateAIResponse(
  prompt: string,
): Promise<string> {
  let geminiError: unknown;

  // Try Gemini first.
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

      if (text) {
        console.log(
          `[AI Service] Generated response using ${GEMINI_MODEL}`,
        );
        return text;
      }

      throw new Error("Gemini returned an empty response.");
    } catch (error) {
      geminiError = error;

      console.error(
        `[AI Service] Gemini model ${GEMINI_MODEL} failed; trying Groq:`,
        error,
      );
    }
  }

  // Fall back to Groq.
  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are BrainScribe, an academic study-planning assistant. Return exactly one complete, valid JSON object. Do not use Markdown fences or explanatory text.",
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

      console.log(
        `[AI Service] Generated response using ${GROQ_MODEL}`,
      );

      return text;
    } catch (error) {
      const groqMessage =
        error instanceof Error ? error.message : String(error);

      const geminiMessage =
        geminiError instanceof Error
          ? geminiError.message
          : geminiError
            ? String(geminiError)
            : "";

      console.error("[AI Service] Groq generation failed:", error);

      throw new Error(
        `Groq generation failed: ${groqMessage}` +
          (geminiMessage
            ? ` | Gemini fallback reason: ${geminiMessage}`
            : ""),
      );
    }
  }

  throw new Error(
    "No AI provider is configured. Check GEMINI_API_KEY and GROQ_API_KEY in server/.env.",
  );
}