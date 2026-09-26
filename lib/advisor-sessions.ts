import {
  ADVISOR_GREETING,
  emptyCtx,
  type AdvisorCtx,
  type AdvisorField,
  type AdvisorQuestion,
} from "@/lib/advisor";

const SESSIONS_KEY = "cc_ai_advisor_sessions_v1";
const ACTIVE_KEY = "cc_ai_advisor_active_v1";

export const ADVISOR_SESSIONS_EVENT = "cc:ai-advisor-sessions";
export const MAX_SESSIONS = 20;
const MAX_MESSAGES = 80;
const TITLE_LENGTH = 42;
const NO_SESSIONS: AdvisorSession[] = [];

export interface AdvisorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
}

export interface SessionLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface AdvisorSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  ctx: AdvisorCtx;
  question: AdvisorQuestion | null;
  messages: AdvisorMessage[];
  location: SessionLocation | null;
}

const ADVISOR_FIELDS: AdvisorField[] = [
  "emi",
  "budget",
  "seats",
  "use",
  "fuel",
  "transmission",
  "running",
];

function newId(): string {
  const fallback = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function sanitizeCtx(raw: unknown): AdvisorCtx {
  if (!raw || typeof raw !== "object") return emptyCtx();
  const r = raw as Record<string, unknown>;
  const usage = r.usage;
  const newUsed = r.newUsed;
  const asked = Array.isArray(r.asked)
    ? r.asked.filter((a): a is AdvisorField => ADVISOR_FIELDS.includes(a as AdvisorField))
    : [];
  return {
    income: finite(r.income),
    emi: finite(r.emi),
    budget: finite(r.budget),
    // Sessions saved before ranges existed only carry `budget`; keep them loadable.
    budgetMin: finite(r.budgetMin) ?? finite(r.budget),
    budgetMax: finite(r.budgetMax) ?? finite(r.budget),
    down: finite(r.down),
    family: r.family === true,
    seats: finite(r.seats),
    running: finite(r.running),
    dailyKm: finite(r.dailyKm),
    usage: usage === "city" || usage === "highway" || usage === "mixed" ? usage : "",
    fuelPref: str(r.fuelPref, 40),
    transPref: str(r.transPref, 40),
    brandPref: str(r.brandPref, 60),
    modelPref: str(r.modelPref, 60),
    offroad: r.offroad === true,
    newUsed: newUsed === "new" || newUsed === "used" ? newUsed : "",
    asked: [...new Set(asked)],
  };
}

function sanitizeQuestion(raw: unknown): AdvisorQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const field = ADVISOR_FIELDS.find((f) => f === r.field);
  const body = str(r.text, 300).trim();
  if (!field || !body) return null;
  const replies = Array.isArray(r.replies)
    ? r.replies
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.slice(0, 60))
        .slice(0, 6)
    : [];
  return { field, text: body, replies };
}

function sanitizeMessage(raw: unknown): AdvisorMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const body = str(r.text).replace(/\s+/g, " ").trim();
  if (!body) return null;
  return {
    id: str(r.id, 60) || newId(),
    role: r.role === "user" ? "user" : "assistant",
    text: body,
    at: finite(r.at) ?? Date.now(),
  };
}

function sanitizeLocation(raw: unknown): SessionLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lat = finite(r.lat);
  const lng = finite(r.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng, label: str(r.label, 120) || "Saved location" };
}

function sanitizeSession(raw: unknown): AdvisorSession | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 60);
  if (!id) return null;
  const createdAt = finite(r.createdAt) ?? Date.now();
  const messages = Array.isArray(r.messages)
    ? r.messages
        .map(sanitizeMessage)
        .filter((m): m is AdvisorMessage => m != null)
        .slice(-MAX_MESSAGES)
    : [];
  return {
    id,
    title: str(r.title, TITLE_LENGTH) || "New chat",
    createdAt,
    updatedAt: finite(r.updatedAt) ?? createdAt,
    ctx: sanitizeCtx(r.ctx),
    question: sanitizeQuestion(r.question),
    messages,
    location: sanitizeLocation(r.location),
  };
}

