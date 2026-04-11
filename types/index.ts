export interface MorningEntry {
  date: string;       // YYYY-MM-DD
  text: string;
  mood: string;
}

export interface ArtistDate {
  title: string;
  date: string;
  place: string;
  category: string;
  alone: boolean;
  feeling: string;
  keywords: string;
}

export interface CheckinForm {
  mpDays: number;
  adDone: boolean;
  readingFast: boolean;
  feeling: string;
  discovery: string;
  nextWeek: string;
}

export interface WeekData {
  week: number;
  theme: string;
  emoji: string;
  color: string;
  intro: string;
  questions: string[];
}

export interface WeekDay {
  key: string;   // YYYY-MM-DD
  day: string;   // 월화수목금토일
  done: boolean;
}

export interface Stats {
  streak: number;
  week: WeekDay[];
  weekCount: number;
  todayDone: boolean;
}

// Notion API request/response
export type NotionAction = "query_morning" | "query_checkin" | "create_morning" | "create_artist" | "create_checkin";

export interface NotionRequest {
  action: NotionAction;
  properties?: Record<string, unknown>;
}

export interface NotionResponse {
  success?: boolean;
  error?: string;
  entries?: MorningEntry[];
  weeks?: number[];
}
