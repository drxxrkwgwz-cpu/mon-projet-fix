import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "generate_week_v54_unified_plan_schema";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const WEEK_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type WeekDayKey = typeof WEEK_DAY_KEYS[number];

type PlanSet = {
  reps: number;
  distance: string;
  target_time: string;
  recovery: string;
  goal: string;
};

type PlanBlock = {
  name: string;
  sets: PlanSet[];
};

type WorkoutPlan = {
  title: string;
  isRest: boolean;
  warmup: { duration: string; content: string } | null;
  blocks: PlanBlock[];
  explanation: string;
  coachAdvice: string;
};

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

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server misconfigured: missing Supabase env vars");
  }
  if (!OPENAI_API_KEY) {
    throw new Error("Server misconfigured: missing OPENAI_API_KEY");
  }
}

function toNumber(val: unknown): number {
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
}

function extract400mPRSeconds(profile: any): number {
  const prs = profile?.prs ?? {};
  const direct = prs["400m"] ?? prs["400 m"] ?? prs["400"] ?? null;
  return toNumber(direct);
}

function normalizeDayKey(input: unknown): WeekDayKey | null {
  const v = String(input || "").trim().toLowerCase();
  if (WEEK_DAY_KEYS.includes(v as WeekDayKey)) return v as WeekDayKey;
  return null;
}

function normalizeAllowedDays(days: unknown): WeekDayKey[] {
  const arr = Array.isArray(days) ? days : [];
  const set = new Set<WeekDayKey>();
  for (const entry of arr) {
    const key = normalizeDayKey(entry);
    if (key) set.add(key);
  }
  return WEEK_DAY_KEYS.filter((k) => set.has(k));
}

function clampSessionsPerWeek(value: unknown): number {
  const n = Math.round(toNumber(value));
  return Math.min(7, Math.max(1, n || 1));
}

function formatSeconds(sec: number) {
  return `${Math.max(1, sec).toFixed(1)}s`;
}

