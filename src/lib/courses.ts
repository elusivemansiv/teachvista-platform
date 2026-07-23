export const CATEGORIES = [
  { value: "listening", label: "Listening", emoji: "🎧", color: "from-blue-500 to-indigo-500" },
  { value: "reading", label: "Reading", emoji: "📖", color: "from-orange-400 to-rose-400" },
  { value: "writing", label: "Writing", emoji: "✍️", color: "from-purple-500 to-blue-500" },
  { value: "speaking", label: "Speaking", emoji: "🗣️", color: "from-cyan-500 to-blue-500" },
  { value: "vocabulary", label: "Vocabulary", emoji: "📚", color: "from-emerald-500 to-teal-500" },
  { value: "grammar", label: "Grammar", emoji: "🔤", color: "from-fuchsia-500 to-pink-500" },
  { value: "mock_test", label: "Mock Test", emoji: "🎯", color: "from-amber-500 to-orange-500" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
export function categoryMeta(v: string) {
  return CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[0];
}

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  target_band: number | null;
  duration_hours: number;
  thumbnail_url: string | null;
  teacher_name: string;
  popularity: number;
  student_count: number;
  rating: number;
  is_trending: boolean;
  created_at: string;
};
