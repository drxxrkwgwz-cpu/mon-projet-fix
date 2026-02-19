import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SessionType =
  | "speed"
  | "speed_endurance"
  | "lactate"
  | "tempo"
  | "recovery"
  | "strength"
  | "technique";

type MainSetModel = {
  repetitions: number;
  distance_m: number;
  reference: "100m" | "400m" | "1500m";
  intensity_percent: number;
  recovery_seconds: number;
  target_time_seconds?: number;
  target_time_text?: string;
  tolerance_seconds?: number;
};

type GeneratedSession = {
  id: string;
  date: string;
  title: string;
  type: SessionType;
  duration_minutes: number;
  main_set: MainSetModel;
  warmup: string;
  cooldown: string;
  technical_focus: string[];
};

type WeekResponse = {
  week: {
    start_date: string;
    sessions: GeneratedSession[];
  };
};

type IncomingPayload = {
  start_date?: string;
  sport_specialty?: string;
  prs?: Record<string, number | string>;
  training_days?: string[];
  contraintes_sante?: string;
  health_constraints?: string;
  equipment?: string;
  objectif?: string | { text?: string; date?: string };
  goal?: string | { text?: string; date?: string };
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

const SESSION_TYPES: SessionType[] = [
  "speed",
  "speed_endurance",
  "lactate",
  "tempo",
  "recovery",
  "strength",
  "technique",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const payload = (await req.json()) as IncomingPayload;
    console.log("[generate_week] payload reçu:", JSON.stringify(payload));

    const profile = normalizeProfile(payload);
    const prsUsed = pickPRs(profile.prs);
    console.log("[generate_week] PRs utilisées:", JSON.stringify(prsUsed));

    const week = await generateWithValidation(profile, prsUsed);

    for (const s of week.week.sessions) {
      console.log(
        `[generate_week] séance ${s.date} | ${s.title} | ${s.main_set.distance_m}m | ${s.main_set.intensity_percent}% | ${s.main_set.target_time_text}`,
      );
    }

    return json(week, 200);
  } catch (error) {
    console.error("[generate_week] error:", error);
    return json(
      { error: "Failed to generate week", details: String(error) },
      500,
    );
  }
});

function normalizeProfile(payload: IncomingPayload) {
  const objectiveValue = payload.objectif ?? payload.goal ?? "";
  const objectiveText = typeof objectiveValue === "string"
    ? objectiveValue
    : [objectiveValue?.text, objectiveValue?.date].filter(Boolean).join(" | ");

  return {
    start_date: isISODate(payload.start_date) ? payload.start_date! : getNextMondayISO(),
    sport_specialty: (payload.sport_specialty || "400m").trim(),
    prs: payload.prs || {},
    training_days: (payload.training_days || ["Mon", "Tue", "Thu", "Sat"]).slice(0, 6),
    contraintes_sante: payload.contraintes_sante || payload.health_constraints || "",
    equipment: payload.equipment || "",
    objectif: objectiveText || "Améliorer la performance 400m",
  };
}

function pickPRs(raw: Record<string, number | string>) {
  const prs: Partial<Record<"100m" | "400m" | "1500m", number>> = {};

  for (const key of ["100m", "400m", "1500m"] as const) {
    const candidate = raw[key] ?? raw[key.replace("m", "") as keyof typeof raw];
    const value = typeof candidate === "string" ? Number(candidate.replace(",", ".")) : Number(candidate);
    if (Number.isFinite(value) && value > 0) prs[key] = value;
  }

  if (!prs["400m"] && !prs["100m"] && !prs["1500m"]) {
    // Valeurs de sécurité pour fallback si profil incomplet
    prs["400m"] = 60;
  }

  return prs;
}