function getDefaultTrainingPlan(dayKey: WeekDayKey, prSeconds: number): WorkoutPlan {
  const effort = Math.max(8, Math.min(120, prSeconds));
  const dayMap: Record<WeekDayKey, WorkoutPlan> = {
    mon: {
      title: "Vitesse maximale",
      isRest: false,
      warmup: { duration: "20 min", content: "8 min footing léger + mobilité hanches + gammes + 4 accélérations progressives" },
      blocks: [
        {
          name: "Qualité vitesse",
          sets: [
            { reps: 4, distance: "60m", target_time: formatSeconds((effort / 400) * 6.2), recovery: "2min", goal: "Rechercher la fréquence gestuelle" },
            { reps: 3, distance: "120m", target_time: formatSeconds((effort / 400) * 13.5), recovery: "4min", goal: "Tenir la vitesse relâchée" },
          ],
        },
      ],
      explanation: "Séance orientée vitesse pure pour améliorer la mécanique de sprint.",
      coachAdvice: "Reste grand, relâché des épaules, appuis brefs et actifs.",
    },
    tue: {
      title: "Endurance de vitesse",
      isRest: false,
      warmup: { duration: "20 min", content: "10 min footing léger + mobilité + éducatifs + 3 lignes droites" },
      blocks: [
        {
          name: "Bloc principal",
          sets: [
            { reps: 3, distance: "200m", target_time: formatSeconds((effort / 400) * 0.53 * 100), recovery: "4min", goal: "Maintenir la vitesse au-delà de 150m" },
            { reps: 2, distance: "150m", target_time: formatSeconds((effort / 400) * 0.39 * 100), recovery: "3min", goal: "Conserver de la qualité technique" },
          ],
        },
      ],
      explanation: "Travail spécifique 400m pour prolonger l'intensité.",
      coachAdvice: "Passe les 120m sans te crisper, cadence régulière.",
    },
    wed: {
      title: "Récupération active",
      isRest: false,
      warmup: { duration: "15 min", content: "Mobilité générale + activation douce + 4 lignes droites faciles" },
      blocks: [
        {
          name: "Mobilité + technique",
          sets: [
            { reps: 6, distance: "80m", target_time: formatSeconds((effort / 400) * 0.24 * 100), recovery: "1min", goal: "Technique relâchée" },
          ],
        },
      ],
      explanation: "Séance légère pour assimiler la charge tout en gardant de la coordination.",
      coachAdvice: "Priorité au relâchement, arrête si lourdeur excessive.",
    },
    thu: {
      title: "Tolérance lactique",
      isRest: false,
      warmup: { duration: "25 min", content: "10 min footing + mobilité + gammes dynamiques + 3 accélérations 60m" },
      blocks: [
        {
          name: "Spécifique 300-350",
          sets: [
            { reps: 2, distance: "300m", target_time: formatSeconds((effort / 400) * 0.79 * 100), recovery: "8min", goal: "Tolérer la fin de course" },
            { reps: 1, distance: "350m", target_time: formatSeconds((effort / 400) * 0.93 * 100), recovery: "10min", goal: "Préparer le dernier 100m du 400" },
          ],
        },
      ],
      explanation: "Bloc clé 400m pour la résistance à l'acidose.",
      coachAdvice: "Départ contrôlé, engage fort à 180m et tiens la posture.",
    },
    fri: {
      title: "Départs et accélérations",
      isRest: false,
      warmup: { duration: "20 min", content: "Échauffement progressif + éducatifs de poussée + montées de genoux" },
      blocks: [
        {
          name: "Accélération",
          sets: [
            { reps: 6, distance: "30m", target_time: formatSeconds((effort / 400) * 0.09 * 100), recovery: "2min", goal: "Poussée explosive" },
            { reps: 4, distance: "80m", target_time: formatSeconds((effort / 400) * 0.22 * 100), recovery: "3min", goal: "Transition propre vers vitesse max" },
          ],
        },
      ],
      explanation: "Renforce les premières foulées et la mise en action.",
      coachAdvice: "Mets de la pression horizontale, tête neutre, bras actifs.",
    },
    sat: {
      title: "Tempo contrôlé 400m",
      isRest: false,
      warmup: { duration: "20 min", content: "Footing léger + mobilité + gammes + 4 progressifs" },
      blocks: [
        {
          name: "Tempo technique",
          sets: [
            { reps: 4, distance: "150m", target_time: formatSeconds((effort / 400) * 0.42 * 100), recovery: "2min30", goal: "Placer l'allure sans fatigue excessive" },
            { reps: 2, distance: "200m", target_time: formatSeconds((effort / 400) * 0.58 * 100), recovery: "4min", goal: "Rythme contrôlé et propre" },
          ],
        },
      ],
      explanation: "Rappel d'allure pour ancrer le rythme de course du 400m.",
      coachAdvice: "Reste propre techniquement, termine frais.",
    },
    sun: {
      title: "Repos",
      isRest: true,
      warmup: null,
      blocks: [],
      explanation: "",
      coachAdvice: "",
    },
  };

  return dayMap[dayKey];
}

function makeRestDay(title = "Repos"): WorkoutPlan {
  return {
    title,
    isRest: true,
    warmup: null,
    blocks: [],
    explanation: "",
    coachAdvice: "",
  };
}

