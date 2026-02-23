import { StyleSheet } from "react-native";

// ====== CONSTANTES ======

const FULL_DAY_LABELS = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

const SHORT_DAY_LABELS = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Jeu",
  fri: "Ven",
  sat: "Sam",
  sun: "Dim",
};

const LEVEL_LABELS = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
  departemental: "Départemental",
  regional: "Régional",
  national_haut: "National / Haut niveau",
};

const DURATION_LABELS = {
  courte: "30–45 min",
  moyenne: "45–90 min",
  longue: "90 min et +",
};

const TRAINING_LABELS = {
  volume: "Volume",
  qualite: "Qualité",
  equilibre: "Équilibré",
  adaptatif: "Adaptatif",
};

const FATIGUE_LABELS = {
  en_forme: "En forme",
  normal: "Normal",
  fatigue: "Fatigué",
};

const EQUIPMENT_LABELS = {
  piste: "Piste",
  stade: "Stade",
  salle: "Salle",
  haies: "Haies",
  blocs: "Blocs",
  medecine_ball: "Médecine ball",
  halteres: "Haltères",
  elastiques: "Élastiques",
  sled: "Sled",
  tapis: "Tapis",
  chrono_gps: "Chrono / GPS",
  aucun: "Aucun",
};

const monthLabels = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const planningTabs = ["Semaine", "Mois"];

const performanceDisciplines = [
  { label: "100 m", unit: "s" },
  { label: "1500 m", unit: "min:s" },
  { label: "200 m", unit: "s" },
  { label: "400 m", unit: "s" },
];

const emptyCoachProfile = {
  user_id: null,
  coachName: "",
  coachCallsYou: "",
  appellation: "",
  disciplines: [],
  level: "",
  prs: {},
  frequencyPerWeek: 0,
  durationPref: "",
  trainingPref: "",
  days: [],
  equipment: [],
  healthConstraints: "",
  fatigue: "",
  goal: {
    title: "",
    dateText: "",
  },
  otherPrefs: "",
  sessions: [],
  performanceEntries: [],
};

// ====== HELPER FUNCTIONS ======

function statusBadgeStyle(status) {
  if (status === "Repos") return styles.statusBadgeRest;
  if (status === "Séance") return styles.statusBadgeTodo;
  return styles.statusBadgeSkipped;
}

function mapProfileFromDb(data) {
  if (!data) return emptyCoachProfile;
  return {
    ...emptyCoachProfile,
    user_id: data.user_id ?? null,
    coachName: data.coach_name || "",
    coachCallsYou: data.coach_calls_you || "",
    appellation: data.appellation || "",
    level: data.level || "",
    frequencyPerWeek: data.frequency_per_week || 0,
    durationPref: data.duration_pref || "",
    trainingPref: data.training_pref || "",
    days: data.days || [],
    equipment: data.equipment || [],
    healthConstraints: data.health_constraints || "",
    fatigue: data.fatigue_baseline || "",
    goal: data.goal || { title: "", dateText: "" },
    otherPrefs: data.other_prefs || "",
    disciplines: data.disciplines || [],
    prs: data.prs || {},
  };
}

function mapWorkouts(workouts) {
  if (!Array.isArray(workouts)) return [];

  return workouts
    .map((workout) => {
      const dateKey = workout.date || workout.scheduled_date || workout.workout_date || workout.session_date;
      if (!dateKey) return null;

      const plan = workout.plan || {};
      const category = String(workout.category || workout.type || "").toLowerCase();
      const isRest = Boolean(
        plan?.isRest ||
          category === "rest" ||
          category === "repos" ||
          (typeof workout.title === "string" && workout.title.toLowerCase() === "repos")
      );

      const duration =
        workout.duration ||
        workout.duration_label ||
        plan?.warmup?.duration ||
        (workout.duration_minutes ? `${workout.duration_minutes} min` : "Durée à définir");

      const description = plan?.explanation || workout.description || workout.notes || "Séance personnalisée.";
      const intervals = workout.intervals || workout.interval_data || null;

      return {
        id: workout.id || dateKey,
        workoutId: workout.id || null,
        date: dateKey,
        dateKey,
        title: isRest ? "Repos" : workout.title || plan?.title || workout.name || "Séance",
        duration,
        objectives: workout.objectives || workout.focus || workout.tags || [],
        description,
        intensity: workout.intensity || workout.intensity_label || "À définir",
        type: workout.sessionType || workout.type || workout.category || "À définir",
        intervals,
        status: workout.status || "planned",
        isRest,
        hasSession: !isRest,
        plan,
      };
    })
    .filter(Boolean);
}

function mapFeedbackToPerformanceEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry, index) => {
    const createdAt = entry.created_at ? new Date(entry.created_at) : null;
    return {
      id: entry.id || `feedback-${index}`,
      discipline: entry.discipline || entry.title || "Feedback séance",
      value: entry.rating ? `${entry.rating}/10` : entry.difficulty || entry.status || "—",
      date: createdAt ? formatDate(createdAt) : "Date inconnue",
    };
  });
}

function buildRollingWeek(sessionMap) {
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const daysUntilMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysUntilMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dayKey = getDayKey(date);
    const session = buildSessionForDate(date, sessionMap);

    return {
      ...session,
      id: `${dayKey}-${date.toDateString()}`,
      dayKey,
      dayShort: SHORT_DAY_LABELS[dayKey],
      dayLabel: FULL_DAY_LABELS[dayKey],
      dateLabel: formatDate(date),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

function buildYearPlanning(sessionMap) {
  const currentYear = new Date().getFullYear();
  return monthLabels.map((label, monthIndex) => {
    const weeks = buildWeeksForMonth(currentYear, monthIndex, sessionMap);
    return { label, monthIndex, weeks };
  });
}

function buildWeeksForMonth(year, monthIndex, sessionMap) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const weeks = [];
  let currentStart = startOfWeek(firstDay);
  let weekIndex = 0;

  while (currentStart <= lastDay) {
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(currentStart);
      date.setDate(currentStart.getDate() + index);
      const dayKey = getDayKey(date);
      const session = buildSessionForDate(date, sessionMap, true);
      return {
        ...session,
        id: `${monthIndex}-${weekIndex}-${dayKey}`,
        dayKey,
        dayLabel: FULL_DAY_LABELS[dayKey],
        dateLabel: formatDate(date),
      };
    });

    weeks.push({
      label: `Semaine ${weekIndex + 1}`,
      range: `${weekDays[0].dateLabel} → ${weekDays[6].dateLabel}`,
      sessions: weekDays,
    });

    currentStart.setDate(currentStart.getDate() + 7);
    weekIndex += 1;
  }

  return weeks;
}

function buildSessionMap(sessions) {
  return sessions.reduce((acc, session) => {
    if (!session?.date) return acc;
    acc[session.date] = session;
    return acc;
  }, {});
}

function buildSessionForDate(date, sessionMap, useRestLabel = false) {
  const dateKey = formatISODate(date);
  const session = sessionMap[dateKey];

  if (!session) {
    return {
      title: useRestLabel ? "Repos" : "Séance à planifier",
      duration: "—",
      focus: [useRestLabel ? "Récupération" : "À définir"],
      status: useRestLabel ? "Repos" : "À planifier",
      description: "Aucune séance renseignée.",
      intensity: "À définir",
      type: "À définir",
      hasSession: false,
      isRest: useRestLabel,
      intervals: null,
      dateKey,
    };
  }

  const isRest = Boolean(session.isRest);

  return {
    ...session,
    title: isRest ? "Repos" : session.title || "Séance",
    duration: session.duration || session?.plan?.warmup?.duration || "Durée à définir",
    focus: Array.isArray(session.objectives) ? session.objectives : Array.isArray(session.focus) ? session.focus : [],
    status: isRest ? "Repos" : session.status || "planned",
    description: session.description || session?.plan?.explanation || "Séance personnalisée.",
    intensity: session.intensity || "À définir",
    type: session.type || "À définir",
    hasSession: true,
    isRest,
    intervals: session.intervals || null,
    dateKey,
  };
}