async function generateWithValidation(
  profile: ReturnType<typeof normalizeProfile>,
  prsUsed: Partial<Record<"100m" | "400m" | "1500m", number>>,
): Promise<WeekResponse> {
  const firstPrompt = buildPrompt(profile, prsUsed, null);
  const firstAttempt = await callModel(firstPrompt);

  const firstParsed = safeParse(firstAttempt);
  const firstValidated = firstParsed ? validateAndCompute(firstParsed, profile, prsUsed) : null;
  if (firstValidated) return firstValidated;

  const retryReason = firstParsed
    ? "JSON invalide: structure incomplète ou contraintes non respectées"
    : "JSON invalide: parsing impossible";

  const secondPrompt = buildPrompt(profile, prsUsed, retryReason);
  const secondAttempt = await callModel(secondPrompt);
  const secondParsed = safeParse(secondAttempt);
  const secondValidated = secondParsed ? validateAndCompute(secondParsed, profile, prsUsed) : null;

  if (secondValidated) return secondValidated;

  console.warn("[generate_week] fallback déclenché après 2 réponses invalides.");
  return buildFallback(profile, prsUsed);
}

function buildPrompt(
  profile: ReturnType<typeof normalizeProfile>,
  prs: Partial<Record<"100m" | "400m" | "1500m", number>>,
  retryMessage: string | null,
): string {
  const retryBlock = retryMessage ? `\nIMPORTANT RETRY: ${retryMessage}.` : "";

  return `
Tu es un coach spécialiste 400m. Réponds UNIQUEMENT avec un JSON strict valide, sans markdown ni texte libre.
${retryBlock}
Contraintes impératives:
- Ne propose jamais de relais, ni séance hors profil 400m.
- 1 semaine = max 4 à 6 séances, incluant récupération.
- Séances lisibles: warmup, main_set, cooldown.
- main_set doit contenir UNIQUEMENT: repetitions, distance_m, reference, intensity_percent, recovery_seconds.
- Ne mets jamais de champs vides.
- N'invente aucun chrono. Ne fournis PAS target_time_seconds, target_time_text, tolerance_seconds.
- Si une PR manque, choisir une référence disponible (priorité 400m puis 100m puis 1500m).
- Exclure totalement les "repères d'effort".

Format JSON attendu:
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

Profil utilisateur:
${JSON.stringify(profile)}
PRs disponibles:
${JSON.stringify(prs)}
`.trim();
}

async function callModel(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Tu réponds uniquement en JSON strict." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model call failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || "");
}

function safeParse(value: string): WeekResponse | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function validateAndCompute(
  candidate: WeekResponse,
  profile: ReturnType<typeof normalizeProfile>,
  prsUsed: Partial<Record<"100m" | "400m" | "1500m", number>>,
): WeekResponse | null {
  if (!candidate?.week || !Array.isArray(candidate.week.sessions)) return null;
  if (!isISODate(candidate.week.start_date)) return null;

  const sessions = candidate.week.sessions;
  if (sessions.length < 1 || sessions.length > 6) return null;

  const processed: GeneratedSession[] = [];
  for (const [index, raw] of sessions.entries()) {
    if (!raw || typeof raw !== "object") return null;
    if (!isISODate(raw.date)) return null;
    if (!SESSION_TYPES.includes(raw.type)) return null;
    if (!raw.title || containsRelay(raw.title)) return null;
    if (!raw.warmup || !raw.cooldown) return null;
    if (!Array.isArray(raw.technical_focus) || raw.technical_focus.length < 1) return null;

    const ms = raw.main_set as MainSetModel;
    if (!ms) return null;
    if (!(ms.repetitions > 0 && ms.distance_m > 0 && ms.recovery_seconds >= 0)) return null;
    if (!["100m", "400m", "1500m"].includes(ms.reference)) return null;
    if (!(ms.intensity_percent >= 70 && ms.intensity_percent <= 105)) return null;
    if (containsRelay(JSON.stringify(raw))) return null;

    const reference = chooseReference(ms.reference, prsUsed);
    const targetTime = calcTargetTime(ms.distance_m, reference, ms.intensity_percent, prsUsed);

    processed.push({
      id: raw.id || `session-${index + 1}`,
      date: raw.date,
      title: raw.title,
      type: raw.type,
      duration_minutes: Number(raw.duration_minutes) || 60,
      main_set: {
        repetitions: ms.repetitions,
        distance_m: ms.distance_m,
        reference,
        intensity_percent: ms.intensity_percent,
        recovery_seconds: ms.recovery_seconds,
        target_time_seconds: targetTime,
        target_time_text: `${ms.distance_m}m en ${targetTime.toFixed(1)}s`,
        tolerance_seconds: calcTolerance(raw.type),
      },
      warmup: raw.warmup,
      cooldown: raw.cooldown,
      technical_focus: raw.technical_focus,
    });
  }

  return {
    week: {
      start_date: candidate.week.start_date || profile.start_date,
      sessions: processed,
    },
  };
}

