import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonMap = Record<string, unknown>;

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
  const frequency = Number(
    src.frequency_per_week ?? src.sessions_per_week ?? src.frequencyPerWeek ?? src.sessionsPerWeek ?? 0,
  );

  return {
    sport_specialty:
      String(src.sport_specialty ?? src.sportSpecialty ?? disciplines[0] ?? "").trim(),
    disciplines,
    prs: toRecord(src.prs),
    level: String(src.level ?? "").trim(),
    frequency_per_week: Number.isFinite(frequency) && frequency > 0 ? frequency : 0,
    duration_pref: String(src.duration_pref ?? src.durationPref ?? "").trim(),
    training_pref: String(src.training_pref ?? src.trainingPref ?? "").trim(),
    days: toStringArray(src.days),
    equipment: toStringArray(src.equipment),
    health_constraints: String(src.health_constraints ?? src.healthConstraints ?? "").trim(),
    fatigue_baseline: String(src.fatigue_baseline ?? src.fatigue ?? "").trim(),
    goal: src.goal ?? null,
    other_prefs: String(src.other_prefs ?? src.otherPrefs ?? "").trim(),
    coach_name: String(src.coach_name ?? src.coachName ?? "Coach").trim() || "Coach",
    coach_calls_you: String(src.coach_calls_you ?? src.coachCallsYou ?? "Athlete").trim() || "Athlete",
  };
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

type AiStructureBlockSet = {
  work: string;
  recovery: string;
  notes?: string;
};

type AiStructureBlock = {
  name: string;
  sets: AiStructureBlockSet[];
};

type AiEffortMarkers = {
  rpe_target?: string;
  breathing?: string;
  stop_if_hr_drift_over?: string;
};

type AiDay = {
  title: string;
  duration: string;
  focus: string[];
  intensity: string;
  type: string;
  isRest?: boolean;
  objective?: string;
  warmup?: { duration: string; content: string; zone?: string };
  blocks?: AiStructureBlock[];
  cooldown?: { duration: string; content: string };
  effort_markers?: AiEffortMarkers;
  coach_advice?: string;
  description?: string;
  intervals?: { reps: number; label: string } | null;
};

type AiWeek = {
  days: Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", AiDay>;
};

function dayKeyFromIndex(i: number): "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" {
  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  return keys[i];
}