function buildIntervals(session) {
  if (!session) return null;

  if (session.intervals?.reps && session.intervals?.label) {
    return session.intervals;
  }

  if (Array.isArray(session?.plan?.blocks)) {
    for (const block of session.plan.blocks) {
      if (!Array.isArray(block?.sets)) continue;
      const set = block.sets[0];
      if (set?.reps && set?.distance) {
        return { reps: Number(set.reps), label: String(set.distance) };
      }
    }
  }

  const source = `${session.title || ""} ${session.description || ""}`.toLowerCase();
  const match = source.match(/(\d+)\s*x\s*(\d+)\s*(m|km)?/i);
  if (!match) return null;

  const reps = Number(match[1]);
  const distance = match[2];
  const unit = match[3] || "m";
  if (!reps || !distance) return null;

  return { reps, label: `${distance}${unit}` };
}

function parseNumericValue(value, unit) {
  const cleaned = String(value).trim();
  if (unit === "min:s") {
    const parts = cleaned.split(":");
    if (parts.length === 2) {
      const minutes = parseFloat(parts[0]);
      const seconds = parseFloat(parts[1]);
      if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
        return minutes * 60 + seconds;
      }
    }
  }
  const numeric = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatPerformanceValue(value, unit) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (unit === "min:s") return trimmed;
  return trimmed.includes(unit) ? trimmed : `${trimmed} ${unit}`;
}

function buildNumberOptions(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index).padStart(2, "0"));
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return [String(currentYear), String(currentYear - 1), String(currentYear - 2)];
}