function buildFallback(
  profile: ReturnType<typeof normalizeProfile>,
  prs: Partial<Record<"100m" | "400m" | "1500m", number>>,
): WeekResponse {
  const dates = getDatesFromTrainingDays(profile.start_date, profile.training_days);
  const defaultTypes: SessionType[] = ["speed", "speed_endurance", "tempo", "recovery"];

  const sessions: GeneratedSession[] = dates.slice(0, 4).map((date, i) => {
    const type = defaultTypes[i % defaultTypes.length];
    const reference = chooseReference("400m", prs);
    const distance = type === "speed" ? 120 : type === "speed_endurance" ? 250 : type === "tempo" ? 300 : 150;
    const intensity = type === "speed" ? 95 : type === "speed_endurance" ? 90 : type === "tempo" ? 84 : 75;
    const targetTime = calcTargetTime(distance, reference, intensity, prs);

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
        target_time_text: `${distance}m en ${targetTime.toFixed(1)}s`,
        tolerance_seconds: calcTolerance(type),
      },
      warmup: "15 min footing + mobilité dynamique + gammes de course.",
      cooldown: "10 min retour au calme + respiration + mobilité légère.",
      technical_focus: ["Posture haute", "Relâchement des épaules"],
    };
  });

  return { week: { start_date: profile.start_date, sessions } };
}

export function getReferenceDistance(reference: "100m" | "400m" | "1500m"): number {
  if (reference === "100m") return 100;
  if (reference === "400m") return 400;
  return 1500;
}

export function calcTargetTime(
  distance_m: number,
  reference: "100m" | "400m" | "1500m",
  intensity_percent: number,
  prs: Partial<Record<"100m" | "400m" | "1500m", number>>,
): number {
  const orderedRefs: ("400m" | "100m" | "1500m")[] = [reference as "400m" | "100m" | "1500m", "400m", "100m", "1500m"];
  const selectedRef = orderedRefs.find((ref, idx) => idx === 0 || prs[ref]) || "400m";
  const pr = prs[selectedRef] || 60;

  const v_ref = getReferenceDistance(selectedRef) / pr;
  const v_target = v_ref * (intensity_percent / 100);
  const raw = distance_m / v_target;

  const precision = distance_m <= 300 ? 0.1 : 0.5;
  return Math.round(raw / precision) * precision;
}

export function calcTolerance(type: SessionType): number {
  if (type === "speed") return 0.3;
  if (type === "speed_endurance") return 0.8;
  if (type === "tempo") return 1.5;
  if (type === "lactate") return 1.0;
  if (type === "recovery") return 2.0;
  return 1.0;
}

function chooseReference(
  preferred: "100m" | "400m" | "1500m",
  prs: Partial<Record<"100m" | "400m" | "1500m", number>>,
): "100m" | "400m" | "1500m" {
  if (prs[preferred]) return preferred;
  if (prs["400m"]) return "400m";
  if (prs["100m"]) return "100m";
  return "1500m";
}

function containsRelay(value: string): boolean {
  return /\brelais\b|\brelay\b/i.test(value);
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getNextMondayISO() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (8 - day) % 7 || 7;
  now.setUTCDate(now.getUTCDate() + diff);
  return now.toISOString().slice(0, 10);
}

function getDatesFromTrainingDays(startDate: string, trainingDays: string[]) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const normalized = trainingDays
    .map((d) => d.trim().slice(0, 3).toLowerCase())
    .map((d) => DAY_INDEX[d])
    .filter((v): v is number => typeof v === "number");

  if (normalized.length === 0) {
    return [0, 2, 4, 6].map((offset) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    });
  }

  return normalized.map((dayNumber) => {
    const date = new Date(start);
    const diff = (dayNumber - start.getUTCDay() + 7) % 7;
    date.setUTCDate(start.getUTCDate() + diff);
    return date.toISOString().slice(0, 10);
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
