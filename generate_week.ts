import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

type JsonMap = Record<string, unknown>;

type WeekDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const WEEK_DAY_KEYS: WeekDayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_ALIASES: Record<WeekDayKey, string[]> = {
  mon: ["mon", "monday", "lundi", "lun"],
  tue: ["tue", "tuesday", "mardi", "mar"],
  wed: ["wed", "wednesday", "mercredi", "mer"],
  thu: ["thu", "thursday", "jeudi", "jeu"],
  fri: ["fri", "friday", "vendredi", "ven"],
  sat: ["sat", "saturday", "samedi", "sam"],
  sun: ["sun", "sunday", "dimanche", "dim"],
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NormalizedProfile = {
  sport_specialty: string;
  disciplines: string[];
  prs: Record<string, string | number>;
  level: string;
  frequency_per_week: number;
  duration_pref: string;
  training_pref: string;
  days: string[];
  equipment: string[];
  health_constraints: string;
  fatigue_baseline: string;
  goal: unknown;
  other_prefs: string;
  coach_name: string;
  coach_calls_you: string;
};

type SessionSet = {
  reps: number;
  distance: string;
  target_time?: string;
  recovery: string;
  goal: string;
};

type SessionBlock = {
  name: string;
  sets: SessionSet[];
};

type SessionWarmup = {
  duration: string;
  content: string;
};

type AiDay = {
  title: string;
  isRest: boolean;
  duration?: string;
  intensity?: string;
  physiological_focus?: string;
  explanation?: string;
  warmup?: SessionWarmup;
  blocks?: SessionBlock[];
};

type AiWeek = {
  days: Record<WeekDayKey, AiDay>;
};

type DisciplineKind = "sprint" | "endurance" | "running_other" | "other";

type PaceContext = {
  pr_key: string;
  pr_seconds: number;
  sport_specialty: string;
  discipline_kind: DisciplineKind;
  is_running: boolean;
  base_distance_m?: number;
  calculated_targets: Record<string, string>;
  dynamic_example: string;
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

async function readJsonBody(req: Request): Promise<JsonMap> {
  const contentLength = req.headers.get("content-length");
  if (!contentLength || Number(contentLength) === 0) return {};

  const raw = await req.text();
  if (!raw || raw.trim().length === 0) return {};

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_json_body");
  }

  return parsed as JsonMap;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string");
}

function toRecord(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => typeof v === "string" || typeof v === "number",
    ),
  );
}

function normalizeProfile(input: unknown): NormalizedProfile {
  const src = input && typeof input === "object" ? (input as JsonMap) : {};

  const disciplines = toStringArray(src.disciplines);
  const frequency = Number(src.frequency_per_week ?? 0);

  return {
    sport_specialty: String(src.sport_specialty ?? disciplines[0] ?? "").trim(),
    disciplines,
    prs: toRecord(src.prs),
    level: String(src.level ?? "").trim(),
    frequency_per_week: Number.isFinite(frequency) && frequency > 0 ? frequency : 0,
    duration_pref: String(src.duration_pref ?? "").trim(),
    training_pref: String(src.training_pref ?? "").trim(),
    days: toStringArray(src.days),
    equipment: toStringArray(src.equipment),
    health_constraints: String(src.health_constraints ?? "").trim(),
    fatigue_baseline: String(src.fatigue_baseline ?? "").trim(),
    goal: src.goal ?? null,
    other_prefs: String(src.other_prefs ?? "").trim(),
    coach_name: String(src.coach_name ?? "Coach").trim() || "Coach",
    coach_calls_you: String(src.coach_calls_you ?? "Athlete").trim() || "Athlete",
  };
}

function normalizeDisciplineKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDistanceMeters(label: string): number | null {
  const normalized = label.toLowerCase().trim();

  const meterMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*m\b/);
  if (meterMatch) return Number(meterMatch[1].replace(",", "."));

  const kmMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*k(?:m)?\b/);
  if (kmMatch) return Number(kmMatch[1].replace(",", ".")) * 1000;

  const named: Record<string, number> = {
    marathon: 42195,
    semi: 21097.5,
    halfmarathon: 21097.5,
    mile: 1609.34,
  };

  const key = normalizeDisciplineKey(normalized);
  return named[key] ?? null;
}

function parseTimeToSeconds(raw: string | number): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  const txt = raw.trim().toLowerCase().replace(",", ".");
  if (!txt) return null;

  if (/^\d+(?:\.\d+)?$/.test(txt)) {
    const value = Number(txt);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const mmss = txt.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
  if (mmss) {
    const min = Number(mmss[1]);
    const sec = Number(mmss[2]);
    const frac = mmss[3] ? Number(`0.${mmss[3]}`) : 0;
    return min * 60 + sec + frac;
  }

  const withUnits = txt.match(/(?:(\d+)\s*min)?\s*(\d+(?:\.\d+)?)\s*s?/);
  if (withUnits) {
    const min = Number(withUnits[1] ?? 0);
    const sec = Number(withUnits[2]);
    const total = min * 60 + sec;
    return Number.isFinite(total) && total > 0 ? total : null;
  }

  return null;
}