function buildPrompt(profile: any, prSeconds: number, sessionsPerWeek: number, allowedDays: WeekDayKey[]) {
  return `
You are an elite 400m sprint coach.
Return STRICT JSON ONLY.

TARGET SCHEMA (each day object MUST match exactly):
{
  "title": string,
  "isRest": boolean,
  "warmup": { "duration": string, "content": string } | null,
  "blocks": [
    {
      "name": string,
      "sets": [
        { "reps": number, "distance": string, "target_time": string, "recovery": string, "goal": string }
      ]
    }
  ] | [],
  "explanation": string,
  "coachAdvice": string
}

TOP LEVEL OUTPUT MUST BE:
{
  "days": {
    "mon": <schema>,
    "tue": <schema>,
    "wed": <schema>,
    "thu": <schema>,
    "fri": <schema>,
    "sat": <schema>,
    "sun": <schema>
  }
}

MANDATORY RULES:
- Exactly 7 day keys in days: mon..sun.
- Exactly ${sessionsPerWeek} training days where isRest=false.
- Training days can ONLY be in allowedDays=${JSON.stringify(allowedDays)}.
- Every non-allowed day MUST be isRest=true.
- If "sun" is not in allowedDays, sun MUST be rest.
- If isRest=true: title is "Repos" or "Récupération", warmup=null, blocks=[], explanation="", coachAdvice="".
- If isRest=false: warmup required, blocks required, blocks contain sets, every set requires target_time string like "17.5s".
- 400m-specific plan only (speed, speed endurance, lactate tolerance, starts, controlled tempo, mobility). No generic VMA, no long endurance runner sessions.
- target_time must be based on athlete PR 400m.

Athlete PR 400m (seconds): ${prSeconds}
Athlete profile:
${JSON.stringify(profile, null, 2)}
`;
}

async function callOpenAI(prompt: string) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return strict JSON only. No markdown. No extra text." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const raw = await resp.text();
  if (!resp.ok) throw new Error(`openai_error status=${resp.status} body=${raw}`);

  const parsed = safeJsonParse(raw);
  const content = parsed?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error(`openai_empty_content raw=${raw}`);

  const json = safeJsonParse(content);
  if (!json || typeof json !== "object") throw new Error(`openai_non_json_content content=${content}`);

  return json as Record<string, any>;
}

function normalizeSet(raw: any, fallback: PlanSet): PlanSet {
  const reps = Math.max(1, Math.round(toNumber(raw?.reps) || fallback.reps));
  const distance = String(raw?.distance || fallback.distance);
  const target_time = String(raw?.target_time || fallback.target_time);
  const recovery = String(raw?.recovery || fallback.recovery);
  const goal = String(raw?.goal || fallback.goal);
  return { reps, distance, target_time, recovery, goal };
}

function normalizeTrainingDay(raw: any, fallback: WorkoutPlan): WorkoutPlan {
  const blocksInput = Array.isArray(raw?.blocks) ? raw.blocks : [];

  const blocks: PlanBlock[] = blocksInput
    .map((b: any, blockIndex: number) => {
      const fallbackBlock = fallback.blocks[blockIndex] || fallback.blocks[0];
      const setsInput = Array.isArray(b?.sets) ? b.sets : [];
      const sets = (setsInput.length ? setsInput : fallbackBlock?.sets || []).map((s: any, setIndex: number) => {
        const fallbackSet = fallbackBlock?.sets?.[setIndex] || fallbackBlock?.sets?.[0] || {
          reps: 3,
          distance: "150m",
          target_time: "20.0s",
          recovery: "2min",
          goal: "Qualité",
        };
        return normalizeSet(s, fallbackSet);
      });
      if (!sets.length) return null;
      return {
        name: String(b?.name || fallbackBlock?.name || "Bloc principal"),
        sets,
      };
    })
    .filter(Boolean);

  const normalizedBlocks = blocks.length ? blocks : fallback.blocks;

  return {
    title: String(raw?.title || fallback.title || "Séance"),
    isRest: false,
    warmup: {
      duration: String(raw?.warmup?.duration || fallback.warmup?.duration || "20 min"),
      content: String(raw?.warmup?.content || fallback.warmup?.content || "Footing léger + mobilité + gammes"),
    },
    blocks: normalizedBlocks,
    explanation: String(raw?.explanation || fallback.explanation || ""),
    coachAdvice: String(raw?.coachAdvice || fallback.coachAdvice || ""),
  };
}

