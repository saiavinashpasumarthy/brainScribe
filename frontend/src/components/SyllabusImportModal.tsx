import { useRef, useState, type ChangeEvent } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  LoaderCircle,
  BookOpen,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import { auth } from "../config/firebase";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


type ExtractedSubject = {
  id: string;
  fileName: string;
  name: string;
  status: "ready" | "error";
  error?: string;
};

type Props = {
  existingNames: string[];
  onClose: () => void;
  onImport: (names: string[]) => Promise<void>;
};


const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 30;



type ExtractSubjectsResponse = {
  subjects: string[];
  provider: "gemini" | "groq";
};

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

async function extractSubjectNames(
  text: string,
  fileName: string,
): Promise<ExtractSubjectsResponse> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please sign in before analyzing syllabi.");
  }

  const token = await currentUser.getIdToken();

  const response = await fetch(`${API_BASE_URL}/api/ai/extract-subjects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      syllabusText: text.slice(0, 60000),
      fileName,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "AI couldn't analyze this syllabus.",
    );
  }


const rawSubjects: unknown = data.subjects;

const subjectNames: string[] = Array.isArray(rawSubjects)
  ? rawSubjects.filter(
      (name: unknown): name is string =>
        typeof name === "string" && name.trim().length > 0,
    ).map((name: string) => name.trim())
  : [];

const subjects: string[] = Array.from(new Set<string>(subjectNames));

if (subjects.length === 0) {
  throw new Error("AI couldn't identify any subject names in this file.");
}

return {
  subjects,
  provider: data.provider,
};

}

async function readFileText(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "txt") {
    return file.text();
  }

  if (extension === "docx") {
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });

    return result.value;
  }

  if (extension === "pdf") {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pageTexts: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();

        pageTexts.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
      }
    } finally {
      const pdfDocument = pdf as typeof pdf & {
        destroy?: () => Promise<void> | void;
        cleanup?: () => Promise<void> | void;
      };

      if (typeof pdfDocument.destroy === "function") {
        await pdfDocument.destroy();
      } else if (typeof pdfDocument.cleanup === "function") {
        await pdfDocument.cleanup();
      }
    }

    return pageTexts.join("\n");
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
}

export default function SyllabusImportModal({
  existingNames,
  onClose,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ExtractedSubject[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const normalizedExisting = new Set(
    existingNames.map((name) => name.trim().toLowerCase()),
  );

  const readyItems = items.filter(
    (item) => item.status === "ready" && item.name.trim(),
  );

  const duplicateNames = new Set<string>();
  const seenNames = new Set(normalizedExisting);

  readyItems.forEach((item) => {
    const normalized = item.name.trim().toLowerCase();

    if (seenNames.has(normalized)) {
      duplicateNames.add(item.id);
    } else {
      seenNames.add(normalized);
    }
  });

  const importableItems = readyItems.filter(
    (item) => !duplicateNames.has(item.id),
  );

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!selectedFiles.length) return;

    setError("");

    const remainingSlots = MAX_FILES - items.length;

    if (remainingSlots <= 0) {
      setError(`You can review up to ${MAX_FILES} syllabus files at a time.`);
      return;
    }

    const files = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > remainingSlots) {
      setError(`Only ${remainingSlots} more file(s) can be added.`);
    }

    setProcessing(true);

    const results: ExtractedSubject[] = [];

    for (const file of files) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;

      if (file.size > MAX_FILE_SIZE) {
        results.push({
          id,
          fileName: file.name,
          name: "",
          status: "error",
          error: "File exceeds the 15 MB limit.",
        });
        continue;
      }

      try {
const text = await readFileText(file);

if (!text.trim()) {
  throw new Error(
    "No selectable text found. This may be a scanned PDF.",
  );
}

const result = await extractSubjectNames(text, file.name);

result.subjects.forEach((name, index) => {
  results.push({
    id: `${id}-${index}`,
    fileName:
      result.subjects.length > 1
        ? `${file.name} — ${name}`
        : file.name,
    name,
    status: "ready",
  });
});
      } catch (cause) {
results.push({
  id,
  fileName: file.name,
  name: "",
  status: "error",
  error:
    cause instanceof Error
      ? cause.message
      : "Could not read or analyze this file.",
});
      }
    }

    setItems((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      return [
        ...current,
        ...results.filter((item) => !existingIds.has(item.id)),
      ];
    });

    setProcessing(false);
  }

  function updateName(id: string, name: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              name,
              status: "ready",
              error: undefined,
            }
          : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function handleImport() {
    setError("");

    if (!importableItems.length) {
      setError(
        "There are no new subjects to import. Correct duplicates or upload another syllabus.",
      );
      return;
    }

    setSaving(true);

    try {
      await onImport(importableItems.map((item) => item.name.trim()));
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the subjects. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="subject-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving && !processing) {
          onClose();
        }
      }}
    >
      <section
        className="subject-modal syllabus-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="syllabus-import-title"
      >
        <div className="subject-modal-heading">
          <div>
            <span className="card-eyebrow">BUILD YOUR LEARNING LIBRARY</span>
            <h2 id="syllabus-import-title">Import from syllabi</h2>
            <p>
              Upload your subject syllabi. BrainScribe will extract candidate
              names for you to review before saving.
            </p>
          </div>

          <button
            type="button"
            className="subject-modal-close"
            aria-label="Close dialog"
            disabled={saving || processing}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          multiple
          hidden
          onChange={handleFiles}
        />

        <button
          type="button"
          className="syllabus-upload-zone"
          onClick={() => inputRef.current?.click()}
          disabled={processing || saving || items.length >= MAX_FILES}
        >
          {processing ? (
            <LoaderCircle className="syllabus-spinner" size={28} />
          ) : (
            <UploadCloud size={29} />
          )}

          <strong>
            {processing ? "Reading your syllabi..." : "Upload syllabus files"}
          </strong>

          <span>
            Click to select PDFs, DOCX, or TXT files · Up to 15 MB each
          </span>

          <span className="syllabus-upload-count">
            {items.length}/{MAX_FILES} files reviewed
          </span>
        </button>

        <div className="syllabus-review-header">
          <div>
            <h3>Review extracted subjects</h3>
            <p>Edit any name before importing it.</p>
          </div>

          <span className="chart-badge">
            {importableItems.length} ready to import
          </span>
        </div>

        {items.length > 0 ? (
          <div className="syllabus-review-list">
            {items.map((item) => {
              const duplicate = duplicateNames.has(item.id);

              return (
                <article className="syllabus-review-item" key={item.id}>
                  <span className="syllabus-file-icon">
                    <FileText size={19} />
                  </span>

                  <div className="syllabus-review-fields">
                    <strong title={item.fileName}>{item.fileName}</strong>

                    <label>
                      Subject name
                      <input
                        value={item.name}
                        onChange={(event) =>
                          updateName(item.id, event.target.value)
                        }
                        placeholder="Enter the subject name"
                        maxLength={90}
                        disabled={saving}
                      />
                    </label>

                    {item.status === "error" && (
                      <span className="syllabus-item-warning">
                        <AlertCircle size={14} />
                        {item.error}
                      </span>
                    )}

                    {item.status === "ready" && duplicate && (
                      <span className="syllabus-item-warning">
                        <AlertCircle size={14} />
                        This subject already exists or is duplicated above.
                      </span>
                    )}

                    {item.status === "ready" && !duplicate && (
                      <span className="syllabus-item-success">
                        <CheckCircle2 size={14} />
                        Ready to import
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="syllabus-remove-button"
                    aria-label={`Remove ${item.fileName}`}
                    title="Remove file"
                    disabled={saving}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="syllabus-review-empty">
            <BookOpen size={25} />
            <strong>No syllabi uploaded yet</strong>
            <span>
              Upload one syllabus per subject for the most reliable results.
            </span>
          </div>
        )}

        {error && (
          <p className="subject-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="subject-form-actions">
          <button
            type="button"
            className="secondary-subject-button"
            disabled={saving || processing}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-dashboard-button"
            disabled={
              saving || processing || importableItems.length === 0
            }
            onClick={() => void handleImport()}
          >
            {saving
              ? "Saving subjects..."
              : `Import ${importableItems.length} subject${importableItems.length === 1 ? "" : "s"}`}
            {!saving && <CheckCircle2 size={17} />}
          </button>
        </div>

        <p className="subject-demo-note">
          Nothing is saved until you choose Import. Existing subjects are
          skipped automatically.
        </p>
      </section>
    </div>
  );
}