function formatSeconds(sec: number): string {
  return `${sec.toFixed(1)}s`;
}

function formatRangeSeconds(minSec: number, maxSec: number): string {
  return `${minSec.toFixed(1)}-${maxSec.toFixed(1)}s`;
}

function computePaceFromPR(prSeconds: number, percentage: number): number {
  if (!Number.isFinite(prSeconds) || prSeconds <= 0) throw new Error("invalid_pr_seconds");
  if (!Number.isFinite(percentage) || percentage <= 0) throw new Error("invalid_percentage");
  return prSeconds / percentage;
}

function inferDisciplineKind(sportSpecialty: string, distanceMeters: number | null): DisciplineKind {
  const s = sportSpecialty.toLowerCase();
  if (distanceMeters && distanceMeters <= 400) return "sprint";
  if (distanceMeters && distanceMeters >= 5000) return "endurance";
  if (/(100|200|400)\s*m/.test(s)) return "sprint";
  if (/(5\s*k|10\s*k|semi|marathon)/.test(s)) return "endurance";
  if (/(m|km|mile)/.test(s)) return "running_other";
  return "other";
}

function buildPaceContext(profile: NormalizedProfile): PaceContext | null {
  const specialty = profile.sport_specialty;
  const specialtyKey = normalizeDisciplineKey(specialty);

  let matchedKey = "";
  let matchedValue: string | number | null = null;

  for (const [k, v] of Object.entries(profile.prs)) {
    if (normalizeDisciplineKey(k) === specialtyKey) {
      matchedKey = k;
      matchedValue = v;
      break;
    }
  }

  if (!matchedValue) {
    for (const [k, v] of Object.entries(profile.prs)) {
      if (specialtyKey.includes(normalizeDisciplineKey(k)) || normalizeDisciplineKey(k).includes(specialtyKey)) {
        matchedKey = k;
        matchedValue = v;
        break;
      }
    }
  }

  if (!matchedValue) return null;

  const prSeconds = parseTimeToSeconds(matchedValue);
  if (!prSeconds) return null;

  const distance = parseDistanceMeters(specialty) ?? parseDistanceMeters(matchedKey);
  const kind = inferDisciplineKind(specialty, distance);
  const isRunning = kind !== "other";

  const calculatedTargets: Record<string, string> = {};
  let dynamicExample = "Example for athlete: quality session based on PR pace";

  if (isRunning) {
    if (kind === "sprint") {
      const d = distance && distance > 0 ? distance : 400;
      const secPerMeter = prSeconds / d;
      const speedEndurance = computePaceFromPR(prSeconds, 0.95);
      const lactateFast = computePaceFromPR(prSeconds, 0.94);
      const lactateSlow = computePaceFromPR(prSeconds, 0.9);
      const maxSpeed150 = computePaceFromPR(secPerMeter * 150, 1.05);
      const tempo200 = computePaceFromPR(secPerMeter * 200, 0.88);

      calculatedTargets.speed_endurance = formatSeconds(speedEndurance);
      calculatedTargets.lactate = formatRangeSeconds(lactateFast, lactateSlow);
      calculatedTargets.max_speed_150m = formatSeconds(maxSpeed150);
      calculatedTargets.tempo_200m = formatSeconds(tempo200);

      const repDistance = Math.max(120, Math.min(300, Math.round(d / 2 / 10) * 10));
      const repTime = computePaceFromPR(secPerMeter * repDistance, 0.92);
      dynamicExample = `Example for sprint athlete: 2x(3x${repDistance}m @ ${formatSeconds(repTime)})`;
    } else if (kind === "endurance") {
      calculatedTargets.threshold = formatSeconds(computePaceFromPR(prSeconds, 0.9));
      calculatedTargets.tempo = formatSeconds(computePaceFromPR(prSeconds, 0.85));
      calculatedTargets.easy = formatSeconds(computePaceFromPR(prSeconds, 0.78));
      dynamicExample = "Example for endurance athlete: 5x1000m @ threshold pace";
    } else {
      calculatedTargets.controlled_fast = formatSeconds(computePaceFromPR(prSeconds, 0.92));
      calculatedTargets.controlled_aerobic = formatSeconds(computePaceFromPR(prSeconds, 0.82));
      dynamicExample = "Example for running athlete: mixed pace session based on PR";
    }
  }

  return {
    pr_key: matchedKey,
    pr_seconds: prSeconds,
    sport_specialty: specialty,
    discipline_kind: kind,
    is_running: isRunning,
    base_distance_m: distance ?? undefined,
    calculated_targets: calculatedTargets,
    dynamic_example: dynamicExample,
  };
}