function normalizeAiWeek(
  aiWeekRaw: any,
  sessionsPerWeek: number,
  allowedDays: WeekDayKey[],
  prSeconds: number,
): { days: Record<WeekDayKey, WorkoutPlan> } {
  const inputDays = aiWeekRaw && typeof aiWeekRaw === "object" && aiWeekRaw.days && typeof aiWeekRaw.days === "object"
    ? aiWeekRaw.days
    : {};

  const allowedSet = new Set<WeekDayKey>(allowedDays);
  const preferredTrainingDays = WEEK_DAY_KEYS.filter((k) => allowedSet.has(k)).slice(0, sessionsPerWeek);
  const preferredTrainingSet = new Set<WeekDayKey>(preferredTrainingDays);

  const days = {} as Record<WeekDayKey, WorkoutPlan>;

  for (const dayKey of WEEK_DAY_KEYS) {
    const aiDay = inputDays?.[dayKey] ?? null;
    const fallbackTraining = getDefaultTrainingPlan(dayKey, prSeconds);

    if (!preferredTrainingSet.has(dayKey)) {
      days[dayKey] = makeRestDay(dayKey === "sun" ? "Repos" : "Repos");
      continue;
    }

    const trainingDay = normalizeTrainingDay(aiDay, fallbackTraining);
    days[dayKey] = trainingDay;
  }

  // enforce allowedDays restrictions on any accidental training day after construction
  for (const dayKey of WEEK_DAY_KEYS) {
    if (!allowedSet.has(dayKey) && days[dayKey] && !days[dayKey].isRest) {
      days[dayKey] = makeRestDay();
    }
  }

  // final exact training count correction (LUN->DIM priority in allowed days)
  const currentTraining = WEEK_DAY_KEYS.filter((k) => !days[k].isRest);
  if (currentTraining.length !== sessionsPerWeek) {
    for (const dayKey of WEEK_DAY_KEYS) {
      if (!allowedSet.has(dayKey)) {
        days[dayKey] = makeRestDay();
      }
    }

    const fixedTraining = WEEK_DAY_KEYS.filter((k) => allowedSet.has(k)).slice(0, sessionsPerWeek);
    const fixedSet = new Set<WeekDayKey>(fixedTraining);
    for (const dayKey of WEEK_DAY_KEYS) {
      if (fixedSet.has(dayKey)) {
        days[dayKey] = normalizeTrainingDay(days[dayKey], getDefaultTrainingPlan(dayKey, prSeconds));
        days[dayKey].isRest = false;
      } else {
        days[dayKey] = makeRestDay();
      }
    }
  }

  return { days };
}

