import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  UIManager,
  View,
} from "react-native";
import { supabase } from "./src/lib/supabase";
import {
  LEVEL_LABELS,
  DURATION_LABELS,
  TRAINING_LABELS,
  FATIGUE_LABELS,
  FULL_DAY_LABELS,
  EQUIPMENT_LABELS,
  emptyCoachProfile,
  mapProfileFromDb,
  mapWorkouts,
  mapFeedbackToPerformanceEntries,
  buildSessionMap,
  buildRollingWeek,
  buildYearPlanning,
  formatISODate,
  styles,
} from "./backend";
import {
  DashboardHeader,
  ProfileCard,
  WeekOverview,
  ProgressBlock,
  PrimaryCTA,
} from "./Accueil";
import PlanningScreen, { CurrentWeekScreen } from "./Planning";
import ProgressionScreen from "./Progression";
import ChatCoachScreen from "./Coaching";
import SessionDetailScreen, { PressableScale } from "./SessionDetail";

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session?.access_token || null;
}

function buildEdgeProfilePayload(coachProfile) {
  const disciplines = Array.isArray(coachProfile?.disciplines) ? coachProfile.disciplines : [];
  return {
    sport_specialty: disciplines[0] || "",
    disciplines,
    prs: coachProfile?.prs || {},
    level: coachProfile?.level || "",
    frequency_per_week: Number(coachProfile?.frequencyPerWeek || 0),
    duration_pref: coachProfile?.durationPref || "",
    training_pref: coachProfile?.trainingPref || "",
    days: Array.isArray(coachProfile?.days) ? coachProfile.days : [],
    equipment: Array.isArray(coachProfile?.equipment) ? coachProfile.equipment : [],
    health_constraints: coachProfile?.healthConstraints || "",
    fatigue_baseline: coachProfile?.fatigue || "",
    goal: coachProfile?.goal || null,
    other_prefs: coachProfile?.otherPrefs || "",
    coach_name: coachProfile?.coachName || "",
    coach_calls_you: coachProfile?.coachCallsYou || "",
  };
}

const TAB_CONFIG = [
  { key: "accueil", label: "Accueil", icon: "⌂" },
  { key: "progression", label: "Progression", icon: "◔" },
  { key: "coach", label: "Coach", icon: "◎" },
  { key: "planning", label: "Planning", icon: "▦" },
  { key: "parametres", label: "Paramètres", icon: "⚙" },
];

function ParametresScreen() {
  return (
    <View style={localStyles.simpleScreen}>
      <Text style={localStyles.simpleScreenTitle}>Paramètres</Text>
    </View>
  );
}