function byRecent(a: AdvisorSession, b: AdvisorSession) {
  return b.updatedAt - a.updatedAt;
}

function titleFrom(messages: AdvisorMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const raw = (first?.text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "New chat";
  return raw.length > TITLE_LENGTH ? `${raw.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : raw;
}

export function newAdvisorSession(): AdvisorSession {
  const now = Date.now();
  return {
    id: newId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    ctx: emptyCtx(),
    question: null,
    messages: [{ id: newId(), role: "assistant", text: ADVISOR_GREETING, at: now }],
    location: null,
  };
}

export function withMessages(session: AdvisorSession, messages: AdvisorMessage[]): AdvisorSession {
  const trimmed = messages.slice(-MAX_MESSAGES);
  return {
    ...session,
    messages: trimmed,
    title: titleFrom(trimmed),
    updatedAt: Date.now(),
  };
}

export function appendMessage(
  session: AdvisorSession,
  role: AdvisorMessage["role"],
  body: string,
): AdvisorSession {
  const clean = body.replace(/\s+/g, " ").trim();
  if (!clean) return session;
  return withMessages(session, [
    ...session.messages,
    { id: newId(), role, text: clean, at: Date.now() },
  ]);
}

export function upsertSession(
  list: AdvisorSession[],
  session: AdvisorSession,
): AdvisorSession[] {
  const rest = list.filter((s) => s.id !== session.id);
  return [session, ...rest].sort(byRecent).slice(0, MAX_SESSIONS);
}

export function removeSession(list: AdvisorSession[], id: string): AdvisorSession[] {
  return list.filter((s) => s.id !== id);
}

export function activeIdFor(list: AdvisorSession[], current: string | null): string | null {
  if (current && list.some((s) => s.id === current)) return current;
  return list[0]?.id ?? null;
}

// Read-modify-write against the latest persisted list.
//
// Every turn used to commit a render-time snapshot of the session, so two overlapping turns
// (a fast double tap, a chip click racing a form submit) both wrote the same base and the later
// commit silently discarded the earlier one — that is what made a budget click look like it did
// nothing and produced duplicate assistant replies. Mutating inside this helper keeps each write
// based on the freshest stored state instead.
export function updateSession(
  id: string,
  mutate: (session: AdvisorSession) => AdvisorSession,
): AdvisorSession | null {
  const list = loadSessions();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const next = mutate(list[index]);
  saveSessions(upsertSession(list, next));
  return next;
}

export function appendToSession(
  id: string,
  role: AdvisorMessage["role"],
  body: string,
): AdvisorSession | null {
  return updateSession(id, (s) => appendMessage(s, role, body));
}

function parseSessions(raw: string | null): AdvisorSession[] {
  if (!raw) return NO_SESSIONS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return NO_SESSIONS;
    return parsed
      .map(sanitizeSession)
      .filter((s): s is AdvisorSession => s != null)
      .sort(byRecent)
      .slice(0, MAX_SESSIONS);
  } catch {
    return NO_SESSIONS;
  }
}

let cachedRaw: string | null = null;
let cachedList: AdvisorSession[] = NO_SESSIONS;

export function loadSessions(): AdvisorSession[] {
  if (typeof window === "undefined") return NO_SESSIONS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SESSIONS_KEY);
  } catch {
    return NO_SESSIONS;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  cachedList = parseSessions(raw);
  return cachedList;
}

export function getServerSessions(): AdvisorSession[] {
  return NO_SESSIONS;
}

export function saveSessions(list: AdvisorSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, MAX_SESSIONS)));
  } catch {
    // storage may be unavailable (private mode) or full
    return;
  }
  emitChange();
}

export function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function getServerActiveId(): string | null {
  return null;
}

export function saveActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // storage may be unavailable
    return;
  }
  emitChange();
}

function emitChange() {
  window.dispatchEvent(new CustomEvent(ADVISOR_SESSIONS_EVENT));
}

export function subscribeAdvisorSessions(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === SESSIONS_KEY || e.key === ACTIVE_KEY) listener();
  };
  window.addEventListener(ADVISOR_SESSIONS_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ADVISOR_SESSIONS_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