function validateAiWeek(aiWeek: { days: Record<WeekDayKey, WorkoutPlan> }, sessionsPerWeek: number, allowedDays: WeekDayKey[]) {
  if (!aiWeek || typeof aiWeek !== "object" || !aiWeek.days || typeof aiWeek.days !== "object") {
    throw new Error("validation_failed: missing days object");
  }

  for (const key of WEEK_DAY_KEYS) {
    if (!(key in aiWeek.days)) throw new Error(`validation_failed: missing day '${key}'`);
    const day = aiWeek.days[key];
    if (!day || typeof day !== "object") throw new Error(`validation_failed: invalid day '${key}'`);

    if (typeof day.title !== "string") throw new Error(`validation_failed: '${key}' title missing`);
    if (typeof day.isRest !== "boolean") throw new Error(`validation_failed: '${key}' isRest missing`);
    if (!Array.isArray(day.blocks)) throw new Error(`validation_failed: '${key}' blocks must be array`);
    if (typeof day.explanation !== "string") throw new Error(`validation_failed: '${key}' explanation missing`);
    if (typeof day.coachAdvice !== "string") throw new Error(`validation_failed: '${key}' coachAdvice missing`);

    if (day.isRest) {
      if (day.warmup !== null) throw new Error(`validation_failed: '${key}' warmup must be null for rest`);
      if (day.blocks.length !== 0) throw new Error(`validation_failed: '${key}' blocks must be empty for rest`);
    } else {
      if (!day.warmup || typeof day.warmup !== "object") throw new Error(`validation_failed: '${key}' warmup missing`);
      if (!day.warmup.duration || !day.warmup.content) throw new Error(`validation_failed: '${key}' warmup fields missing`);
      if (day.blocks.length === 0) throw new Error(`validation_failed: '${key}' missing blocks`);
      for (const block of day.blocks) {
        if (!block || typeof block !== "object") throw new Error(`validation_failed: '${key}' invalid block`);
        if (!Array.isArray(block.sets) || block.sets.length === 0) throw new Error(`validation_failed: '${key}' block missing sets`);
        for (const set of block.sets) {
          if (typeof set.reps !== "number") throw new Error(`validation_failed: '${key}' set missing reps`);
          if (!set.distance) throw new Error(`validation_failed: '${key}' set missing distance`);
          if (!set.target_time) throw new Error(`validation_failed: '${key}' set missing target_time`);
          if (!set.recovery) throw new Error(`validation_failed: '${key}' set missing recovery`);
          if (!set.goal) throw new Error(`validation_failed: '${key}' set missing goal`);
        }
      }
    }
  }

  const allowedSet = new Set<WeekDayKey>(allowedDays);
  const trainingDays = WEEK_DAY_KEYS.filter((k) => aiWeek.days[k] && aiWeek.days[k].isRest === false);

  if (trainingDays.length !== sessionsPerWeek) {
    throw new Error(`validation_failed: training day count mismatch expected=${sessionsPerWeek} actual=${trainingDays.length}`);
  }

  for (const k of trainingDays) {
    if (!allowedSet.has(k)) {
      throw new Error(`validation_failed: training day '${k}' is not allowed`);
    }
  }

  if (!allowedSet.has("sun") && aiWeek.days.sun.isRest !== true) {
    throw new Error("validation_failed: 'sun' must be rest when not allowed");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    console.log(`[generate_week] ${VERSION}`);
    ensureEnv();

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profileError || !profile) return jsonResponse({ error: "Profile not found" }, 404);

    const prSeconds = extract400mPRSeconds(profile);
    if (!prSeconds) return jsonResponse({ error: "Missing 400m PR in profile.prs" }, 400);

    const allowedDaysRaw = normalizeAllowedDays(profile?.days);
    if (!allowedDaysRaw.length) return jsonResponse({ error: "Profile days is empty or invalid" }, 400);

    const sessionsPerWeekRaw = clampSessionsPerWeek(profile?.frequency_per_week);
    const sessionsPerWeek = Math.min(sessionsPerWeekRaw, allowedDaysRaw.length);

    const allowedDays = allowedDaysRaw;

    const prompt = buildPrompt(profile, prSeconds, sessionsPerWeek, allowedDays);
    const aiWeekRaw = await callOpenAI(prompt);
    const aiWeek = normalizeAiWeek(aiWeekRaw, sessionsPerWeek, allowedDays, prSeconds);

    validateAiWeek(aiWeek, sessionsPerWeek, allowedDays);

    const trainingCount = WEEK_DAY_KEYS.filter((k) => !aiWeek.days[k].isRest).length;
    console.log("[generate_week] settings", { sessionsPerWeek, allowedDays, trainingCount });
    console.log("[generate_week] ai keys", Object.keys(aiWeek.days));
    console.log("[generate_week] sample day", { mon: aiWeek.days.mon });

    const monday = getMonday();
    const weekId = `${user_id}-${formatDate(monday)}`;

    const { error: deleteError } = await supabaseAdmin
      .from("workouts")
      .delete()
      .eq("user_id", user_id)
      .eq("week_id", weekId);

    if (deleteError) throw new Error(`database_delete_failed: ${deleteError.message}`);

    const inserts = WEEK_DAY_KEYS.map((dayKey, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const day = aiWeek.days[dayKey];
      return {
        user_id,
        workout_date: formatDate(date),
        week_id: weekId,
        title: day.isRest ? "Repos" : day.title,
        status: "planned",
        category: day.isRest ? "rest" : "training",
        plan: day,
      };
    });

    const { error: insertError } = await supabaseAdmin.from("workouts").insert(inserts);
    if (insertError) throw new Error(`database_insert_failed: ${insertError.message}`);

    return jsonResponse({ success: true, week_id: weekId, inserted: inserts.length, version: VERSION }, 200);
  } catch (err) {
    console.error("generate_week error:", err);
    return jsonResponse({ error: String((err as Error)?.message || err), version: VERSION }, 500);
  }
});
