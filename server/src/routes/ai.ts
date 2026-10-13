
import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";
import { generateAIResponse } from "../services/aiService.js";

const router = Router();

type PlanMode = "weekly" | "daily" | "syllabus";

const DEFAULT_SUBJECTS = [
  "Data Structures",
  "Database Systems",
  "Computer Networks",
  "Operating Systems",
  "Mathematics",
];

const VALID_PRIORITIES = ["High", "Medium", "Low"] as const;

function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting JSON from surrounding text.
  }

  const start = cleaned.indexOf("{");

  if (start === -1) {
    throw new Error("AI response did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }

  throw new Error("AI response contained incomplete JSON.");
}

router.post(
  "/study-plan",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { mode, startDate, deadline, syllabusText } = req.body ?? {};

      if (!["weekly", "daily", "syllabus"].includes(mode)) {
        res.status(400).json({
          success: false,
          message: "Mode must be weekly, daily, or syllabus.",
        });
        return;
      }

      if (!isDateKey(startDate)) {
        res.status(400).json({
          success: false,
          message: "A valid startDate in YYYY-MM-DD format is required.",
        });
        return;
      }

      if (mode === "syllabus") {
        if (!isDateKey(deadline) || deadline < startDate) {
          res.status(400).json({
            success: false,
            message: "A valid deadline on or after the start date is required.",
          });
          return;
        }

        if (
          typeof syllabusText !== "string" ||
          syllabusText.trim().length < 30 ||
          syllabusText.length > 60000
        ) {
          res.status(400).json({
            success: false,
            message:
              "Syllabus text must contain between 30 and 60,000 characters.",
          });
          return;
        }
      }

      const endDate =
        mode === "daily"
          ? startDate
          : mode === "weekly"
            ? new Date(
                new Date(`${startDate}T00:00:00Z`).getTime() +
                  6 * 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10)
            : deadline;

      const syllabusInstructions =
        mode === "syllabus"
          ? `
SYLLABUS SUBJECT EXTRACTION — CRITICAL:
- Read the supplied syllabus carefully.
- Identify the actual academic subject or subjects from its title,
  headings, course name, units, and topics.
- Extract the subject names from the syllabus itself.
- Do NOT use a predefined subject list.
- Do NOT assign unrelated subjects such as Mathematics,
  Operating Systems, or Database Systems unless they actually
  appear in this syllabus.
- If the document represents one course, use that course's
  actual subject name for its relevant sessions.
- If it clearly contains multiple courses, identify each course
  separately and assign each session to the correct course.
- Use specific topics and units actually supported by the text.
- Never invent course names or syllabus chapters.
- Return a "subjects" array containing the extracted subject names.
- Every session's "subject" must exactly match one entry in "subjects".
`
          : `
SUBJECT RULES:
- Use only these subjects: ${DEFAULT_SUBJECTS.join(", ")}.
- Every session's subject must exactly match one of these names.
`;

      const prompt = `
You are BrainScribe, an academic study-planning assistant.

Create a practical study plan for this request.

Mode: ${mode}
Start date: ${startDate}
End date: ${endDate}

${syllabusInstructions}

${
  mode === "syllabus"
    ? `UPLOADED SYLLABUS:
${syllabusText}`
    : `Available subjects: ${DEFAULT_SUBJECTS.join(", ")}`
}

Requirements:
- Return ONLY a valid JSON object. No Markdown fences or explanations.
- Use this structure:
{
  "subjects": ["Actual subject name extracted from the syllabus"],
  "sessions": [
    {
      "title": "Specific topic or task",
      "subject": "Exact subject name",
      "date": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "duration": 45,
      "priority": "High",
      "notes": "Short actionable guidance"
    }
  ],
  "warning": ""
}

- In syllabus mode, "subjects" must contain the real subject names
  identified from the uploaded syllabus.
- In daily and weekly mode, "subjects" must contain the available
  default subjects.
- Every session date must fall between ${startDate} and ${endDate},
  inclusive.
- Use 24-hour HH:mm format.
- Duration must be an integer between 5 and 480 minutes.
- Priority must be High, Medium, or Low.
- Subject must exactly match an entry in the subjects array.
- Generate a manageable schedule, normally 1-4 sessions per day.
- Vary topics and include breaks between demanding study blocks.
- Prioritize important topics and distribute revision sensibly.
- If the syllabus is unclear or incomplete, explain that in warning.
- Use an empty warning string if no caveat is needed.
`;

      const rawResponse = await generateAIResponse(prompt);
      const parsed = extractJson(rawResponse) as {
        subjects?: unknown;
        sessions?: unknown;
        warning?: unknown;
      };

      let allowedSubjects: string[];

      if (mode === "syllabus") {
        if (
          !Array.isArray(parsed.subjects) ||
          parsed.subjects.length === 0 ||
          !parsed.subjects.every(
            (subject) =>
              typeof subject === "string" && subject.trim().length > 0,
          )
        ) {
          throw new Error(
            "The AI did not extract valid subject names from the syllabus.",
          );
        }

        allowedSubjects = [
          ...new Set(
            parsed.subjects.map((subject) =>
              (subject as string).trim().slice(0, 120),
            ),
          ),
        ];
      } else {
        allowedSubjects = DEFAULT_SUBJECTS;
      }

      if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
        throw new Error("The AI returned an empty study plan.");
      }

      const sessions = parsed.sessions.map((item: any) => {
        if (
          !item ||
          typeof item.title !== "string" ||
          !item.title.trim() ||
          typeof item.subject !== "string" ||
          !allowedSubjects.includes(item.subject.trim()) ||
          !isDateKey(item.date) ||
          item.date < startDate ||
          item.date > endDate ||
          typeof item.startTime !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime) ||
          typeof item.duration !== "number" ||
          !Number.isInteger(item.duration) ||
          item.duration < 5 ||
          item.duration > 480 ||
          !VALID_PRIORITIES.includes(item.priority) ||
          typeof item.notes !== "string"
        ) {
          throw new Error(
            "The AI returned a session with invalid fields or an unrecognized subject.",
          );
        }

        return {
          title: item.title.trim().slice(0, 120),
          subject: item.subject.trim(),
          date: item.date,
          startTime: item.startTime,
          duration: item.duration,
          priority: item.priority,
          notes: item.notes.slice(0, 2000),
        };
      });

      res.status(200).json({
        success: true,
        subjects: allowedSubjects,
        sessions,
        warning:
          typeof parsed.warning === "string" ? parsed.warning : "",
      });
    } catch (error) {
      console.error("[AI Study Plan] Generation failed:", error);

      const debug =
        error instanceof Error ? error.message : String(error);

      res.status(502).json({
        success: false,
        message:
          "Couldn't generate a valid study plan. Check your AI provider configuration and try again.",
        ...(process.env.NODE_ENV !== "production" ? { debug } : {}),
      });
    }
  },
);

export default router;