function normalizeDayKey(raw: string): WeekDayKey | null {
  const key = raw.toLowerCase().trim();
  for (const wk of WEEK_DAY_KEYS) {
    if (DAY_ALIASES[wk].includes(key)) return wk;
  }
  return null;
}

function resolveAllowedTrainingDays(days: string[]): WeekDayKey[] {
  const resolved = new Set<WeekDayKey>();
  for (const d of days) {
    const key = normalizeDayKey(d);
    if (key) resolved.add(key);
  }
  return [...resolved];
}

function formatISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayOfCurrentWeek(today = new Date()) {
  const d = new Date(today);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildPrompt(profile: NormalizedProfile, sessionsPerWeek: number, paceCtx: PaceContext | null, allowedDays: WeekDayKey[]) {
  const isSprint = paceCtx?.discipline_kind === "sprint";
  const isEndurance = paceCtx?.discipline_kind === "endurance";

  const sprintRules = isSprint
    ? `
Sprint-specific constraints (MANDATORY):
- Priority order in the week: max speed, speed endurance, lactate tolerance, technique, starts/accelerations.
- Include specific 300m-350m work when relevant to goal (e.g. 400m progression goal).
- NEVER output generic VMA workouts (e.g. "10x200m VMA") or 10k-runner sessions.
- Every set in blocks MUST include target_time.
`
    : "";

  const enduranceRules = isEndurance
    ? "- Endurance specialty detected: VMA-style intervals are allowed when coherent with profile and fatigue."
    : "- If not endurance specialty, do not use generic VMA templates.";

  return `
You are a high-performance coach generating a STRICT JSON weekly plan.
Return ONLY valid JSON with this exact shape:
{
  "days": {
    "mon": {
      "title": "Session title",
      "isRest": false,
      "warmup": { "duration": "15 min", "content": "..." },
      "blocks": [
        {
          "name": "Bloc principal",
          "sets": [
            {
              "reps": 3,
              "distance": "200m",
              "target_time": "28.5s",
              "recovery": "2min",
              "goal": "Speed endurance"
            }
          ]
        }
      ],
      "intensity": "...",
      "duration": "...",
      "physiological_focus": "...",
      "explanation": "Pourquoi cette séance est cohérente avec son niveau"
    }
  }
}

Hard rules:
- Exactly ${sessionsPerWeek} training days (isRest=false).
- Training days MUST be only from this allowed set: ${JSON.stringify(allowedDays)}.
- Other days must be rest: { "title": "Repos", "isRest": true }.
- For training day, warmup + blocks are mandatory.
- Each set must include reps, distance, recovery, goal.
- Use fatigue_baseline and goal to modulate load/progression.
- Keep sessions coherent with profile.duration_pref and frequency.
${enduranceRules}
${sprintRules}

Backend-calculated context (must use this, do not invent paces):
${JSON.stringify(
  paceCtx
    ? {
        pr_reference_key: paceCtx.pr_key,
        pr_seconds: Number(paceCtx.pr_seconds.toFixed(2)),
        sport_specialty: paceCtx.sport_specialty,
        discipline_kind: paceCtx.discipline_kind,
        calculated_targets: paceCtx.calculated_targets,
        dynamic_example: paceCtx.dynamic_example,
      }
    : {
        pr_seconds: null,
        note: "No reliable PR parsed. Keep target prescriptions qualitative and conservative.",
      },
  null,
  2,
)}

Athlete profile:
${JSON.stringify(profile, null, 2)}
`;
}

async function callOpenAI(prompt: string) {
  if (!OPENAI_API_KEY) throw new Error("missing_openai_api_key");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an elite sports-programming AI. Output ONLY strict JSON with required fields and no markdown.",
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

  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed !== "object") throw new Error(`openai_non_json_content content=${content}`);

  return parsed as AiWeek;
}