function getDayKey(date) {
  const day = date.getDay();
  const lookup = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return lookup[day];
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

// ====== STYLES ======
const styles = StyleSheet.create({
  screenHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backButton: { backgroundColor: "#0B0D12", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  backButtonText: { color: "#FFFFFF", fontWeight: "700" },
  screenTitle: { fontSize: 22, fontWeight: "700", color: "#0B0D12" },

  primaryButton: { backgroundColor: "#0B0D12", paddingVertical: 12, borderRadius: 16, alignItems: "center", marginTop: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  primaryButtonBlue: { backgroundColor: "#2563EB", paddingVertical: 12, borderRadius: 16, alignItems: "center", marginTop: 12 },
  primaryButtonBlueText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  loadingText: { color: "#52607A", fontSize: 12, fontWeight: "600" },

  recalcCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 16, borderWidth: 1, borderColor: "rgba(15, 23, 42, 0.08)", marginTop: 20 },
  recalcTitle: { fontSize: 16, fontWeight: "700", color: "#0B0D12", marginBottom: 6 },
  recalcSubtitle: { fontSize: 13, color: "#52607A", marginBottom: 12 },
  recalcBar: { height: 8, borderRadius: 999, backgroundColor: "rgba(37, 99, 235, 0.15)", overflow: "hidden" },
  recalcFill: { height: "100%", borderRadius: 999, backgroundColor: "#2563EB" },

  sessionDetailSafeArea: { flex: 1, backgroundColor: "#0B0D12" },
  sessionDetailContainer: { backgroundColor: "#0B0D12", flex: 1 },
  sessionDetailContent: { padding: 20, paddingTop: 18, paddingBottom: 48 },
  sessionDetailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sessionDetailBack: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sessionDetailBackText: { color: "#FFFFFF", fontSize: 26, fontWeight: "700", marginTop: -2 },
  sessionDetailHeaderMid: { flex: 1, paddingHorizontal: 12 },
  sessionDetailHeaderDate: { color: "rgba(226,232,240,0.75)", fontSize: 14, fontWeight: "600" },
  sessionDetailStatusPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.22)",
  },
  sessionDetailStatusText: { color: "#86EFAC", fontWeight: "800", fontSize: 12 },
  sessionDetailTitle: { fontSize: 34, fontWeight: "900", color: "#FFFFFF", lineHeight: 40, marginTop: 6 },
  sessionDetailChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14, marginBottom: 18 },

  detailChip: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  detailChipWarm: { backgroundColor: "rgba(236, 167, 104, 0.22)", borderColor: "rgba(236, 167, 104, 0.26)" },
  detailChipText: { fontSize: 13, fontWeight: "800", color: "rgba(226,232,240,0.9)" },
  detailChipTextWarm: { color: "#FAD7B4" },
  detailSectionLabel: { fontSize: 12, color: "rgba(226,232,240,0.55)", letterSpacing: 1.2, marginTop: 16, marginBottom: 10, textTransform: "uppercase" },
  detailSectionLabelInline: { fontSize: 12, color: "rgba(226,232,240,0.55)", letterSpacing: 1.2, marginTop: 14, marginBottom: 10, textTransform: "uppercase" },

  detailCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  detailPlaceholder: { color: "rgba(226,232,240,0.65)", fontSize: 14, fontWeight: "600" },

  structureItem: { flexDirection: "row", gap: 14 },
  structureLeftBar: { width: 3, borderRadius: 999 },
  structureLeftBarCool: { backgroundColor: "rgba(96, 165, 250, 0.95)" },
  structureLeftBarWarm: { backgroundColor: "rgba(236, 167, 104, 0.95)" },
  structureItemBody: { flex: 1 },
  structureItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  structureItemTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  structureItemDuration: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  structureItemSub: { color: "rgba(226,232,240,0.70)", fontSize: 14, marginTop: 8 },
  structureDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.10)", marginVertical: 14 },

  coachCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  coachCardIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(236, 167, 104, 0.22)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(236, 167, 104, 0.26)" },
  coachCardIconText: { color: "#FAD7B4", fontWeight: "900" },
  coachCardTitle: { color: "rgba(226,232,240,0.9)", fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },

  feedbackSavedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(96, 165, 250, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.20)",
    marginBottom: 12,
  },
  feedbackSavedIcon: { width: 34, height: 34, borderRadius: 14, backgroundColor: "rgba(96, 165, 250, 0.24)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(96, 165, 250, 0.28)" },
  feedbackSavedIconText: { color: "#CFE7FF", fontWeight: "900" },
  feedbackSavedTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  feedbackSavedSubtitle: { color: "rgba(226,232,240,0.75)", fontWeight: "600", fontSize: 12, marginTop: 2 },

  feedbackPrompt: { color: "rgba(226,232,240,0.85)", fontSize: 14, fontWeight: "700" },
  feedbackInputDark: {
    marginTop: 12,
    marginBottom: 14,
    borderRadius: 18,
    padding: 14,
    minHeight: 120,
    textAlignVertical: "top",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  difficultyRowDark: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  difficultyChipDark: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  difficultyChipActiveDark: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  difficultyChipTextDark: { color: "rgba(226,232,240,0.9)", fontSize: 12, fontWeight: "800" },
  difficultyChipTextActiveDark: { color: "#0B0D12", fontSize: 12, fontWeight: "900" },
  splitBlock: { marginTop: 16 },
  splitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  splitInputWrapper: { width: "30%" },
  splitLabelDark: { fontSize: 11, color: "rgba(226,232,240,0.65)", marginBottom: 6, fontWeight: "800" },
  splitInputDark: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", color: "#FFFFFF" },

  statusBadgeTodo: { backgroundColor: "#0B0D12", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  statusBadgeSkipped: { backgroundColor: "rgba(148, 163, 184, 0.2)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  statusBadgeRest: { backgroundColor: "rgba(34, 197, 94, 0.12)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
});

export {
  FULL_DAY_LABELS,
  SHORT_DAY_LABELS,
  LEVEL_LABELS,
  DURATION_LABELS,
  TRAINING_LABELS,
  FATIGUE_LABELS,
  EQUIPMENT_LABELS,
  monthLabels,
  planningTabs,
  performanceDisciplines,
  emptyCoachProfile,
  statusBadgeStyle,
  mapProfileFromDb,
  mapWorkouts,
  mapFeedbackToPerformanceEntries,
  buildRollingWeek,
  buildYearPlanning,
  buildWeeksForMonth,
  buildSessionMap,
  buildSessionForDate,
  buildIntervals,
  parseNumericValue,
  formatPerformanceValue,
  buildNumberOptions,
  buildYearOptions,
  getDayKey,
  formatDate,
  formatISODate,
  startOfWeek,
  styles,
};
