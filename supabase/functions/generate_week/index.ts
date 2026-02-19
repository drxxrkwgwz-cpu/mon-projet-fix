import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type SessionType = "speed" | "speed_endurance" | "lactate" | "tempo" | "recovery" | "strength" | "technique";
type ReferenceType = "100m" | "400m" | "1500m";

type PRs = Partial<Record<ReferenceType, number>>;

type RequestBody = {
  sessionsPerWeek?: number;
  start_date?: string;
  sport_specialty?: string;
  prs?: Record<string, number | string>;
  training_days?: string[];
  contraintes_sante?: string;
  health_constraints?: string;
  equipment?: string | string[];
  objectif?: string | { text?: string; date?: string };
  goal?: string | { text?: string; date?: string };
};

type ProfileInput = {
  start_date: string;
  sport_specialty: string;
  prs: PRs;
  training_days: string[];
  contraintes_sante: string;
  equipment: string;
  objectif: string;
};

type MainSet = {
  repetitions: number;
  distance_m: number;
  reference: ReferenceType;
  intensity_percent: number;
  recovery_seconds: number;
  target_time_seconds?: number;
  target_time_text?: string;
  tolerance_seconds?: number;
};

type WeekSession = {
  id: string;
  date: string;
  title: string;
  type: SessionType;
  duration_minutes: number;
  main_set: MainSet;
  warmup: string;
  cooldown: string;
  technical_focus: string[];
};

type WeekPlan = {
  week: {
    start_date: string;
    sessions: WeekSession[];
  };
};

const DAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SESSION_TYPES: SessionType[] = ["speed", "speed_endurance", "lactate", "tempo", "recovery", "strength", "technique"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  const contentLength = req.headers.get("content-length");
  if (!contentLength || Number(contentLength) === 0) return {};

  const raw = await req.text();
  if (!raw || raw.trim().length === 0) return {};

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_json_body");
  }
  return parsed as Record<string, unknown>;
}

function formatISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function getMondayOfCurrentWeek(today = new Date()) {
  const d = new Date(today);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizePRs(value: unknown): PRs {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const prs: PRs = {};

  for (const key of ["100m", "400m", "1500m"] as const) {
    const candidate = input[key] ?? input[key.replace("m", "")];
    const n = typeof candidate === "string" ? Number(candidate.replace(",", ".")) : Number(candidate);
    if (Number.isFinite(n) && n > 0) prs[key] = n;
  }

  if (!prs["400m"] && !prs["100m"] && !prs["1500m"]) {
    prs["400m"] = 60;
  }

  return prs;
}

function normalizeProfile(profile: Record<string, unknown>, body: RequestBody): ProfileInput {
  const objectiveInput = body.objectif ?? body.goal ?? profile.goal ?? "";
  const objectiveText = typeof objectiveInput === "string"
    ? objectiveInput
    : [objectiveInput?.text, objectiveInput?.date].filter(Boolean).join(" | ");

  const equipmentRaw = body.equipment ?? profile.equipment ?? "";
  const equipment = Array.isArray(equipmentRaw) ? equipmentRaw.join(", ") : String(equipmentRaw || "");

  const trainingDaysRaw = body.training_days ?? profile.days ?? ["Mon", "Tue", "Thu", "Sat"];
  const training_days = Array.isArray(trainingDaysRaw)
    ? trainingDaysRaw.map((d) => String(d || "")).filter(Boolean).slice(0, 6)
    : ["Mon", "Tue", "Thu", "Sat"];

  const start_date = isISODate(body.start_date) ? body.start_date : formatISODate(getMondayOfCurrentWeek(new Date()));

  const sport_specialty = String(body.sport_specialty ?? profile.sport_specialty ?? "400m").trim() || "400m";
  const prs = normalizePRs(body.prs ?? profile.prs ?? {});

  return {
    start_date,
    sport_specialty,
    prs,
    training_days,
    contraintes_sante: String(body.contraintes_sante ?? body.health_constraints ?? profile.health_constraints ?? ""),
    equipment,
    objectif: objectiveText || "Améliorer la performance 400m",
  };
}

function containsRelay(value: string): boolean {
  return /\brelais\b|\brelay\b/i.test(value);
}

function chooseReference(preferred: ReferenceType, prs: PRs): ReferenceType {
  if (prs[preferred]) return preferred;
  if (prs["400m"]) return "400m";
  if (prs["100m"]) return "100m";
  return "1500m";
}

export function getReferenceDistance(reference: ReferenceType): number {
  if (reference === "100m") return 100;
  if (reference === "400m") return 400;
  return 1500;
}

export function calcTargetTime(distance_m: number, reference: ReferenceType, intensity_percent: number, prs: PRs): number {
  const resolvedRef = chooseReference(reference, prs);
  const prSeconds = prs[resolvedRef] || 60;

  const v_ref = getReferenceDistance(resolvedRef) / prSeconds;
  const v_target = v_ref * (intensity_percent / 100);
  const raw = distance_m / v_target;

  const precision = distance_m <= 300 ? 0.1 : 0.5;
  return Math.round(raw / precision) * precision;
}

export function calcTolerance(type: SessionType): number {
  if (type === "speed") return 0.3;
  if (type === "speed_endurance") return 0.8;
  if (type === "lactate") return 1.0;
  if (type === "tempo") return 1.5;
  if (type === "recovery") return 2.0;
  return 1.0;
}

function buildPrompt(profile: ProfileInput, retryReason: string | null) {
  const retryBlock = retryReason ? `\nRETRY_REASON: ${retryReason}\n` : "";

  return `
Tu es un coach spécialiste 400m.
Tu dois répondre UNIQUEMENT en JSON strict valide (aucun texte hors JSON).
${retryBlock}
RÈGLES OBLIGATOIRES:
- Discipline ciblée: 400m uniquement.
- Ne propose jamais de relais.
- 1 semaine = 4 à 6 séances maximum (avec récupération).
- Chaque séance doit être claire: warmup + main_set + cooldown.
- main_set doit contenir UNIQUEMENT: repetitions, distance_m, reference, intensity_percent, recovery_seconds.
- N'ajoute jamais de champ vide.
- Ne calcule jamais de chrono.
- N'ajoute jamais target_time_seconds, target_time_text, tolerance_seconds.
- N'ajoute jamais de repères d'effort.
- Si PR manquante: priorité référence 400m puis 100m puis 1500m.

FORMAT JSON EXACT:
{
  "week": {
    "start_date": "YYYY-MM-DD",
    "sessions": [
      {
        "id": "string",
        "date": "YYYY-MM-DD",
        "title": "string",
        "type": "speed|speed_endurance|lactate|tempo|recovery|strength|technique",
        "duration_minutes": 60,
        "main_set": {
          "repetitions": 6,
          "distance_m": 200,
          "reference": "400m",
          "intensity_percent": 92,
          "recovery_seconds": 180
        },
        "warmup": "string clair",
        "cooldown": "string clair",
        "technical_focus": ["string", "string"]
      }
    ]
  }
}

PROFIL:
${JSON.stringify(profile)}
`.trim();
}

async function callOpenAI(prompt: string): Promise<WeekPlan> {
  if (!OPENAI_API_KEY) throw new Error("missing_openai_api_key");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Tu es un coach expert 400m. Réponds seulement en JSON strict sans texte hors JSON.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const raw = await resp.text();
  if (!resp.ok) throw new Error(`openai_error status=${resp.status} body=${raw}`);

  const data = safeJsonParse(raw);
  const content = data?.choices?.[0]?.message?.content ?? null;
  if (!content) throw new Error(`openai_empty_content raw=${raw}`);

  const parsed = safeJsonParse(String(content));
  if (!parsed) throw new Error(`openai_non_json_content content=${content}`);

  return parsed as WeekPlan;
}

function validateAndComputeWeek(candidate: WeekPlan, profile: ProfileInput): WeekPlan | null {
  if (!candidate || typeof candidate !== "object") return null;
  if (!candidate.week || !Array.isArray(candidate.week.sessions)) return null;
  if (!isISODate(candidate.week.start_date)) return null;

  if (candidate.week.sessions.length < 1 || candidate.week.sessions.length > 6) return null;

  const sessions: WeekSession[] = [];

  for (const [index, sessionRaw] of candidate.week.sessions.entries()) {
    if (!sessionRaw || typeof sessionRaw !== "object") return null;
    if (!isISODate(sessionRaw.date)) return null;

    const type = sessionRaw.type as SessionType;
    if (!SESSION_TYPES.includes(type)) return null;

    const title = String(sessionRaw.title || "").trim();
    if (!title || containsRelay(title)) return null;

    const warmup = String(sessionRaw.warmup || "").trim();
    const cooldown = String(sessionRaw.cooldown || "").trim();
    if (!warmup || !cooldown) return null;

    const technical_focus = Array.isArray(sessionRaw.technical_focus)
      ? sessionRaw.technical_focus.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    if (technical_focus.length < 1) return null;

    const mainSetRaw = sessionRaw.main_set as MainSet;
    if (!mainSetRaw || typeof mainSetRaw !== "object") return null;

    if (!(Number(mainSetRaw.repetitions) > 0)) return null;
    if (!(Number(mainSetRaw.distance_m) > 0)) return null;
    if (!(Number(mainSetRaw.recovery_seconds) >= 0)) return null;
    if (!(Number(mainSetRaw.intensity_percent) >= 70 && Number(mainSetRaw.intensity_percent) <= 105)) return null;

    const requestedRef = ["100m", "400m", "1500m"].includes(String(mainSetRaw.reference))
      ? mainSetRaw.reference
      : "400m";

    const finalRef = chooseReference(requestedRef as ReferenceType, profile.prs);
    const targetTime = calcTargetTime(Number(mainSetRaw.distance_m), finalRef, Number(mainSetRaw.intensity_percent), profile.prs);

    const sessionText = JSON.stringify(sessionRaw);
    if (containsRelay(sessionText) || /effort_markers|rpe|breathing|heart/i.test(sessionText)) return null;

    sessions.push({
      id: String(sessionRaw.id || `session-${index + 1}`),
      date: sessionRaw.date,
      title,
      type,
      duration_minutes: Number(sessionRaw.duration_minutes) || 60,
      main_set: {
        repetitions: Number(mainSetRaw.repetitions),
        distance_m: Number(mainSetRaw.distance_m),
        reference: finalRef,
        intensity_percent: Number(mainSetRaw.intensity_percent),
        recovery_seconds: Number(mainSetRaw.recovery_seconds),
        target_time_seconds: targetTime,
        target_time_text: `${Number(mainSetRaw.distance_m)}m en ${targetTime.toFixed(1)}`,
        tolerance_seconds: calcTolerance(type),
      },
      warmup,
      cooldown,
      technical_focus,
    });
  }

  return {
    week: {
      start_date: candidate.week.start_date,
      sessions,
    },
  };
}

function getDatesFromTrainingDays(startDate: string, trainingDays: string[]): string[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const normalizedDays = trainingDays
    .map((day) => String(day || "").trim().slice(0, 3).toLowerCase())
    .map((day) => DAY_INDEX[day])
    .filter((v): v is number => typeof v === "number");

  const uniqueDays = [...new Set(normalizedDays)].sort((a, b) => a - b);
  const days = uniqueDays.length ? uniqueDays : [1, 2, 4, 6];

  return days.map((dayNumber) => {
    const d = new Date(start);
    const diff = (dayNumber - start.getUTCDay() + 7) % 7;
    d.setUTCDate(start.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
  });
}

function buildFallbackWeek(profile: ProfileInput): WeekPlan {
  const dates = getDatesFromTrainingDays(profile.start_date, profile.training_days).slice(0, 4);
  const types: SessionType[] = ["speed", "speed_endurance", "tempo", "recovery"];

  return {
    week: {
      start_date: profile.start_date,
      sessions: dates.map((date, i) => {
        const type = types[i % types.length];
        const distance = type === "speed" ? 120 : type === "speed_endurance" ? 250 : type === "tempo" ? 300 : 150;
        const intensity = type === "speed" ? 95 : type === "speed_endurance" ? 90 : type === "tempo" ? 84 : 75;
        const reference = chooseReference("400m", profile.prs);
        const targetTime = calcTargetTime(distance, reference, intensity, profile.prs);

        return {
          id: `fallback-${i + 1}`,
          date,
          title: `Séance ${i + 1} ${type}`,
          type,
          duration_minutes: type === "recovery" ? 45 : 70,
          main_set: {
            repetitions: type === "recovery" ? 6 : 5,
            distance_m: distance,
            reference,
            intensity_percent: intensity,
            recovery_seconds: type === "recovery" ? 90 : 180,
            target_time_seconds: targetTime,
            target_time_text: `${distance}m en ${targetTime.toFixed(1)}`,
            tolerance_seconds: calcTolerance(type),
          },
          warmup: "15 min footing + mobilité dynamique + gammes de course.",
          cooldown: "10 min retour au calme + mobilité légère.",
          technical_focus: ["Posture haute", "Relâchement des épaules"],
        };
      }),
    },
  };
}

async function generateWeekValidated(profile: ProfileInput): Promise<WeekPlan> {
  const firstPrompt = buildPrompt(profile, null);
  const firstRaw = await callOpenAI(firstPrompt);
  const firstValidated = validateAndComputeWeek(firstRaw, profile);
  if (firstValidated) return firstValidated;

  const retryPrompt = buildPrompt(profile, "Réponse invalide/incomplète: respecte STRICTEMENT le schéma et les contraintes.");
  const retryRaw = await callOpenAI(retryPrompt);
  const retryValidated = validateAndComputeWeek(retryRaw, profile);
  if (retryValidated) return retryValidated;

  console.warn("[generate_week] Fallback utilisé après 2 réponses IA invalides.");
  return buildFallbackWeek(profile);
}

function getDayKeyFromDate(dateIso: string): DayKey {
  const d = new Date(`${dateIso}T00:00:00`);
  const jsDay = d.getDay();
  const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
  return DAY_KEYS[mondayIndex];
}

function transformWeekSessionToPlan(session: WeekSession, dayKey: DayKey) {
  return {
    type: "Entrainement",
    dayKey,
    focus: session.technical_focus,
    intensity: `${session.main_set.intensity_percent}%`,
    sessionType: session.type,
    intervals: {
      reps: session.main_set.repetitions,
      label: `${session.main_set.repetitions} x ${session.main_set.distance_m}m`,
    },
    description: `${session.type} basé ${session.main_set.reference}`,
    duration: `${session.duration_minutes} min`,
    warmup: {
      description: session.warmup,
      zone: "—",
    },
    warmupDuration: "15 min",
    main: {
      title: `${session.main_set.repetitions} x ${session.main_set.distance_m}m`,
      description: session.technical_focus.join(" · "),
      pace: `${session.main_set.intensity_percent}% (${session.main_set.reference})`,
      recovery: `${session.main_set.recovery_seconds}s`,
      volume: `${(session.main_set.repetitions * session.main_set.distance_m) / 1000} km`,
      target_time_seconds: session.main_set.target_time_seconds,
      target_time_text: session.main_set.target_time_text,
      tolerance_seconds: session.main_set.tolerance_seconds,
    },
    cooldown: {
      description: session.cooldown,
    },
    cooldownDuration: "10 min",
    coachAdvice: "Reste régulier et propre techniquement.",
    _raw_week_session: session,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server misconfigured (missing Supabase env vars)" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const user_id = userData.user.id;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let body: Record<string, unknown> = {};
    try {
      body = await readJsonBody(req);
    } catch (e) {
      if (String((e as { message?: string })?.message || e) === "invalid_json_body") {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
      throw e;
    }

    console.log("[generate_week] payload reçu:", JSON.stringify(body));

    let profile: Record<string, unknown> | null = null;

    {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!error && data) profile = data as Record<string, unknown>;
    }

    if (!profile) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user_id)
        .maybeSingle();

      if (!error && data) profile = data as Record<string, unknown>;
    }

    if (!profile) {
      return jsonResponse(
        {
          error: "Profile not found",
          details: "Aucune ligne dans profiles avec user_id = auth.user.id (ni id = auth.user.id).",
          user_id,
        },
        404,
      );
    }

    const normalizedProfile = normalizeProfile(profile, body as RequestBody);
    console.log("[generate_week] PRs utilisées:", JSON.stringify(normalizedProfile.prs));

    const monday = isISODate(normalizedProfile.start_date)
      ? new Date(`${normalizedProfile.start_date}T00:00:00`)
      : getMondayOfCurrentWeek(new Date());
    const weekId = `${user_id}-${formatISODate(monday)}`;

    const { error: delErr } = await supabaseAdmin
      .from("workouts")
      .delete()
      .eq("user_id", user_id)
      .eq("week_id", weekId);

    if (delErr) {
      console.error("Delete error:", delErr);
      return jsonResponse({ error: "Database delete failed", details: delErr.message }, 500);
    }

    const weekPlan = await generateWeekValidated(normalizedProfile);

    const inserts: Record<string, unknown>[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateIso = formatISODate(date);
      const dayKey = dayKeyFromDateIndex(i);

      const session = weekPlan.week.sessions.find((s) => s.date === dateIso);

      if (!session) {
        inserts.push({
          user_id,
          workout_date: dateIso,
          title: "Repos",
          status: "planned",
          plan: { type: "Repos", dayKey },
          week_id: weekId,
          category: "rest",
        });
        continue;
      }

      console.log(
        `[generate_week] séance ${session.date} | ${session.title} | ${session.main_set.distance_m}m | ${session.main_set.intensity_percent}% | ${session.main_set.target_time_text}`,
      );

      inserts.push({
        user_id,
        workout_date: dateIso,
        title: session.title,
        status: "planned",
        plan: transformWeekSessionToPlan(session, getDayKeyFromDate(session.date)),
        week_id: weekId,
        category: "training",
      });
    }

    const { error: insertError } = await supabaseAdmin.from("workouts").insert(inserts);
    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonResponse({ error: "Database insert failed", details: insertError.message }, 500);
    }

    return jsonResponse({
      success: true,
      week_id: weekId,
      inserted: inserts.length,
      week: weekPlan.week,
    });
  } catch (err) {
    console.error("generate_week error:", err);
    return jsonResponse({ error: String((err as { message?: string })?.message || err) }, 500);
  }
});

function dayKeyFromDateIndex(i: number): DayKey {
  return DAY_KEYS[i] || "mon";
}