function TabButton({ tab, active, onPress }) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, activeAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 15,
      stiffness: 290,
      mass: 0.75,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 290,
      mass: 0.75,
    }).start();
  };

  const indicatorOpacity = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Pressable
      style={localStyles.tabButton}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          localStyles.activeIndicator,
          {
            opacity: indicatorOpacity,
            transform: [{ scaleX: activeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <Text style={[localStyles.tabIcon, active ? localStyles.tabIconActive : null]}>{tab.icon}</Text>
      </Animated.View>
      <Text style={[localStyles.tabLabel, active ? localStyles.tabLabelActive : null]}>{tab.label}</Text>
    </Pressable>
  );
}

export default function CoachDashboard({ navigation }) {
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [planningTab, setPlanningTab] = useState("Semaine");
  const [routeState, setRouteState] = useState({ name: "Dashboard", params: {} });
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState("accueil");

  const [sessionUserId, setSessionUserId] = useState(null);
  const [coachProfile, setCoachProfile] = useState(emptyCoachProfile);
  const [workoutSessions, setWorkoutSessions] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);

  const screenAnim = useRef(new Animated.Value(0)).current;
  const tabScreenAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    screenAnim.setValue(0);
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [routeState.name, screenAnim]);

  useEffect(() => {
    tabScreenAnim.setValue(0.9);
    Animated.timing(tabScreenAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabScreenAnim]);

  const sessionMap = useMemo(() => buildSessionMap(workoutSessions || []), [workoutSessions]);

  const initialPerformanceEntries = useMemo(
    () => mapFeedbackToPerformanceEntries(feedbackHistory || []),
    [feedbackHistory]
  );
  const [performanceEntries, setPerformanceEntries] = useState(initialPerformanceEntries);

  useEffect(() => {
    setPerformanceEntries(initialPerformanceEntries);
  }, [initialPerformanceEntries]);

  const profileSummary = useMemo(() => {
    const levelLabel = LEVEL_LABELS[coachProfile.level] || "À définir";
    const fatigueLabel = FATIGUE_LABELS[coachProfile.fatigue] || "À définir";
    const frequencyLabel = coachProfile.frequencyPerWeek
      ? `${coachProfile.frequencyPerWeek} séances / semaine`
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
  const chatLabel = coachName ? `Parler à ${coachName}` : "Parler au coach";

  const rollingWeek = useMemo(() => buildRollingWeek(sessionMap), [sessionMap]);
  const planningMonths = useMemo(() => buildYearPlanning(sessionMap), [sessionMap]);

  const selectedMonth = planningMonths[selectedMonthIndex];
  const selectedWeek = selectedMonth?.weeks[selectedWeekIndex] || selectedMonth?.weeks[0];

  const hasProfile = Boolean(coachProfile?.user_id);
  const isLoggedIn = Boolean(sessionUserId);

  const fetchData = useCallback(async () => {
    console.log("🔄 [CoachDashboard] fetchData START");
    setIsLoadingProfile(true);

    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data?.session) {
      console.log("❌ [CoachDashboard] No session");
      setSessionUserId(null);
      setCoachProfile(emptyCoachProfile);
      setWorkoutSessions([]);
      setFeedbackHistory([]);
      setIsLoadingProfile(false);
      return;
    }

    const userId = data.session.user.id;
    console.log("✅ [CoachDashboard] User ID:", userId);
    setSessionUserId(userId);

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const daysUntilMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysUntilMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startKey = formatISODate(monday);
    const endKey = formatISODate(sunday);
    const weekId = `${userId}-${startKey}`;

    console.log("📅 [CoachDashboard] Fetching week:", startKey, "→", endKey);
    console.log("🔑 [CoachDashboard] Week ID:", weekId);

    const [profileRes, workoutsRes, feedbackRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .eq("week_id", weekId)
        .order("workout_date", { ascending: true }),
      supabase
        .from("feedback")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (profileRes.error) {
      console.error("❌ [CoachDashboard] Profile error:", profileRes.error);
      Alert.alert("Erreur", profileRes.error.message || "Impossible de charger le profil.");
    }

    if (workoutsRes.error) {
      console.error("❌ [CoachDashboard] Workouts error:", workoutsRes.error);
    } else {
      console.log(`✅ [CoachDashboard] Workouts fetched: ${workoutsRes.data?.length || 0} rows`);
      if (workoutsRes.data && workoutsRes.data.length > 0) {
        console.log("📋 [CoachDashboard] First workout sample:", JSON.stringify(workoutsRes.data[0], null, 2));
      }
    }

    setCoachProfile(mapProfileFromDb(profileRes.data));
    setWorkoutSessions(mapWorkouts(workoutsRes.data));
    setFeedbackHistory(feedbackRes.data || []);
    setIsLoadingProfile(false);
    console.log("✅ [CoachDashboard] fetchData DONE");
  }, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await fetchData();
    };

    run();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setSessionUserId(null);
        setCoachProfile(emptyCoachProfile);
        setWorkoutSessions([]);
        setFeedbackHistory([]);
        setIsLoadingProfile(false);
        return;
      }
      fetchData();
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [fetchData]);

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

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSessionUserId(null);
      setCoachProfile(emptyCoachProfile);
      setWorkoutSessions([]);
      setFeedbackHistory([]);
      setSelectedSession(null);
      setRouteState({ name: "Dashboard", params: {} });
      setActiveTab("accueil");
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Impossible de se déconnecter.");
    }
  }, []);

  const handleGoLogin = useCallback(() => {
    if (navigation?.navigate) navigation.navigate("Auth");
    else Alert.alert("Connexion", "Ajoute une route 'Auth' dans ta navigation.");
  }, [navigation]);

  const handleGenerateWeek = useCallback(async () => {
    console.log("🚀 [handleGenerateWeek] START");
    if (!isLoggedIn) {
      Alert.alert("Connexion requise", "Connecte-toi pour générer une semaine.");
      return;
    }
    try {
      setIsGeneratingWeek(true);

      const freq = coachProfile?.frequencyPerWeek ? coachProfile.frequencyPerWeek : 4;
      const profilePayload = buildEdgeProfilePayload(coachProfile);
      console.log(`📊 [handleGenerateWeek] Frequency: ${freq} sessions/week`);
      console.log("📦 [handleGenerateWeek] Profile payload:", JSON.stringify(profilePayload, null, 2));

      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error("❌ [handleGenerateWeek] No access token");
        Alert.alert("Connexion requise", "Connecte-toi pour générer une semaine.");
        return;
      }

      console.log("🔗 [handleGenerateWeek] Calling Edge Function...");
      const { data, error } = await supabase.functions.invoke("generate_week", {
        body: {
          sessionsPerWeek: freq,
          profile: profilePayload,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        console.error("❌ [handleGenerateWeek] Edge Function error:", error);
        Alert.alert("Erreur génération", error.message || "Erreur Edge Function.");
        return;
      }

      console.log("📦 [handleGenerateWeek] Edge Function response:", data);

      if (!data?.success) {
        console.error("❌ [handleGenerateWeek] Generation failed:", data?.error);
        Alert.alert("Erreur génération", data?.error || "Réponse invalide.");
        return;
      }

      console.log("✅ [handleGenerateWeek] Generation SUCCESS");
      console.log("🔄 [handleGenerateWeek] Fetching updated data...");

      await fetchData();

      console.log("✅ [handleGenerateWeek] Data refreshed");
      Alert.alert("OK", "Semaine générée et enregistrée.");

      setTimeout(() => {
        console.log("➡️ [handleGenerateWeek] Navigating to CurrentWeek...");
        openRoute("CurrentWeek");
      }, 300);
    } catch (e) {
      console.error("❌ [handleGenerateWeek] Unexpected error:", e);
      Alert.alert("Erreur", e?.message || "Erreur inconnue");
    } finally {
      setIsGeneratingWeek(false);
      console.log("🏁 [handleGenerateWeek] END");
    }
  }, [coachProfile, fetchData, isLoggedIn, openRoute]);

  const screenStyle = {
    opacity: screenAnim,
    transform: [
      {
        translateY: screenAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  const tabScreenStyle = {
    opacity: tabScreenAnim,
    transform: [
      {
        scale: tabScreenAnim.interpolate({
          inputRange: [0.9, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  const renderAccueilTab = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, localStyles.scrollContentWithTabs]}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
    >
      <DashboardHeader
        title="Coach IA"
        subtitle={`${goalTitle} · ${goalDate}`}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      {isLoadingProfile ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : null}

      {!isLoadingProfile && !isLoggedIn ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connexion</Text>
          <Text style={styles.cardSubtitle}>
            Connecte-toi pour retrouver ton profil, tes séances et ta progression.
          </Text>
          <PressableScale style={styles.primaryButtonBlue} onPress={handleGoLogin}>
            <Text style={styles.primaryButtonBlueText}>Se connecter</Text>
          </PressableScale>
        </View>
      ) : null}

      {!isLoadingProfile && isLoggedIn && !hasProfile ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenue</Text>
          <Text style={styles.cardSubtitle}>
            Ton profil n'est pas encore créé. Lance l'onboarding pour démarrer.
          </Text>
          <PressableScale
            style={styles.primaryButtonBlue}
            onPress={() => navigation?.navigate?.("CoachOnboarding")}
          >
            <Text style={styles.primaryButtonBlueText}>Faire l'onboarding</Text>
          </PressableScale>
        </View>
      ) : null}

      {isLoggedIn && hasProfile ? (
        <ProfileCard
          coachProfile={coachProfile}
          profileSummary={profileSummary}
          expanded={isProfileExpanded}
          onToggle={toggleProfile}
        />
      ) : null}

      <WeekOverview
        sessions={rollingWeek}
        onOpenPlanning={() => {
          setActiveTab("planning");
        }}
        onOpenCurrentWeek={() => openRoute("CurrentWeek")}
        onOpenSession={handleOpenSession}
        onGenerateWeek={handleGenerateWeek}
        isGeneratingWeek={isGeneratingWeek}
        isLoggedIn={isLoggedIn}
      />

      <ProgressBlock onOpenProgress={() => setActiveTab("progression")} />

      <PrimaryCTA
        label={isLoggedIn ? chatLabel : "Connexion requise"}
        onPress={() => {
          if (!isLoggedIn) {
            Alert.alert("Connexion requise", "Connecte-toi pour accéder au chat.");
            return;
          }
          setActiveTab("coach");
        }}
      />
    </ScrollView>
  );

  const renderActiveTab = () => {
    if (activeTab === "progression") {
      return (
        <ProgressionScreen
          onBack={() => setActiveTab("accueil")}
          performanceEntries={performanceEntries}
          onAddPerformance={(entry) =>
            setPerformanceEntries((prev) => [{ id: `perf-${Date.now()}`, ...entry }, ...prev])
          }
        />
      );
    }

    if (activeTab === "coach") {
      return <ChatCoachScreen coachName={coachName} onBack={() => setActiveTab("accueil")} />;
    }

    if (activeTab === "planning") {
      return (
        <PlanningScreen
          planningTab={planningTab}
          onTabChange={setPlanningTab}
          months={planningMonths}
          selectedMonthIndex={selectedMonthIndex}
          onSelectMonth={setSelectedMonthIndex}
          selectedWeekIndex={selectedWeekIndex}
          onSelectWeek={setSelectedWeekIndex}
          weekData={selectedWeek}
          rollingWeek={rollingWeek}
          onBack={() => setActiveTab("accueil")}
          onOpenSession={handleOpenSession}
        />
      );
    }

    if (activeTab === "parametres") {
      return <ParametresScreen />;
    }

    return renderAccueilTab();
  };

  if (routeState.name === "CurrentWeek") {
    return (
      <Animated.View style={[styles.screenWrapper, screenStyle]}>
        <CurrentWeekScreen
          rollingWeek={rollingWeek}
          onBack={() => openRoute("Dashboard")}
          onOpenSession={handleOpenSession}
          onGenerateNextWeek={handleGenerateWeek}
          isGeneratingWeek={isGeneratingWeek}
        />
      </Animated.View>
    );
  }

  if (routeState.name === "SessionDetail" && selectedSession) {
    return (
      <Animated.View style={[styles.screenWrapper, screenStyle]}>
        <SessionDetailScreen
          session={selectedSession}
          onBack={() => openRoute("Dashboard")}
          userId={sessionUserId}
          onSaved={fetchData}
        />
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, localStyles.safeAreaEnhanced]}>
      <Animated.View style={[localStyles.tabScreenContainer, tabScreenStyle]}>{renderActiveTab()}</Animated.View>

      <View style={localStyles.tabBarWrapper}>
        <View style={localStyles.tabBar}>
          {TAB_CONFIG.map((tab) => (
            <TabButton
              key={tab.key}
              tab={tab}
              active={activeTab === tab.key}
              onPress={() => {
                if (routeState.name !== "Dashboard") {
                  setRouteState({ name: "Dashboard", params: {} });
                }
                setActiveTab(tab.key);
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const localStyles = {
  safeAreaEnhanced: {
    flex: 1,
    backgroundColor: "transparent",
  },
  tabScreenContainer: {
    flex: 1,
  },
  scrollContentWithTabs: {
    paddingBottom: 132,
  },
  tabBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  tabBar: {
    width: "100%",
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: 16, android: 10, default: 10 }),
    paddingHorizontal: 8,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingVertical: 4,
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 22,
    height: 2,
    borderRadius: 99,
    backgroundColor: "#2563EB",
  },
  tabIcon: {
    color: "#A6B3CE",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  tabIconActive: {
    color: "#2563EB",
  },
  tabLabel: {
    fontSize: 11,
    color: "#A6B3CE",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#2563EB",
  },
  simpleScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#060A14",
    paddingBottom: 86,
  },
  simpleScreenTitle: {
    color: "#F2F5FF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
};