function buildPrompt(profile: NormalizedProfile, sessionsPerWeek: number) {
  return `
You are generating a 7-day rolling plan for a French track athlete.

Return ONLY valid JSON with this exact shape:

{
  "days": {
    "mon": {
      "title": "Séance VMA courte",
      "duration": "60 min",
      "focus": ["VMA", "Explosivité"],
      "intensity": "Élevé",
      "type": "Running",
      "isRest": false,
      "objective": "Développer la VMA et l'explosivité sur courtes distances",
      "warmup": {
        "duration": "15 min",
        "content": "Footing progressif + gammes athlétiques",
        "zone": "Zone 1-2 : 5'30-6'00/km"
      },
      "blocks": [
        {
          "name": "Bloc principal",
          "sets": [
            {
              "work": "10 x 200m à 95% VMA",
              "recovery": "1'30 trot",
              "notes": "Maintenir l'allure constante"
            }
          ]
        }
      ],
      "cooldown": {
        "duration": "10 min",
        "content": "Retour calme en aisance respiratoire"
      },
      "effort_markers": {
        "rpe_target": "7-8/10 sur les répétitions",
        "breathing": "rythme 3-3 ou 3-2",
        "stop_if_hr_drift_over": "5 bpm, ralentir légèrement"
      },
      "coach_advice": "Cette séance développe ta vitesse maximale. Focus sur la qualité, pas la quantité."
    }
  }
}

Rules:
- Exactly ${sessionsPerWeek} training days total. Other days must be rest (isRest=true).
- For rest days: title="Repos", isRest=true, no warmup/blocks/cooldown.
- Titles must be short and descriptive (max 40 chars).
- duration must be human readable (e.g. "60 min", "45–60 min").
- focus is 1-3 tags max.
- blocks must contain at least 1 block for training days.
- coach_advice must be 1-2 sentences max.
- Return ONLY JSON. No markdown. No extra text.

Athlete profile (always use all fields):
- sport_specialty: ${profile.sport_specialty}
- disciplines: ${JSON.stringify(profile.disciplines)}
- prs: ${JSON.stringify(profile.prs)}
- level: ${profile.level}
- frequency_per_week: ${profile.frequency_per_week}
- duration_pref: ${profile.duration_pref}
- training_pref: ${profile.training_pref}
- days: ${JSON.stringify(profile.days)}
- equipment: ${JSON.stringify(profile.equipment)}
- health_constraints: ${profile.health_constraints}
- fatigue_baseline: ${profile.fatigue_baseline}
- goal: ${JSON.stringify(profile.goal)}
- other_prefs: ${profile.other_prefs}
- coach_name: ${profile.coach_name}
- coach_calls_you: ${profile.coach_calls_you}
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
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a high-performance track & field coach AI. Return ONLY valid JSON. No markdown. No extra text.",
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
  if (!parsed) throw new Error(`openai_non_json_content content=${content}`);

  return parsed;
}

function transformAiDayToPlan(safeDay: AiDay, isRest: boolean, dk: string) {
  if (isRest) {
    return { type: "Repos" };
  }

  const firstBlock = safeDay.blocks?.[0];
  const firstSet = firstBlock?.sets?.[0];

  let mainTitle = firstBlock?.name || "—";
  if (firstSet?.work) {
    const match = firstSet.work.match(/(\d+\s*x\s*\d+\s*m)/i);
    if (match) mainTitle = match[1];
  }

  let pace = "—";
  if (firstSet?.work) {
    const paceMatch = firstSet.work.match(/à\s+(.+)/i);
    if (paceMatch) pace = paceMatch[1];
  }

  const recovery = firstSet?.recovery || "—";

  let volume = "—";
  if (firstSet?.work) {
    const repsMatch = firstSet.work.match(/(\d+)\s*x/);
    const distMatch = firstSet.work.match(/x\s*(\d+)\s*m/);
    if (repsMatch && distMatch) {
      const reps = parseInt(repsMatch[1]);
      const dist = parseInt(distMatch[1]);
      volume = `${(reps * dist) / 1000} km à allure cible`;
    }
  }

  return {
    type: "Entrainement",
    dayKey: dk,
    focus: Array.isArray(safeDay?.focus) ? safeDay.focus : [],
    intensity: safeDay?.intensity ?? "À définir",
    sessionType: safeDay?.type ?? "À définir",
    intervals: safeDay?.intervals ?? null,
    description: safeDay?.objective || safeDay?.description || "",
    duration: safeDay?.duration ?? "",
    warmup: {
      description: safeDay?.warmup?.content || "—",
      zone: safeDay?.warmup?.zone || "—",
    },
    warmupDuration: safeDay?.warmup?.duration || "15 min",
    main: {
      title: mainTitle,
      description: firstSet?.notes || "—",
      pace,
      recovery,
      volume,
    },
    cooldown: {
      description: safeDay?.cooldown?.content || "—",
    },
    cooldownDuration: safeDay?.cooldown?.duration || "10 min",
    rpe: safeDay?.effort_markers?.rpe_target || "—",
    breathing: safeDay?.effort_markers?.breathing || "—",
    heartRate: safeDay?.effort_markers?.stop_if_hr_drift_over || "—",
    coachAdvice: safeDay?.coach_advice || "—",
    _raw_blocks: safeDay?.blocks || [],
    _raw_effort_markers: safeDay?.effort_markers || null,
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

    const sessionsPerWeekRaw = body.sessionsPerWeek;
    const sessionsPerWeek = Number(sessionsPerWeekRaw ?? 0);

    const bodyProfile = body.profile;
    let normalizedProfile: NormalizedProfile | null = null;

    if (bodyProfile && typeof bodyProfile === "object") {
      normalizedProfile = normalizeProfile(bodyProfile);
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

      normalizedProfile = normalizeProfile(data);
    }

    console.log("PROFILE REÇU PAR L'IA:", JSON.stringify(normalizedProfile, null, 2));

    const n =
      Number.isFinite(sessionsPerWeek) && sessionsPerWeek > 0
        ? sessionsPerWeek
        : Number(normalizedProfile.frequency_per_week || 4);

    const monday = getMondayOfCurrentWeek(new Date());
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

    const prompt = buildPrompt(normalizedProfile, n);
    const ai = (await callOpenAI(prompt)) as AiWeek;

    if (!ai?.days) return jsonResponse({ error: "AI returned invalid schema" }, 500);

    const inserts: JsonMap[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dk = dayKeyFromIndex(i);
      const d = ai.days[dk];

      const safeDay: AiDay = d ?? {
        title: "Repos",
        duration: "—",
        focus: ["Récup"],
        intensity: "Faible",
        type: "Repos",
        isRest: true,
        description: "",
        intervals: null,
      };

      const isRest = Boolean(safeDay?.isRest);
      const plan = transformAiDayToPlan(safeDay, isRest, dk);

      inserts.push({
        user_id,
        workout_date: formatISODate(date),
        title: isRest ? "Repos" : safeDay?.title ?? "Séance",
        status: "planned",
        plan,
        week_id: weekId,
        category: isRest ? "rest" : "training",
      });
    }

    const { error: insertError } = await supabaseAdmin.from("workouts").insert(inserts);
    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonResponse({ error: "Database insert failed", details: insertError.message }, 500);
    }

    return jsonResponse({ success: true, week_id: weekId, inserted: inserts.length });
  } catch (err) {
    console.error("generate_week error:", err);
    return jsonResponse({ error: String((err as Error)?.message || err) }, 500);
  }
});
