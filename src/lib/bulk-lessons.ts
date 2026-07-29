export type BulkLessonRow = {
  module: string;
  title: string;
  durationMin: number;
  videoUrl: string | null;
};

export const CSV_TEMPLATE = `module,title,duration_min,video_url
Module 1 - Foundations,Understanding the IELTS band descriptors,12,https://example.com/lesson-1.mp4
Module 1 - Foundations,Question types at a glance,9,
Module 2 - Practice,Timed practice set A,18,https://example.com/lesson-3.mp4
`;

/** Minimal RFC-4180-ish CSV parser (handles quoted fields and embedded commas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type ParseResult = { rows: BulkLessonRow[]; errors: string[] };

export function parseBulkLessonCsv(text: string): ParseResult {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (!table.length) return { rows: [], errors: ["The file is empty."] };

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const idx = {
    module: header.indexOf("module"),
    title: header.indexOf("title"),
    duration: header.findIndex((h) => h === "duration_min" || h === "duration"),
    video: header.findIndex((h) => h === "video_url" || h === "video"),
  };
  if (idx.title === -1) return { rows: [], errors: ['Missing required "title" column.'] };

  const rows: BulkLessonRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const title = (cells[idx.title] ?? "").trim();
    if (!title) {
      errors.push(`Line ${line}: title is required.`);
      return;
    }
    const rawDuration = idx.duration === -1 ? "" : (cells[idx.duration] ?? "").trim();
    const duration = rawDuration ? Number(rawDuration) : 10;
    if (!Number.isFinite(duration) || duration <= 0) {
      errors.push(`Line ${line}: duration must be a positive number.`);
      return;
    }
    rows.push({
      module: (idx.module === -1 ? "" : (cells[idx.module] ?? "").trim()) || "Module 1",
      title,
      durationMin: Math.round(duration),
      videoUrl: (idx.video === -1 ? "" : (cells[idx.video] ?? "").trim()) || null,
    });
  });

  return { rows, errors };
}

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bandpath-lessons-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
