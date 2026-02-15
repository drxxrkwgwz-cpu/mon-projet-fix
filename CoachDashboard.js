import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  Vibration,
  View,
} from "react-native";

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

export default function CoachDashboard({ route }) {
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [planningTab, setPlanningTab] = useState("Semaine");
  const [routeState, setRouteState] = useState({ name: "Dashboard", params: {} });
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);
  const screenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    screenAnim.setValue(0);
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [routeState.name, screenAnim]);

  const coachProfile = route?.params?.coachProfile
    ? { ...emptyCoachProfile, ...route.params.coachProfile }
    : emptyCoachProfile;

  const initialPerformanceEntries = useMemo(
    () => coachProfile.performanceEntries || [],
    [coachProfile.performanceEntries]
  );
  const [performanceEntries, setPerformanceEntries] = useState(initialPerformanceEntries);
  const sessionMap = useMemo(() => buildSessionMap(coachProfile.sessions || []), [
    coachProfile.sessions,
  ]);

  const profileSummary = useMemo(() => {
    const levelLabel = LEVEL_LABELS[coachProfile.level] || "À définir";
    const fatigueLabel = FATIGUE_LABELS[coachProfile.fatigue] || "À définir";
    const frequencyLabel = coachProfile.frequencyPerWeek
      ? String(coachProfile.frequencyPerWeek) + " séances / semaine"
      : "À définir";
    const durationLabel = DURATION_LABELS[coachProfile.durationPref] || "À définir";
    const trainingLabel = TRAINING_LABELS[coachProfile.trainingPref] || "À définir";
    const trainingDays = coachProfile.days?.length
      ? coachProfile.days.map((day) => FULL_DAY_LABELS[day] || day).join(", ")
      : "À définir";
    const equipmentList = coachProfile.equipment?.length
      ? coachProfile.equipment.map((item) => EQUIPMENT_LABELS[item] || item).join(" · ")
      : "À définir";
    const profilePRs = Object.entries(coachProfile.prs || {});
    const disciplines = coachProfile.disciplines?.length ? coachProfile.disciplines : ["À définir"];
    return {
      levelLabel,
      fatigueLabel,
      frequencyLabel,
      durationLabel,
      trainingLabel,
      trainingDays,
      equipmentList,
      profilePRs,
      disciplines,
    };
  }, [coachProfile]);

  const goalTitle = coachProfile.goal?.title || "Objectif à définir";
  const goalDate = coachProfile.goal?.dateText || "Date à définir";
  const coachName = coachProfile.coachName || "";
  const chatLabel = coachName ? "Parler à " + coachName : "Parler au coach";

  const rollingWeek = useMemo(() => buildRollingWeek(sessionMap), [sessionMap]);

  const planningMonths = useMemo(() => buildYearPlanning(sessionMap), [sessionMap]);

  const selectedMonth = planningMonths[selectedMonthIndex];
  const selectedWeek = selectedMonth?.weeks[selectedWeekIndex] || selectedMonth?.weeks[0];

  useEffect(() => {
    setPerformanceEntries(initialPerformanceEntries);
  }, [initialPerformanceEntries]);

  const toggleProfile = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsProfileExpanded((prev) => !prev);
  };

  const openRoute = useCallback((name, params = {}) => {
    setRouteState({ name, params });
  }, []);

  const handleOpenSession = (session) => {
    if (!session?.hasSession) return;
    setSelectedSession(session);
    openRoute("SessionDetail");
  };

  const screenStyle = {
    opacity: screenAnim,
    transform: [{ translateY: screenAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  if (routeState.name === "Planning") {
    return (
      <Animated.View style={[styles.screenWrapper, screenStyle]}>
        <PlanningScreen
          planningTab={planningTab}
          onTabChange={setPlanningTab}
          months={planningMonths}
          selectedMonthIndex={selectedMonthIndex}
          onSelectMonth={setSelectedMonthIndex}
          selectedWeekIndex={selectedWeekIndex}
          onSelectWeek={setSelectedWeekIndex}
          weekData={selectedWeek}
          onBack={() => openRoute("Dashboard")}
          onOpenSession={handleOpenSession}
        />
      </Animated.View>
    );
  }

  if (routeState.name === "Progression") {
    return (
      <Animated.View style={[styles.screenWrapper, screenStyle]}>
        <ProgressionScreen
          onBack={() => openRoute("Dashboard")}
          performanceEntries={performanceEntries}
          onAddPerformance={(entry) =>
            setPerformanceEntries((prev) => [{ id: `perf-${Date.now()}`, ...entry }, ...prev])
          }
        />
      </Animated.View>
    );
  }

  if (routeState.name === "Chat") {
    return (
      <Animated.View style={[styles.screenWrapper, screenStyle]}>
        <ChatCoachScreen coachName={coachName} onBack={() => openRoute("Dashboard")} />
      </Animated.View>
    );
  }

  if (routeState.name === "SessionDetail" && selectedSession) {
    return (
      <Animated.View style={[styles.screenWrapper, screenStyle]}>
        <SessionDetailScreen session={selectedSession} onBack={() => openRoute("Dashboard")} />
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
      >
        <DashboardHeader
          title="Coach IA"
          subtitle={`${goalTitle} · ${goalDate}`}
        />

        <ProfileCard
          coachProfile={coachProfile}
          profileSummary={profileSummary}
          expanded={isProfileExpanded}
          onToggle={toggleProfile}
        />

        <WeekOverview
          sessions={rollingWeek}
          onOpenPlanning={() => openRoute("Planning")}
          onOpenSession={handleOpenSession}
        />

        <ProgressBlock onOpenProgress={() => openRoute("Progression")} />

        <PrimaryCTA label={chatLabel} onPress={() => openRoute("Chat")} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardHeader({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
        <Text style={styles.headerState}>Dernière mise à jour · à définir</Text>
      </View>
    </View>
  );
}

function ProfileCard({ coachProfile, profileSummary, expanded, onToggle }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Profil</Text>
        <View style={styles.accentBadge}>
          <Text style={styles.accentBadgeText}>{profileSummary.levelLabel}</Text>
        </View>
      </View>

      <View style={styles.profileTopRow}>
        <View style={styles.profileIdentity}>
          <Text style={styles.profileName}>{coachProfile.coachCallsYou || "Athlète"}</Text>
          <Text style={styles.profileSubtitle}>{coachProfile.appellation || "Profil sportif"}</Text>
        </View>
        <View style={styles.profileMetaCardLight}>
          <Text style={styles.profileMetaLabel}>Objectif</Text>
          <Text style={styles.profileMetaValue}>{coachProfile.goal?.title || "À définir"}</Text>
        </View>
      </View>

      <View style={styles.profileQuickInfoRow}>
        <InfoPill label="Fréquence" value={profileSummary.frequencyLabel} />
        <InfoPill label="Durée" value={profileSummary.durationLabel} />
        <InfoPill label="Préférence" value={profileSummary.trainingLabel} />
      </View>

      {expanded ? (
        <View style={styles.expandedBlock}>
          <View style={styles.sectionDivider} />
          <InfoLine label="Disciplines" value={profileSummary.disciplines.join(" · ")} />
          <View style={styles.row}>
            <InfoLine label="Fatigue" value={profileSummary.fatigueLabel} />
            <InfoLine label="Niveau" value={profileSummary.levelLabel} />
          </View>
          <InfoLine label="Jours d'entraînement" value={profileSummary.trainingDays} />
          <InfoLine label="Matériel" value={profileSummary.equipmentList} />
          <InfoLine
            label="Contraintes santé"
            value={coachProfile.healthConstraints || "Aucune précisée"}
          />
          <InfoLine
            label="Autres préférences"
            value={coachProfile.otherPrefs || "Aucune précisée"}
          />

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeader}>PRs clés</Text>
          <View style={styles.chipRow}>
            {profileSummary.profilePRs.length === 0 ? (
              <Text style={styles.cardSubtitle}>Aucun record renseigné.</Text>
            ) : (
              profileSummary.profilePRs.map(([discipline, value]) => (
                <View key={discipline} style={styles.chipDark}>
                  <Text style={styles.chipDarkText}>{`${discipline} · ${value}`}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      ) : null}

      <PressableScale onPress={onToggle} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>
          {expanded ? "Réduire le profil" : "Voir le profil complet"}
        </Text>
      </PressableScale>
    </View>
  );
}

function WeekOverview({ sessions, onOpenPlanning, onOpenSession }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Ma semaine</Text>
        <View style={styles.accentPillLight}>
          <Text style={styles.accentPillLightText}>7 jours glissants</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>Planning automatique à partir d'aujourd'hui.</Text>
      <View style={styles.weekRow}>
        {sessions.map((session) => (
          <PressableScale
            key={session.id}
            style={session.isRest ? styles.restCard : styles.weekCard}
            onPress={() => onOpenSession(session)}
          >
            <View style={styles.weekCardHeader}>
              <View>
                <Text style={styles.weekDay}>{session.dayShort}</Text>
                <Text style={styles.weekDate}>{session.dateLabel}</Text>
              </View>
              {session.isToday ? (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
                </View>
              ) : null}
            </View>
            <View style={statusBadgeStyle(session.status)}>
              <Text style={styles.statusText}>{session.status}</Text>
            </View>
            <Text style={styles.weekTitle}>{session.title}</Text>
            <Text style={styles.weekMeta}>{session.duration}</Text>
            <View style={styles.tagRow}>
              {session.focus.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          </PressableScale>
        ))}
      </View>
      <PressableScale style={styles.primaryButton} onPress={onOpenPlanning}>
        <Text style={styles.primaryButtonText}>Voir le planning</Text>
      </PressableScale>
    </View>
  );
}

function PlanningScreen({
  planningTab,
  onTabChange,
  months,
  selectedMonthIndex,
  onSelectMonth,
  selectedWeekIndex,
  onSelectWeek,
  weekData,
  onBack,
  onOpenSession,
}) {
  const selectedMonth = months[selectedMonthIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="Planning" onBack={onBack} />
        <View style={styles.segmentedControl}>
          {planningTabs.map((tab) => (
            <PressableScale
              key={tab}
              style={tab === planningTab ? styles.segmentedActive : styles.segmentedInactive}
              onPress={() => onTabChange(tab)}
            >
              <Text
                style={
                  tab === planningTab ? styles.segmentedActiveText : styles.segmentedInactiveText
                }
              >
                {tab}
              </Text>
            </PressableScale>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Mois de l'année</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.monthRow}>
              {months.map((month, index) => (
                <PressableScale
                  key={month.label}
                  style={index === selectedMonthIndex ? styles.monthChipActive : styles.monthChip}
                  onPress={() => {
                    onSelectMonth(index);
                    onSelectWeek(0);
                  }}
                >
                  <Text
                    style={
                      index === selectedMonthIndex
                        ? styles.monthChipTextActive
                        : styles.monthChipText
                    }
                  >
                    {month.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </ScrollView>
        </View>

        {planningTab === "Mois" ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Semaines de {selectedMonth.label}</Text>
            <View style={styles.weekList}>
              {selectedMonth.weeks.map((week, index) => (
                <PressableScale
                  key={week.label}
                  style={index === selectedWeekIndex ? styles.weekCardActive : styles.weekCardLarge}
                  onPress={() => onSelectWeek(index)}
                >
                  <Text
                    style={
                      index === selectedWeekIndex
                        ? styles.weekCardTitleActive
                        : styles.weekCardTitle
                    }
                  >
                    {week.label}
                  </Text>
                  <Text
                    style={
                      index === selectedWeekIndex
                        ? styles.weekCardSubtitleActive
                        : styles.weekCardSubtitle
                    }
                  >
                    {week.range}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Semaine détaillée</Text>
          <Text style={styles.cardSubtitle}>
            {weekData?.range || "Sélectionne une semaine pour voir les détails."}
          </Text>
          <View style={styles.sessionGrid}>
            {weekData?.sessions.map((session) => (
              <PressableScale
                key={session.id}
                style={session.isRest ? styles.sessionCardRest : styles.sessionCard}
                onPress={() => onOpenSession(session)}
              >
                <View style={styles.sessionCardHeader}>
                  <View>
                    <Text style={styles.sessionCardDay}>{session.dayLabel}</Text>
                    <Text style={styles.sessionCardDate}>{session.dateLabel}</Text>
                  </View>
                  <View style={session.isRest ? styles.badgePositive : styles.badgeActive}>
                    <Text style={styles.badgeText}>{session.status}</Text>
                  </View>
                </View>
                <Text style={styles.sessionCardTitle}>{session.title}</Text>
                <Text style={styles.sessionCardMeta}>{session.duration}</Text>
                <View style={styles.tagRow}>
                  {session.focus.map((tag) => (
                    <View key={tag} style={styles.tagPillMuted}>
                      <Text style={styles.tagPillMutedText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressionScreen({ onBack, performanceEntries, onAddPerformance }) {
  const [discipline, setDiscipline] = useState(performanceDisciplines[0]);
  const [datePickers, setDatePickers] = useState({
    day: String(new Date().getDate()).padStart(2, "0"),
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
    year: String(new Date().getFullYear()),
  });
  const [performanceValue, setPerformanceValue] = useState("");
  const [activePicker, setActivePicker] = useState(null);

  const dayOptions = useMemo(() => buildNumberOptions(1, 31), []);
  const monthOptions = useMemo(() => buildNumberOptions(1, 12), []);
  const yearOptions = useMemo(() => buildYearOptions(), []);

  const entriesForDiscipline = performanceEntries.filter(
    (entry) => entry.discipline === discipline.label
  );
  const chartLabels = entriesForDiscipline.map((entry) => entry.date);
  const chartValues = entriesForDiscipline.map((entry) =>
    parseNumericValue(entry.value, discipline.unit)
  );

  const handleSubmit = () => {
    if (!performanceValue.trim()) return;
    const formattedValue = formatPerformanceValue(performanceValue, discipline.unit);
    onAddPerformance({
      discipline: discipline.label,
      date: `${datePickers.day}/${datePickers.month}/${datePickers.year}`,
      value: formattedValue,
    });
    setPerformanceValue("");
  };

  const formattedDate = `${datePickers.day}/${datePickers.month}/${datePickers.year}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="Progression" onBack={onBack} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ajouter une performance</Text>
          <Text style={styles.cardSubtitle}>Les graphiques se mettent à jour instantanément.</Text>
          <View style={styles.chipRow}>
            {performanceDisciplines.map((item) => (
              <PressableScale
                key={item.label}
                style={item.label === discipline.label ? styles.chipDark : styles.chipSoft}
                onPress={() => setDiscipline(item)}
              >
                <Text style={item.label === discipline.label ? styles.chipDarkText : styles.chipSoftText}>
                  {item.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          <View style={styles.datePickerGroup}>
            <DatePickerField
              label="Jour"
              value={datePickers.day}
              isOpen={activePicker === "day"}
              options={dayOptions}
              onToggle={() => setActivePicker(activePicker === "day" ? null : "day")}
              onSelect={(value) => {
                setDatePickers((prev) => ({ ...prev, day: value }));
                setActivePicker(null);
              }}
            />
            <DatePickerField
              label="Mois"
              value={datePickers.month}
              isOpen={activePicker === "month"}
              options={monthOptions}
              onToggle={() => setActivePicker(activePicker === "month" ? null : "month")}
              onSelect={(value) => {
                setDatePickers((prev) => ({ ...prev, month: value }));
                setActivePicker(null);
              }}
            />
            <DatePickerField
              label="Année"
              value={datePickers.year}
              isOpen={activePicker === "year"}
              options={yearOptions}
              onToggle={() => setActivePicker(activePicker === "year" ? null : "year")}
              onSelect={(value) => {
                setDatePickers((prev) => ({ ...prev, year: value }));
                setActivePicker(null);
              }}
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              placeholder={discipline.unit === "min:s" ? "Ex: 4:45" : "Valeur"}
              value={performanceValue}
              onChangeText={setPerformanceValue}
              style={styles.input}
              placeholderTextColor="#64748B"
            />
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>{discipline.unit}</Text>
            </View>
          </View>
          <PressableScale style={styles.primaryButtonBlue} onPress={handleSubmit}>
            <Text style={styles.primaryButtonBlueText}>Ajouter</Text>
          </PressableScale>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Courbe principale</Text>
            <Text style={styles.cardSubtitle}>{formattedDate}</Text>
          </View>
          {entriesForDiscipline.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucune performance enregistrée</Text>
              <Text style={styles.emptySubtitle}>
                Ajoute une première performance pour afficher la courbe.
              </Text>
            </View>
          ) : (
            <LineChart labels={chartLabels} series={[{ color: "#2563EB", data: chartValues }]} />
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Historique des performances</Text>
          {performanceEntries.length === 0 ? (
            <View style={styles.emptyStateSoft}>
              <Text style={styles.emptyTitle}>Aucune donnée</Text>
              <Text style={styles.emptySubtitle}>
                Tes performances apparaîtront ici après enregistrement.
              </Text>
            </View>
          ) : (
            <View style={styles.performanceList}>
              {performanceEntries.map((entry) => (
                <View key={entry.id} style={styles.performanceItem}>
                  <View>
                    <Text style={styles.performanceTitle}>{entry.discipline}</Text>
                    <Text style={styles.performanceMeta}>{entry.date}</Text>
                  </View>
                  <Text style={styles.performanceValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionDetailScreen({ session, onBack }) {
  const [difficulty, setDifficulty] = useState("ok");
  const [feedback, setFeedback] = useState("");
  const derivedIntervals = useMemo(() => buildIntervals(session), [session]);
  const [splits, setSplits] = useState(() =>
    Array.from({ length: derivedIntervals?.reps || 0 }, () => "")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showRecalc, setShowRecalc] = useState(false);
  const recalcProgress = useRef(new Animated.Value(0)).current;

  const showSplits = (derivedIntervals?.reps || 0) > 0;

  useEffect(() => {
    setSplits(Array.from({ length: derivedIntervals?.reps || 0 }, () => ""));
  }, [derivedIntervals]);

  const handleValidate = () => {
    Vibration.vibrate(3500);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowRecalc(true);
    }, 900);
  };

  const handleRecalculate = () => {
    setIsRecalculating(true);
    recalcProgress.setValue(0);
    Animated.timing(recalcProgress, {
      toValue: 1,
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => setIsRecalculating(false), 600);
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ScreenHeader title="Détail séance" onBack={onBack} />
        <View style={styles.sessionHero}>
          <Text style={styles.sessionHeroTitle}>{session.title}</Text>
          <Text style={styles.sessionHeroSubtitle}>
            {session.dayLabel} · {session.dateLabel} · {session.duration}
          </Text>
          <View style={styles.tagRow}>
            {session.focus.map((tag) => (
              <View key={tag} style={styles.tagPillDark}>
                <Text style={styles.tagPillDarkText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rappel de séance</Text>
          <Text style={styles.cardSubtitle}>{session.description}</Text>
          <View style={styles.sessionInfoRow}>
            <InfoPill label="Intensité" value={session.intensity} />
            <InfoPill label="Type" value={session.type} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Feedback</Text>
          <Text style={styles.cardSubtitle}>Comment tu t'es senti aujourd'hui ?</Text>
          <TextInput
            style={styles.feedbackInput}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Sensations, douleurs, énergie..."
            placeholderTextColor="#64748B"
            multiline
          />
          <Text style={styles.sectionHeader}>Difficulté</Text>
          <View style={styles.difficultyRow}>
            {[
              { key: "easy", label: "Trop facile" },
              { key: "ok", label: "Correct" },
              { key: "hard", label: "Trop dur" },
            ].map((item) => (
              <PressableScale
                key={item.key}
                style={difficulty === item.key ? styles.difficultyChipActive : styles.difficultyChip}
                onPress={() => setDifficulty(item.key)}
              >
                <Text
                  style={
                    difficulty === item.key ? styles.difficultyChipTextActive : styles.difficultyChipText
                  }
                >
                  {item.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          {showSplits ? (
            <View style={styles.splitBlock}>
              <Text style={styles.sectionHeader}>{`Temps ${derivedIntervals.reps}x${derivedIntervals.label}`}</Text>
              <View style={styles.splitGrid}>
                {splits.map((value, index) => (
                  <View key={`split-${index}`} style={styles.splitInputWrapper}>
                    <Text style={styles.splitLabel}>{index + 1}</Text>
                    <TextInput
                      style={styles.splitInput}
                      value={value}
                      onChangeText={(text) =>
                        setSplits((prev) => prev.map((item, idx) => (idx === index ? text : item)))
                      }
                      placeholder="12.4"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <PressableScale style={styles.primaryButtonBlue} onPress={handleValidate}>
          <Text style={styles.primaryButtonBlueText}>Valider le feedback</Text>
        </PressableScale>
        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.loadingText}>Validation et recalcul en cours...</Text>
          </View>
        ) : null}

        {showRecalc ? (
          <View style={styles.recalcCard}>
            <Text style={styles.recalcTitle}>Ajuster le plan ?</Text>
            <Text style={styles.recalcSubtitle}>
              Le plan peut s'ajuster selon ton ressenti et tes performances.
            </Text>
            <PressableScale style={styles.primaryButton} onPress={handleRecalculate}>
              <Text style={styles.primaryButtonText}>
                {isRecalculating ? "Ajustement..." : "Oui, ajuster le plan"}
              </Text>
            </PressableScale>
            {isRecalculating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#0B0D12" />
                <Text style={styles.loadingText}>Recalcul des prochaines semaines...</Text>
              </View>
            ) : null}
            {isRecalculating ? (
              <View style={styles.recalcBar}>
                <Animated.View
                  style={[
                    styles.recalcFill,
                    {
                      width: recalcProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["5%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChatCoachScreen({ coachName, onBack }) {
  const title = coachName ? `Parler à ${coachName}` : "Parler au coach";
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <ScreenHeader title={title} onBack={onBack} />
          <View style={styles.chatEmpty}>
            <Text style={styles.chatEmptyTitle}>Conversation prête</Text>
            <Text style={styles.chatEmptySubtitle}>
              Le chat sera connecté bientôt. Tu peux déjà préparer tes questions.
            </Text>
          </View>
        </View>
        <View style={styles.chatInputBar}>
          <TextInput
            placeholder="Écrire un message..."
            style={styles.chatInput}
            placeholderTextColor="#94A3B8"
            editable={false}
          />
          <View style={styles.chatSendButtonDisabled}>
            <Text style={styles.chatSendTextDisabled}>Envoyer</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <View style={styles.screenHeader}>
      <PressableScale style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Retour</Text>
      </PressableScale>
      <Text style={styles.screenTitle}>{title}</Text>
    </View>
  );
}

function ProgressBlock({ onOpenProgress }) {
  return (
    <View style={styles.progressCard}>
      <View>
        <Text style={styles.progressTitle}>Progression</Text>
        <Text style={styles.progressSubtitle}>Visualise tes performances réelles.</Text>
      </View>
      <PressableScale style={styles.progressButton} onPress={onOpenProgress}>
        <Text style={styles.progressButtonText}>Voir ma progression</Text>
      </PressableScale>
    </View>
  );
}

function PrimaryCTA({ label, onPress }) {
  return (
    <PressableScale style={styles.primaryButtonLarge} onPress={onPress}>
      <Text style={styles.primaryButtonLargeText}>{label}</Text>
    </PressableScale>
  );
}

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

function DatePickerField({ label, value, isOpen, options, onToggle, onSelect }) {
  return (
    <View style={styles.datePickerField}>
      <PressableScale style={styles.dateSelector} onPress={onToggle}>
        <Text style={styles.dateSelectorLabel}>{label}</Text>
        <Text style={styles.dateSelectorValue}>{value}</Text>
      </PressableScale>
      {isOpen ? (
        <View style={styles.datePickerRow}>
          {options.map((option) => (
            <PressableScale
              key={option}
              style={option === value ? styles.dateChipActive : styles.dateChip}
              onPress={() => onSelect(option)}
            >
              <Text style={option === value ? styles.dateChipTextActive : styles.dateChipText}>
                {option}
              </Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LineChart({ labels, series }) {
  const [width, setWidth] = useState(280);
  const height = 140;
  const padding = 18;

  const normalized = series.map((serie) => {
    const max = Math.max(...serie.data, 1);
    const min = Math.min(...serie.data, 0);
    const range = max - min || 1;
    return serie.data.map((value, index) => {
      const x = padding + (index / Math.max(serie.data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y, value };
    });
  });

  return (
    <View
      style={styles.lineChart}
      onLayout={(event) => {
        const layoutWidth = event.nativeEvent.layout.width;
        if (layoutWidth) setWidth(layoutWidth);
      }}
    >
      <View style={styles.lineChartGrid} />
      {normalized.map((points, seriesIndex) => (
        <View key={`series-${seriesIndex}`} style={StyleSheet.absoluteFill}>
          {points.map((point, index) => {
            if (index === points.length - 1) return null;
            const nextPoint = points[index + 1];
            const dx = nextPoint.x - point.x;
            const dy = nextPoint.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`line-${seriesIndex}-${index}`}
                style={{
                  position: "absolute",
                  left: point.x,
                  top: point.y,
                  width: length,
                  height: 2,
                  backgroundColor: series[seriesIndex].color,
                  transform: [{ rotateZ: `${angle}deg` }],
                }}
              />
            );
          })}
          {points.map((point, index) => (
            <View
              key={`dot-${seriesIndex}-${index}`}
              style={{
                position: "absolute",
                left: point.x - 4,
                top: point.y - 4,
                width: 8,
                height: 8,
                borderRadius: 6,
                backgroundColor: series[seriesIndex].color,
                borderWidth: 2,
                borderColor: "#F4F5F7",
              }}
            />
          ))}
        </View>
      ))}
      {labels.length > 0 ? (
        <View style={styles.lineChartLabels}>
          {labels.slice(-4).map((label) => (
            <Text key={label} style={styles.lineChartLabelText}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PressableScale({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function statusBadgeStyle(status) {
  if (status === "Repos") return styles.statusBadgeRest;
  if (status === "Séance") return styles.statusBadgeTodo;
  return styles.statusBadgeSkipped;
}

function buildRollingWeek(sessionMap) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const dayKey = getDayKey(date);
    const session = buildSessionForDate(date, sessionMap);
    return {
      ...session,
      id: `${dayKey}-${date.toDateString()}`,
      dayKey,
      dayShort: SHORT_DAY_LABELS[dayKey],
      dayLabel: FULL_DAY_LABELS[dayKey],
      dateLabel: formatDate(date),
      isToday: index === 0,
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
    const weekStart = weekDays[0].dateLabel;
    const weekEnd = weekDays[6].dateLabel;
    weeks.push({
      label: `Semaine ${weekIndex + 1}`,
      range: `${weekStart} → ${weekEnd}`,
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
    };
  }

  return {
    title: session.title || "Séance",
    duration: session.duration || "Durée à définir",
    focus: session.objectives?.length ? session.objectives : ["À définir"],
    status: "Séance",
    description: session.description || "Séance personnalisée.",
    intensity: session.intensity || "À définir",
    type: session.type || "À définir",
    hasSession: true,
    isRest: false,
    intervals: session.intervals || null,
  };
}

function buildIntervals(session) {
  if (!session) return null;
  if (session.intervals?.reps && session.intervals?.label) {
    return session.intervals;
  }
  const source = `${session.title || ""} ${session.description || ""}`.toLowerCase();
  const match = source.match(/(\\d+)\\s*x\\s*(\\d+)\\s*(m|km)?/i);
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
  if (unit === "min:s") {
    return trimmed.includes(":") ? `${trimmed} min:s` : `${trimmed} min:s`;
  }
  return trimmed.includes(unit) ? trimmed : `${trimmed} ${unit}`;
}

function buildNumberOptions(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    String(start + index).padStart(2, "0")
  );
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
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function formatISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  container: {
    backgroundColor: "#F4F5F7",
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 48,
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 6,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#52607A",
  },
  headerState: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 6,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#0B0D12",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0B0D12",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    marginBottom: 18,
    shadowColor: "#0B0D12",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0B0D12",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#52607A",
  },
  accentBadge: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  accentBadgeText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  accentPillLight: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  accentPillLightText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  profileIdentity: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B0D12",
  },
  profileSubtitle: {
    fontSize: 14,
    color: "#52607A",
    marginTop: 4,
  },
  profileMetaCardLight: {
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    maxWidth: "48%",
  },
  profileMetaLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    color: "#2563EB",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  profileMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B0D12",
  },
  profileQuickInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  infoPill: {
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
  },
  infoPillLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  infoPillValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B0D12",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },
  infoLine: {
    flex: 1,
    minWidth: "45%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    color: "#0B0D12",
    fontWeight: "600",
  },
  expandedBlock: {
    marginTop: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 10,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  chipSoft: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipSoftText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
  chipDark: {
    backgroundColor: "#0B0D12",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipDarkText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#0B0D12",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonBlue: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonBlueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonLarge: {
    backgroundColor: "#0B0D12",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonLargeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "column",
    gap: 12,
    paddingVertical: 12,
  },
  weekCard: {
    width: "100%",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.12)",
  },
  restCard: {
    width: "100%",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.18)",
  },
  weekDay: {
    fontSize: 12,
    color: "#52607A",
    fontWeight: "600",
  },
  weekDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  weekTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 6,
    marginTop: 8,
  },
  weekMeta: {
    fontSize: 13,
    color: "#52607A",
    marginBottom: 6,
  },
  weekCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  todayBadge: {
    backgroundColor: "#0B0D12",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  todayBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagPillText: {
    color: "#0B0D12",
    fontSize: 11,
    fontWeight: "600",
  },
  tagPillMuted: {
    backgroundColor: "#F4F5F7",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagPillMutedText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  tagPillDark: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagPillDarkText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadgeTodo: {
    backgroundColor: "#0B0D12",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeSkipped: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeRest: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0B0D12",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  segmentedActive: {
    backgroundColor: "#0B0D12",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  segmentedActiveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentedInactive: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  segmentedInactiveText: {
    color: "#0B0D12",
    fontSize: 12,
    fontWeight: "600",
  },
  weekList: {
    gap: 12,
    marginBottom: 16,
  },
  weekCardLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.1)",
  },
  weekCardActive: {
    backgroundColor: "#0B0D12",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  weekCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0D12",
  },
  weekCardTitleActive: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  weekCardSubtitle: {
    fontSize: 13,
    color: "#52607A",
    marginTop: 4,
  },
  weekCardSubtitleActive: {
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 4,
  },
  sessionGrid: {
    flexDirection: "column",
    gap: 12,
  },
  sessionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  sessionCardRest: {
    width: "100%",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.16)",
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sessionCardDay: {
    fontSize: 12,
    color: "#52607A",
    fontWeight: "600",
  },
  sessionCardDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  sessionCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 6,
  },
  sessionCardMeta: {
    fontSize: 12,
    color: "#52607A",
    marginBottom: 6,
  },
  badgeActive: {
    backgroundColor: "rgba(37, 99, 235, 0.16)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgePositive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    color: "#0B0D12",
    fontWeight: "600",
  },
  monthRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  monthChip: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  monthChipActive: {
    backgroundColor: "#0B0D12",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  monthChipText: {
    color: "#0B0D12",
    fontSize: 12,
    fontWeight: "600",
  },
  monthChipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  progressCard: {
    backgroundColor: "#0B0D12",
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#E5E7EB",
    marginBottom: 12,
  },
  progressButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0B0D12",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  progressButtonText: {
    color: "#0B0D12",
    fontSize: 15,
    fontWeight: "700",
  },
  datePickerGroup: {
    gap: 8,
    marginBottom: 10,
  },
  datePickerField: {
    marginBottom: 8,
  },
  dateSelector: {
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  dateSelectorLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  dateSelectorValue: {
    fontSize: 14,
    color: "#0B0D12",
    fontWeight: "600",
  },
  datePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  dateChip: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  dateChipActive: {
    backgroundColor: "#0B0D12",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dateChipText: {
    color: "#0B0D12",
    fontSize: 12,
    fontWeight: "600",
  },
  dateChipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    color: "#0B0D12",
    marginBottom: 12,
  },
  unitBadge: {
    backgroundColor: "#0B0D12",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  unitBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  performanceList: {
    gap: 12,
    marginTop: 8,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.08)",
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B0D12",
  },
  performanceMeta: {
    fontSize: 12,
    color: "#52607A",
    marginTop: 4,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyState: {
    backgroundColor: "#F4F5F7",
    borderRadius: 18,
    padding: 16,
  },
  emptyStateSoft: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#52607A",
  },
  chatEmpty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  chatEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 6,
  },
  chatEmptySubtitle: {
    fontSize: 13,
    color: "#52607A",
  },
  chatInputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#F4F5F7",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    color: "#0B0D12",
  },
  chatSendButtonDisabled: {
    backgroundColor: "rgba(15, 23, 42, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  chatSendTextDisabled: {
    color: "#94A3B8",
    fontWeight: "700",
  },
  sessionHero: {
    backgroundColor: "#0B0D12",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  sessionHeroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  sessionHeroSubtitle: {
    fontSize: 13,
    color: "#E2E8F0",
    marginBottom: 12,
  },
  sessionInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  feedbackInput: {
    backgroundColor: "#F4F5F7",
    borderRadius: 16,
    padding: 12,
    minHeight: 110,
    textAlignVertical: "top",
    marginTop: 12,
    marginBottom: 16,
    color: "#0B0D12",
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  difficultyChip: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  difficultyChipActive: {
    backgroundColor: "#0B0D12",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  difficultyChipText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  difficultyChipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  splitBlock: {
    marginTop: 16,
  },
  splitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  splitInputWrapper: {
    width: "30%",
  },
  splitLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 6,
  },
  splitInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    color: "#0B0D12",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    color: "#52607A",
    fontSize: 12,
    fontWeight: "600",
  },
  recalcCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginTop: 20,
  },
  recalcTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B0D12",
    marginBottom: 6,
  },
  recalcSubtitle: {
    fontSize: 13,
    color: "#52607A",
    marginBottom: 12,
  },
  recalcBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    overflow: "hidden",
  },
  recalcFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  lineChart: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#F4F5F7",
    overflow: "hidden",
  },
  lineChartGrid: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    borderRadius: 16,
  },
  lineChartLabels: {
    position: "absolute",
    bottom: 6,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lineChartLabelText: {
    fontSize: 10,
    color: "#64748B",
  },
});