function validateAiWeek(aiWeek: AiWeek, sessionsPerWeek: number, allowedDays: WeekDayKey[], requiresTargetTime: boolean) {
  if (!aiWeek || typeof aiWeek !== "object" || !aiWeek.days) {
    throw new Error("validation_failed: missing days object");
  }

  const allowed = new Set<WeekDayKey>(allowedDays);
  let trainingCount = 0;

  for (const wk of WEEK_DAY_KEYS) {
    const day = aiWeek.days[wk];
    if (!day || typeof day !== "object") {
      throw new Error(`validation_failed: missing day '${wk}'`);
    }

    const isRest = Boolean(day.isRest);
    if (!isRest) {
      trainingCount += 1;
      if (!allowed.has(wk)) {
        throw new Error(`validation_failed: training day '${wk}' not in profile.days`);
      }

      if (!day.warmup || !day.blocks || !Array.isArray(day.blocks) || day.blocks.length === 0) {
        throw new Error(`validation_failed: day '${wk}' missing warmup or blocks`);
      }

      for (const block of day.blocks) {
        if (!block?.sets || !Array.isArray(block.sets) || block.sets.length === 0) {
          throw new Error(`validation_failed: day '${wk}' block missing sets`);
        }

        for (const set of block.sets) {
          if (
            typeof set?.reps !== "number" ||
            !set.distance ||
            !set.recovery ||
            !set.goal
          ) {
            throw new Error(`validation_failed: day '${wk}' set missing mandatory fields`);
          }

          if (requiresTargetTime && !set.target_time) {
            throw new Error(`validation_failed: day '${wk}' set missing target_time for sprint discipline`);
          }
        }
      }
    }
  }

  if (trainingCount !== sessionsPerWeek) {
    throw new Error(`validation_failed: expected ${sessionsPerWeek} training days, got ${trainingCount}`);
  }
}

function transformAiDayToPlan(day: AiDay) {
  if (day.isRest) {
    return {
      type: "Repos",
      title: "Repos",
    };
  }

  return {
    type: "Entrainement",
    title: day.title,
    warmup: day.warmup,
    blocks: day.blocks,
    intensity: day.intensity ?? "À définir",
    duration: day.duration ?? "À définir",
    physiological_focus: day.physiological_focus ?? "À définir",
    explanation: day.explanation ?? "",
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

    let body: JsonMap = {};
    try {
      body = await readJsonBody(req);
    } catch (e) {
      if (String((e as Error)?.message || e) === "invalid_json_body") {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
      throw e;
    }

    const bodyProfile = body.profile;
    let profile: NormalizedProfile;

    if (bodyProfile && typeof bodyProfile === "object") {
      profile = normalizeProfile(bodyProfile);
    } else {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (error || !data) {
        return jsonResponse(
          {
            error: "Profile not found",
            details: "Aucune ligne dans profiles avec user_id = auth.user.id.",
            user_id,
          },
          404,
        );
      }

      profile = normalizeProfile(data);
    }

    const requestedSessions = Number(body.sessionsPerWeek ?? profile.frequency_per_week ?? 0);
    const sessionsPerWeek = Number.isFinite(requestedSessions) && requestedSessions > 0
      ? Math.floor(requestedSessions)
      : 0;

    if (sessionsPerWeek <= 0 || sessionsPerWeek > 7) {
      throw new Error("invalid_sessions_per_week");
    }

    const allowedDays = resolveAllowedTrainingDays(profile.days);
    if (allowedDays.length === 0) {
      throw new Error("invalid_profile_days: no valid training days");
    }

    if (sessionsPerWeek > allowedDays.length) {
      throw new Error("invalid_profile_days: frequency_per_week exceeds available profile.days");
    }

    const paceCtx = buildPaceContext(profile);
    const prompt = buildPrompt(profile, sessionsPerWeek, paceCtx, allowedDays);
    const aiWeek = await callOpenAI(prompt);

    validateAiWeek(aiWeek, sessionsPerWeek, allowedDays, paceCtx?.discipline_kind === "sprint");

    const monday = getMondayOfCurrentWeek(new Date());
    const weekId = `${user_id}-${formatISODate(monday)}`;

    const { error: delErr } = await supabaseAdmin
      .from("workouts")
      .delete()
      .eq("user_id", user_id)
      .eq("week_id", weekId);

    if (delErr) {
      throw new Error(`database_delete_failed: ${delErr.message}`);
    }

    const inserts: JsonMap[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dayKey = WEEK_DAY_KEYS[i];
      const aiDay = aiWeek.days[dayKey];
      const isRest = Boolean(aiDay?.isRest);
      const title = isRest ? "Repos" : aiDay.title || "Séance";

      inserts.push({
        user_id,
        workout_date: formatISODate(date),
        title,
        status: "planned",
        plan: transformAiDayToPlan(aiDay),
        week_id: weekId,
        category: isRest ? "rest" : "training",
      });
    }

    const { error: insertErr } = await supabaseAdmin.from("workouts").insert(inserts);
    if (insertErr) {
      throw new Error(`database_insert_failed: ${insertErr.message}`);
    }

    return jsonResponse({ success: true, week_id: weekId, inserted: inserts.length });
  } catch (err) {
    console.error("generate_week error:", err);
    return jsonResponse({ error: String((err as Error)?.message || err) }, 500);
  }
});
