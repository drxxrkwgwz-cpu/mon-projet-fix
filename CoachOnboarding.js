"use strict";
// CoachOnboarding.js
// Expo / React Native (JavaScript)
// Dépendances (Expo) :
//   npx expo install expo-haptics
//
// Modifs appliquées selon tes règles :
// - AUCUN mot coupé : suppression de numberOfLines partout
// - 2 colonnes MAX : suppression grid3 + wrappers en 2 colonnes strictes
// - Style clair, contrasté, cartes glass + sélection noire
// - Clavier stable : pas de state global sur chaque caractère, keyboardShouldPersistTaps="always"
// - Icône info : uniquement en haut à droite, remplacée par la coche quand sélectionné
// - Durée de séance : PAS de "i" -> texte explicatif en dessous dans la carte
// - Jours : liste verticale, 1 jour par ligne, pleine largeur

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

const COLORS = {
  bg: "#F5F7FB",
  text: "#0F1117",
  subText: "rgba(15,17,23,0.70)",
  card: "rgba(15,17,26,0.08)",
  cardSoft: "rgba(15,17,26,0.12)",
  border: "rgba(15,17,26,0.10)",
  border2: "rgba(15,17,26,0.16)",
  primary: "#2563EB",
  muted: "rgba(15,17,26,0.48)",
  shadow: "rgba(15,17,26,0.16)",
  black: "#0B0D12",
  white: "#FFFFFF",
};

const STEP_COUNT = 7;

const DAY_LABELS = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];

const LEVELS = [
  { key: "debutant", title: "Débutant", desc: "Non sportif ou reprise d’activité, avec l’envie de progresser" },
  { key: "intermediaire", title: "Intermédiaire", desc: "Pratique occasionnelle, sans régularité stricte" },
  { key: "avance", title: "Avancé", desc: "Pratique régulière, entraînements structurés" },
  { key: "departemental", title: "Départemental", desc: "Compétition à niveau départemental sur ta discipline" },
  { key: "regional", title: "Régional", desc: "Compétition à niveau régional" },
  { key: "national_haut", title: "National / Haut niveau", desc: "Compétition nationale ou niveau élite" },
];

const DURATION_PREFS = [
  { key: "courte", title: "Courte", desc: "30 à 45 minutes" },
  { key: "moyenne", title: "Moyenne", desc: "45 à 90 minutes" },
  { key: "longue", title: "Longue", desc: "90 minutes et +" },
];

const TRAINING_PREFS = [
  { key: "volume", title: "Volume", desc: "Plus de séances, progression sur la durée" },
  { key: "qualite", title: "Qualité", desc: "Séances ciblées, intensité élevée" },
  { key: "equilibre", title: "Équilibré", desc: "Un bon équilibre entre volume et intensité" },
  { key: "adaptatif", title: "Adaptatif (Coach IA)", desc: "Je laisse le coach ajuster selon ma forme" },
];

const FATIGUE_OPTIONS = [
  { key: "en_forme", title: "En forme", emoji: "🙂" },
  { key: "normal", title: "Normal", emoji: "😐" },
  { key: "fatigue", title: "Fatigué", emoji: "😴" },
];

// LISTE EXACTE DU MATÉRIEL (conforme à ta liste, rien en plus, rien en moins)
const EQUIPMENT_OPTIONS = [
  { key: "piste", title: "Piste d’athlétisme" },
  { key: "stade", title: "Stade" },
  { key: "salle", title: "Salle de musculation" },
  { key: "haies", title: "Haies" },
  { key: "blocs", title: "Blocs de départ" },
  { key: "medecine_ball", title: "Médecine ball" },
  { key: "halteres", title: "Haltères / Poids" },
  { key: "elastiques", title: "Élastiques" },
  { key: "sled", title: "Sled / Traîneau" },
  { key: "tapis", title: "Tapis de course" },
  { key: "chrono_gps", title: "Chronomètre / GPS" },
  { key: "aucun", title: "Aucun matériel" },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// (Le reste de tes disciplines reste inchangé)
const ALL_DISCIPLINES = [
  { id: "100m", label: "100 m", category: "Sprints" },
  { id: "200m", label: "200 m", category: "Sprints" },
  { id: "400m", label: "400 m", category: "Sprints" },
  { id: "300m", label: "300 m", category: "Autres (meeting)" },
  { id: "60m", label: "60 m", category: "Indoor (spécifiques)" },
  { id: "55m", label: "55 m", category: "Indoor (spécifiques)" },
  { id: "50m", label: "50 m", category: "Indoor (spécifiques)" },

  { id: "110mh", label: "110 m haies", category: "Haies" },
  { id: "100mh", label: "100 m haies", category: "Haies" },
  { id: "400mh", label: "400 m haies", category: "Haies" },
  { id: "300mh", label: "300 m haies", category: "Autres (meeting)" },
  { id: "60mh", label: "60 m haies", category: "Indoor (spécifiques)" },
  { id: "55mh", label: "55 m haies", category: "Indoor (spécifiques)" },
  { id: "50mh", label: "50 m haies", category: "Indoor (spécifiques)" },

  { id: "800m", label: "800 m", category: "Demi-fond" },
  { id: "1000m", label: "1000 m", category: "Autres (meeting)" },
  { id: "1500m", label: "1500 m", category: "Demi-fond" },
  { id: "mile", label: "Mile (1609 m)", category: "Autres (meeting)" },
  { id: "3000m", label: "3000 m", category: "Demi-fond" },
  { id: "2000m", label: "2000 m", category: "Autres (meeting)" },
  { id: "600m", label: "600 m", category: "Autres (meeting)" },

  { id: "5000m", label: "5000 m", category: "Fond" },
  { id: "10000m", label: "10 000 m", category: "Fond" },

  { id: "3000st", label: "3000 m steeple", category: "Steeple" },
  { id: "2000st", label: "2000 m steeple", category: "Steeple" },

  { id: "4x100", label: "4 × 100 m", category: "Relais" },
  { id: "4x200", label: "4 × 200 m", category: "Relais" },
  { id: "4x400", label: "4 × 400 m", category: "Relais" },
  { id: "4x800", label: "4 × 800 m", category: "Relais" },
  { id: "4x1500", label: "4 × 1500 m", category: "Relais" },
  { id: "4x400mix", label: "4 × 400 m mixte", category: "Relais" },
  { id: "relais_suedois", label: "Relais suédois (100-200-300-400)", category: "Relais" },

  { id: "3000walk", label: "3000 m marche", category: "Marche" },
  { id: "5000walk", label: "5000 m marche", category: "Marche" },
  { id: "10000walk", label: "10 000 m marche", category: "Marche" },
  { id: "20k_walk", label: "20 km marche", category: "Marche" },
  { id: "35k_walk", label: "35 km marche", category: "Marche" },
  { id: "50k_walk", label: "50 km marche", category: "Marche" },

  { id: "lj", label: "Saut en longueur", category: "Sauts" },
  { id: "tj", label: "Triple saut", category: "Sauts" },
  { id: "hj", label: "Saut en hauteur", category: "Sauts" },
  { id: "pv", label: "Saut à la perche", category: "Sauts" },

  { id: "shot", label: "Lancer du poids", category: "Lancers" },
  { id: "discus", label: "Lancer du disque", category: "Lancers" },
  { id: "hammer", label: "Lancer du marteau", category: "Lancers" },
  { id: "javelin", label: "Lancer du javelot", category: "Lancers" },

  { id: "decathlon", label: "Décathlon", category: "Combinées" },
  { id: "heptathlon", label: "Heptathlon", category: "Combinées" },
  { id: "pentathlon", label: "Pentathlon (indoor)", category: "Combinées" },
  { id: "octathlon", label: "Octathlon", category: "Combinées" },
  { id: "tetrathlon", label: "Tétrathlon", category: "Combinées" },
  { id: "triathlon", label: "Triathlon", category: "Combinées" },

  { id: "5k_road", label: "5 km route", category: "Route" },
  { id: "10k_road", label: "10 km route", category: "Route" },
  { id: "half", label: "Semi-marathon", category: "Route" },
  { id: "marathon", label: "Marathon", category: "Route" },
  { id: "mile_road", label: "Mile route", category: "Route" },

  { id: "cross_court", label: "Cross (court)", category: "Cross" },
  { id: "cross_long", label: "Cross (long)", category: "Cross" },
  { id: "cross_relais", label: "Cross (relais)", category: "Cross" },

  { id: "mountain", label: "Course en montagne", category: "Trail & ultra" },
  { id: "trail", label: "Trail", category: "Trail & ultra" },
  { id: "ultra", label: "Ultra / ultra-trail", category: "Trail & ultra" },
];

const CATEGORY_ORDER = [
  "Sprints",
  "Haies",
  "Demi-fond",
  "Fond",
  "Steeple",
  "Relais",
  "Marche",
  "Sauts",
  "Lancers",
  "Combinées",
  "Route",
  "Cross",
  "Trail & ultra",
  "Indoor (spécifiques)",
  "Autres (meeting)",
];

function groupDisciplines(disciplines) {
  const map = new Map();
  for (const d of disciplines) {
    if (!map.has(d.category)) map.set(d.category, []);
    map.get(d.category).push(d);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
    title: c,
    data: map.get(c).sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

function useScreenTransition(deps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(14);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { opacity, translateY };
}

function useShake() {
  const x = useRef(new Animated.Value(0)).current;

  const shake = () => {
    x.setValue(0);
    Animated.sequence([
      Animated.timing(x, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(x, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(x, { toValue: 4, duration: 45, useNativeDriver: true }),
      Animated.timing(x, { toValue: -4, duration: 45, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  return { x, shake };
}

function StepHeader({ step, title, subtitle }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.progressRow}>
        <Text style={styles.stepSmall}>Étape {step} sur {STEP_COUNT}</Text>
      </View>

      <View style={styles.progressPills}>
        {Array.from({ length: STEP_COUNT }).map((_, i) => {
          const active = i < step;
          return (
            <View
              key={i}
              style={[
                styles.pill,
                active ? { backgroundColor: COLORS.primary } : { backgroundColor: "rgba(15,17,26,0.12)" },
                i === step - 1 ? styles.pillCurrent : null,
              ]}
            />
          );
        })}
      </View>

      {title ? <Text style={styles.h1}>{title}</Text> : null}
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

function PrimaryButton({ label, disabled, onPress }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && styles.primaryBtnDisabled,
        pressed && !disabled ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <Text style={[styles.primaryBtnText, disabled && { color: "rgba(255,255,255,0.75)" }]}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        disabled ? { opacity: 0.45 } : null,
        pressed && !disabled ? { opacity: 0.75 } : null,
      ]}
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function StableTextInput({ initialValue = "", onValueChange, style, ...rest }) {
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback(
    (text) => {
      setLocalValue(text);
      if (onValueChange) onValueChange(text);
    },
    [onValueChange]
  );

  return (
    <TextInput
      value={localValue}
      onChangeText={handleChange}
      blurOnSubmit={false}
      style={style}
      {...rest}
    />
  );
}

// Icône info : TOUJOURS en haut à droite
function InfoButton({ onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.infoBtn}>
      <Text style={styles.infoBtnText}>i</Text>
    </Pressable>
  );
}

function SelectCard({
  title,
  selected,
  onPress,
  compact,
  infoText,
  onPressInfo,
  center = false,
  subtitle,
}) {
  const showInfo = !!infoText && !selected;
  const showCheck = selected;

  return (
    <Pressable onPress={onPress} style={{ width: "100%" }}>
      <View
        style={[
          styles.selectCard,
          compact && styles.selectCardCompact,
          selected ? styles.selectCardOn : null,
        ]}
      >
        {showInfo ? <InfoButton onPress={onPressInfo} /> : null}
        {showCheck ? (
          <View style={styles.checkBadgeTopRight}>
            <Text style={styles.checkBadgeText}>✓</Text>
          </View>
        ) : null}

        <View style={[styles.selectContent, center ? { alignItems: "center" } : null]}>
          <Text style={[styles.selectTitle, selected && { color: COLORS.white }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.selectSub, selected && { color: "rgba(255,255,255,0.82)" }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function InfoModal({ visible, title, text, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.infoOverlay} onPress={onClose}>
        <Pressable style={styles.infoModal} onPress={() => {}}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.infoCloseBtn}>
              <Text style={styles.infoCloseText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.infoText}>{text}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SlotCard({ label, value, onPress, onClear }) {
  const hasValue = !!value;
  return (
    <Pressable onPress={onPress} style={{ width: "100%" }}>
      <View style={[styles.slotCard, hasValue ? styles.slotCardFilled : null]}>
        <Text style={[styles.slotLabel, hasValue ? { color: "rgba(255,255,255,0.72)" } : null]}>{label}</Text>

        {/* AUCUN numberOfLines -> texte peut passer à la ligne */}
        <Text style={[styles.slotValue, hasValue ? { color: COLORS.white } : null]}>
          {hasValue ? value : "Choisir une discipline"}
        </Text>

        {hasValue ? (
          <Pressable onPress={onClear} hitSlop={10} style={styles.slotClear}>
            <Text style={styles.slotClearText}>×</Text>
          </Pressable>
        ) : null}

        {hasValue ? (
          <View style={styles.checkBadgeTopRight}>
            <Text style={styles.checkBadgeText}>✓</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function CoachOnboarding({ navigation, route, onDone }) {
  const [step, setStep] = useState(1);

  const coachCallsYouRef = useRef("");
  const prsRef = useRef({});
  const healthConstraintsRef = useRef("");
  const goalTitleRef = useRef("");
  const goalDateTextRef = useRef("");
  const otherPrefsRef = useRef("");

  const [disciplineSlots, setDisciplineSlots] = useState([null, null, null]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);

  const [level, setLevel] = useState(null);
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(null);
  const [durationPref, setDurationPref] = useState(null);
  const [trainingPref, setTrainingPref] = useState(null);
  const [days, setDays] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [fatigue, setFatigue] = useState(null);

  const [disciplinesModalOpen, setDisciplinesModalOpen] = useState(false);
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [infoModal, setInfoModal] = useState({ open: false, title: "", text: "" });

  const { opacity, translateY } = useScreenTransition([step]);
  const { x: shakeX, shake } = useShake();

  const disciplineMap = useMemo(() => new Map(ALL_DISCIPLINES.map((d) => [d.id, d])), []);
  const selectedDisciplineIds = useMemo(() => {
    const ids = disciplineSlots.filter(Boolean);
    return Array.from(new Set(ids));
  }, [disciplineSlots]);

  const selectedDisciplines = useMemo(() => {
    return selectedDisciplineIds.map((id) => disciplineMap.get(id)).filter(Boolean);
  }, [selectedDisciplineIds, disciplineMap]);

  const filteredDisciplines = useMemo(() => {
    const q = disciplineSearch.trim().toLowerCase();
    if (!q) return ALL_DISCIPLINES;
    return ALL_DISCIPLINES.filter((d) => `${d.label} ${d.category}`.toLowerCase().includes(q));
  }, [disciplineSearch]);

  const disciplineSections = useMemo(() => groupDisciplines(filteredDisciplines), [filteredDisciplines]);

  const canGoNext = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return selectedDisciplineIds.length > 0;
    if (step === 3) return level !== null;
    if (step === 4) return frequencyPerWeek !== null && durationPref !== null && trainingPref !== null;
    if (step === 5) return days.length > 0;
    if (step === 6) return true;
    if (step === 7) return fatigue !== null;
    return false;
  }, [step, selectedDisciplineIds, level, frequencyPerWeek, durationPref, trainingPref, days, fatigue]);

  const isStepValid = () => {
    if (step === 1) return coachCallsYouRef.current.trim().length > 0;
    if (step === 2) return selectedDisciplineIds.length > 0;
    if (step === 3) return level !== null;
    if (step === 4) return frequencyPerWeek !== null && durationPref !== null && trainingPref !== null;
    if (step === 5) return days.length > 0;
    if (step === 6) return true;
    if (step === 7) return fatigue !== null;
    return false;
  };

  const tryNext = async () => {
    if (!isStepValid()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      shake();
      return;
    }
    await Haptics.selectionAsync();
    setStep((s) => clamp(s + 1, 1, STEP_COUNT));
  };

  const goBack = async () => {
    await Haptics.selectionAsync();
    setStep((s) => clamp(s - 1, 1, STEP_COUNT));
  };

  const openDisciplinesPickerForSlot = async (slotIndex) => {
    await Haptics.selectionAsync();
    setActiveSlotIndex(slotIndex);
    setDisciplineSearch("");
    setDisciplinesModalOpen(true);
  };

  const setSlotDiscipline = async (slotIndex, disciplineId) => {
    await Haptics.selectionAsync();
    setDisciplineSlots((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex((x, i) => x === disciplineId && i !== slotIndex);
      if (existingIndex !== -1) next[existingIndex] = next[slotIndex];
      next[slotIndex] = disciplineId;
      return next;
    });

    setDisciplinesModalOpen(false);
    setActiveSlotIndex(null);
  };

  const clearSlot = async (slotIndex) => {
    await Haptics.selectionAsync();
    setDisciplineSlots((prev) => {
      const next = [...prev];
      const removedId = next[slotIndex];
      next[slotIndex] = null;

      const stillUsed = next.includes(removedId);
      if (!stillUsed && removedId) {
        const nextPrs = { ...prsRef.current };
        delete nextPrs[removedId];
        prsRef.current = nextPrs;
      }
      return next;
    });
  };

  const addSlot = async () => {
    await Haptics.selectionAsync();
    setDisciplineSlots((prev) => [...prev, null]);
  };

  const toggleDay = async (k) => {
    await Haptics.selectionAsync();
    setDays((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const toggleEquip = async (k) => {
    await Haptics.selectionAsync();
    setEquipment((prev) => {
      if (k === "aucun") return prev.includes("aucun") ? [] : ["aucun"];
      const withoutAucun = prev.filter((x) => x !== "aucun");
      if (withoutAucun.includes(k)) return withoutAucun.filter((x) => x !== k);
      return [...withoutAucun, k];
    });
  };

  const submitProfile = async () => {
    if (!isStepValid()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      shake();
      return;
    }

    const payload = {
      coachCallsYou: coachCallsYouRef.current.trim(),
      disciplines: selectedDisciplines.map((d) => d.label),
      level,
      prs: Object.fromEntries(
        selectedDisciplines
          .map((d) => [d.label, (prsRef.current[d.id] || "").trim()])
          .filter(([, v]) => v.length > 0)
      ),
      frequencyPerWeek,
      durationPref,
      trainingPref,
      days: days
        .slice()
        .sort((a, b) => DAY_LABELS.findIndex((d) => d.key === a) - DAY_LABELS.findIndex((d) => d.key === b)),
      equipment,
      healthConstraints: healthConstraintsRef.current.trim(),
      fatigue,
      goal: goalTitleRef.current.trim()
        ? { title: goalTitleRef.current.trim(), dateText: goalDateTextRef.current.trim() || null }
        : null,
      otherPrefs: otherPrefsRef.current.trim(),
    };

    console.log("Coach onboarding payload:", payload);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Profil créé", "Ton profil est prêt.");

    if (typeof onDone === "function") onDone(payload);
    if (navigation && navigation.replace) {
      navigation.replace("CoachDashboard", { coachProfile: payload });
    }
  };

  const Screen = () => (
    <Animated.View style={{ opacity, transform: [{ translateY }, { translateX: shakeX }] }}>
      {step === 1 ? (
        <>
          <StepHeader step={1} title="Coach IA" subtitle="On règle ça en quelques secondes" />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comment veux-tu que je t’appelle ?</Text>
            <Text style={styles.cardSub}>Ton coach s’adapte à toi dès maintenant</Text>

            <StableTextInput
              initialValue={coachCallsYouRef.current}
              onValueChange={(text) => {
                coachCallsYouRef.current = text;
              }}
              placeholder="Ex : Tom, Alex, Coach…"
              placeholderTextColor="rgba(15,17,23,0.35)"
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <Text style={styles.hint}>Tu pourras le modifier plus tard</Text>
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepHeader
            step={2}
            title="Objectif principal"
            subtitle="Choisis tes disciplines (tu peux en sélectionner plusieurs)"
          />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tes spécialités</Text>

            <View style={styles.grid2}>
              {disciplineSlots.map((id, idx) => {
                const d = id ? disciplineMap.get(id) : null;
                return (
                  <View key={`slot-${idx}`} style={styles.col2}>
                    <SlotCard
                      label={`Épreuve ${idx + 1}`}
                      value={d?.label || ""}
                      onPress={() => openDisciplinesPickerForSlot(idx)}
                      onClear={() => clearSlot(idx)}
                    />
                  </View>
                );
              })}

              <View style={styles.col2}>
                <Pressable onPress={addSlot} style={{ width: "100%" }}>
                  <View style={[styles.slotCard, styles.slotAdd]}>
                    <Text style={styles.slotAddText}>+ Ajouter</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <Text style={styles.hint}>
              Astuce : tu peux rechercher. Tout ce qui n’est pas sélectionné est considéré comme indisponible.
            </Text>

            <Modal
              visible={disciplinesModalOpen}
              animationType="slide"
              onRequestClose={() => {
                setDisciplinesModalOpen(false);
                setActiveSlotIndex(null);
              }}
            >
              <SafeAreaView style={styles.modalRoot}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Choisir une discipline</Text>
                  <Pressable
                    onPress={() => {
                      setDisciplinesModalOpen(false);
                      setActiveSlotIndex(null);
                    }}
                    hitSlop={10}
                  >
                    <Text style={styles.modalClose}>Fermer</Text>
                  </Pressable>
                </View>

                <View style={styles.modalSearchWrap}>
                  <TextInput
                    value={disciplineSearch}
                    onChangeText={setDisciplineSearch}
                    placeholder="Rechercher (ex : 400, marathon, haies…)"
                    placeholderTextColor="rgba(15,17,23,0.35)"
                    style={styles.modalSearch}
                    blurOnSubmit={false}
                  />
                </View>

                <SectionList
                  sections={disciplineSections}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 28 }}
                  keyboardShouldPersistTaps="always"
                  renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
                  renderItem={({ item }) => {
                    const isInAnySlot = selectedDisciplineIds.includes(item.id);
                    const isThisSlot = activeSlotIndex !== null && disciplineSlots[activeSlotIndex] === item.id;

                    return (
                      <Pressable
                        onPress={() => {
                          if (activeSlotIndex === null) return;
                          setSlotDiscipline(activeSlotIndex, item.id);
                        }}
                        style={({ pressed }) => [styles.disciplineRow, pressed ? { opacity: 0.75 } : null]}
                      >
                        <Text style={styles.disciplineLabel}>{item.label}</Text>
                        <View style={[styles.checkDot, (isInAnySlot || isThisSlot) && styles.checkDotOn]} />
                      </Pressable>
                    );
                  }}
                />
              </SafeAreaView>
            </Modal>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepHeader step={3} title="Ton niveau" subtitle="Cela permet d’adapter les entraînements à ton profil" />

          <View style={styles.grid2}>
            {LEVELS.map((l) => (
              <View key={l.key} style={styles.col2}>
                <SelectCard
                  title={l.title}
                  selected={level === l.key}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setLevel(l.key);
                  }}
                  infoText={l.desc}
                  onPressInfo={() => setInfoModal({ open: true, title: l.title, text: l.desc })}
                />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Records personnels (optionnel)</Text>
            {selectedDisciplines.length === 0 ? (
              <Text style={styles.hint}>Choisis d’abord au moins une discipline à l’étape 2.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {selectedDisciplines.map((d) => (
                  <View key={d.id} style={styles.prRow}>
                    <Text style={styles.prLabel}>{d.label}</Text>
                    <StableTextInput
                      initialValue={prsRef.current[d.id] || ""}
                      onValueChange={(text) => {
                        prsRef.current = { ...prsRef.current, [d.id]: text };
                      }}
                      placeholder="Ex : 48.90 ou 1’52"
                      placeholderTextColor="rgba(15,17,23,0.35)"
                      style={styles.prInput}
                      returnKeyType="done"
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <StepHeader step={4} title="Rythme d’entraînement" subtitle="Dis-moi comment tu veux t’entraîner" />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fréquence par semaine</Text>

            {/* 2 COLONNES MAX -> grid2 */}
            <View style={styles.grid2}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <View key={n} style={styles.col2}>
                  <SelectCard
                    title={`${n}`}
                    selected={frequencyPerWeek === n}
                    compact
                    center
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setFrequencyPerWeek(n);
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ height: 12 }} />

            <Text style={styles.sectionTitle}>Durée de séance préférée</Text>

            {/* IMPORTANT : PAS de "i" -> desc affichée DIRECTEMENT sous le titre */}
            <View style={styles.grid2}>
              {DURATION_PREFS.map((d) => (
                <View key={d.key} style={styles.col2}>
                  <SelectCard
                    title={d.title}
                    subtitle={d.desc}
                    selected={durationPref === d.key}
                    compact={false}
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setDurationPref(d.key);
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ height: 12 }} />

            <Text style={styles.sectionTitle}>Préférence d’entraînement</Text>
            <View style={styles.grid2}>
              {TRAINING_PREFS.map((p) => (
                <View key={p.key} style={styles.col2}>
                  <SelectCard
                    title={p.title}
                    selected={trainingPref === p.key}
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setTrainingPref(p.key);
                    }}
                    infoText={p.desc}
                    onPressInfo={() => setInfoModal({ open: true, title: p.title, text: p.desc })}
                  />
                </View>
              ))}
            </View>

            <Text style={styles.hint}>Tu pourras ajuster ça plus tard.</Text>
          </View>
        </>
      ) : null}

      {step === 5 ? (
        <>
          <StepHeader step={5} title="Jours d’entraînement" subtitle="Sélectionne tous les jours où tu es disponible" />

          {/* IMPORTANT : VERTICAL / 1 JOUR PAR LIGNE / PLEINE LARGEUR */}
          <View style={styles.card}>
            <View style={{ gap: 10 }}>
              {DAY_LABELS.map((d) => {
                const selected = days.includes(d.key);
                return (
                  <Pressable key={d.key} onPress={() => toggleDay(d.key)} style={{ width: "100%" }}>
                    <View style={[styles.dayRow, selected ? styles.dayRowOn : null]}>
                      <Text style={[styles.dayRowText, selected ? { color: COLORS.white } : null]}>{d.label}</Text>
                      {selected ? (
                        <View style={styles.dayRowCheck}>
                          <Text style={styles.checkBadgeText}>✓</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.hint}>Au moins un jour est nécessaire.</Text>
          </View>
        </>
      ) : null}

      {step === 6 ? (
        <>
          <StepHeader step={6} title="Matériel" subtitle="Sélectionne tout ce dont tu disposes" />

          <View style={styles.card}>
            <View style={styles.grid2}>
              {EQUIPMENT_OPTIONS.map((e) => {
                const selected = equipment.includes(e.key);
                return (
                  <View key={e.key} style={styles.col2}>
                    <SelectCard
                      title={e.title}
                      selected={selected}
                      onPress={() => toggleEquip(e.key)}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={styles.hint}>Si tu coches “Aucun matériel”, les autres se désactivent automatiquement.</Text>
          </View>
        </>
      ) : null}

      {step === 7 ? (
        <>
          <StepHeader step={7} title="Derniers détails" subtitle="Pour personnaliser au maximum ton programme" />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contraintes santé (optionnel)</Text>
            <StableTextInput
              initialValue={healthConstraintsRef.current}
              onValueChange={(text) => {
                healthConstraintsRef.current = text;
              }}
              placeholder="Blessures, douleurs, restrictions…"
              placeholderTextColor="rgba(15,17,23,0.35)"
              multiline
              style={[styles.textarea, { minHeight: 96 }]}
            />

            <View style={{ height: 14 }} />

            <Text style={styles.sectionTitle}>Niveau de fatigue actuel</Text>

            {/* 2 COLONNES MAX -> grid2 */}
            <View style={styles.grid2}>
              {FATIGUE_OPTIONS.map((f) => (
                <View key={f.key} style={styles.col2}>
                  <SelectCard
                    title={`${f.emoji} ${f.title}`}
                    selected={fatigue === f.key}
                    compact
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setFatigue(f.key);
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ height: 14 }} />

            <Text style={styles.sectionTitle}>Objectif spécifique (optionnel)</Text>
            <Text style={styles.hint}>Exemple : “Marathon” + “dans 2 semaines”.</Text>

            <StableTextInput
              initialValue={goalTitleRef.current}
              onValueChange={(text) => {
                goalTitleRef.current = text;
              }}
              placeholder="Ex : Marathon, compétition 800 m, championnat…"
              placeholderTextColor="rgba(15,17,23,0.35)"
              style={styles.input}
            />
            <StableTextInput
              initialValue={goalDateTextRef.current}
              onValueChange={(text) => {
                goalDateTextRef.current = text;
              }}
              placeholder="Date ou délai (ex : 2026-02-10 ou dans 2 semaines)"
              placeholderTextColor="rgba(15,17,23,0.35)"
              style={styles.input}
            />

            <View style={{ height: 14 }} />

            <Text style={styles.sectionTitle}>Autres préférences (optionnel)</Text>
            <StableTextInput
              initialValue={otherPrefsRef.current}
              onValueChange={(text) => {
                otherPrefsRef.current = text;
              }}
              placeholder="Style d’entraînement, choses que tu aimes / n’aimes pas…"
              placeholderTextColor="rgba(15,17,23,0.35)"
              multiline
              style={[styles.textarea, { minHeight: 96 }]}
            />
          </View>
        </>
      ) : null}

      <View style={styles.footer}>
        <SecondaryButton label="Retour" disabled={step === 1} onPress={goBack} />
        {step < 7 ? (
          <PrimaryButton label="Suivant" disabled={!canGoNext} onPress={tryNext} />
        ) : (
          <PrimaryButton label="Créer mon profil" disabled={!canGoNext} onPress={submitProfile} />
        )}
      </View>

      <InfoModal
        visible={infoModal.open}
        title={infoModal.title}
        text={infoModal.text}
        onClose={() => setInfoModal({ open: false, title: "", text: "" })}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <Screen />
          <View style={{ height: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // centrage vertical quand l’écran est “court”, scroll OK quand c’est long
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    justifyContent: "center",
  },

  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepSmall: { color: COLORS.subText, fontSize: 13 },
  progressPills: { flexDirection: "row", gap: 7, marginTop: 10, marginBottom: 16 },
  pill: { height: 5, flex: 1, borderRadius: 99 },
  pillCurrent: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },

  h1: { color: COLORS.text, fontSize: 28, letterSpacing: -0.5, fontWeight: "900" },
  sub: { color: COLORS.subText, fontSize: 15, marginTop: 6, lineHeight: 20 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  cardSub: { color: COLORS.subText, fontSize: 14, marginTop: 6, marginBottom: 12, lineHeight: 19 },

  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "900", marginBottom: 10, letterSpacing: -0.2 },
  hint: { color: COLORS.subText, fontSize: 13, marginTop: 10, lineHeight: 18 },

  input: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginTop: 10,
  },
  textarea: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginTop: 10,
    textAlignVertical: "top",
  },

  // 2 colonnes max strictes
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 12,
    marginBottom: 12,
  },
  col2: {
    width: "48%",
  },

  selectCard: {
    minHeight: 92,
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    position: "relative",
  },
  selectCardCompact: { minHeight: 84 },
  selectCardOn: { backgroundColor: COLORS.black, borderColor: COLORS.primary },

  selectContent: { padding: 16, gap: 8 },
  selectTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  selectSub: { color: COLORS.subText, fontSize: 13.5, lineHeight: 18 },

  checkBadgeTopRight: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    zIndex: 2,
  },
  checkBadgeText: { color: COLORS.white, fontSize: 14, fontWeight: "900", lineHeight: 14 },

  // Info : TOP RIGHT, jamais au milieu, jamais remplacée
  infoBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15,17,26,0.18)",
    backgroundColor: "rgba(15,17,26,0.08)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  infoBtnText: { color: COLORS.text, fontWeight: "900", fontSize: 12, lineHeight: 12 },

  // STEP 5 : jours verticaux pleine largeur
  dayRow: {
    width: "100%",
    minHeight: 66,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
  },
  dayRowOn: { backgroundColor: COLORS.black, borderColor: COLORS.primary },
  dayRowText: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  dayRowCheck: {
    position: "absolute",
    right: 14,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  footer: { marginTop: 14, flexDirection: "row", gap: 10, alignItems: "center" },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { backgroundColor: "rgba(37,99,235,0.35)" },
  primaryBtnText: { color: COLORS.white, fontWeight: "900", fontSize: 15, letterSpacing: -0.2 },
  secondaryBtn: {
    width: 112,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: "900", fontSize: 14 },

  prRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prLabel: { width: 110, color: COLORS.text, fontWeight: "900", fontSize: 13.5 },
  prInput: {
    flex: 1,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },

  slotCard: {
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,
    padding: 16,
    justifyContent: "center",
    position: "relative",
  },
  slotCardFilled: { backgroundColor: COLORS.black, borderColor: COLORS.primary },
  slotLabel: { fontSize: 12.5, fontWeight: "900", color: COLORS.muted, marginBottom: 8 },
  slotValue: { fontSize: 15.5, fontWeight: "900", color: COLORS.text, lineHeight: 20 },

  slotClear: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotClearText: { color: COLORS.white, fontSize: 18, fontWeight: "900", lineHeight: 18 },

  slotAdd: {
    borderStyle: "dashed",
    backgroundColor: COLORS.cardSoft,
  },
  slotAddText: { fontSize: 15, fontWeight: "900", color: COLORS.text },

  modalRoot: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  modalClose: { fontSize: 14, fontWeight: "900", color: COLORS.primary },
  modalSearchWrap: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  modalSearch: {
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: COLORS.text,
  },
  sectionHeader: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    color: COLORS.subText,
    fontWeight: "900",
    fontSize: 12.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  disciplineRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingRight: 48,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,17,26,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  disciplineLabel: { color: COLORS.text, fontSize: 15, fontWeight: "900" },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(15,17,26,0.28)",
    backgroundColor: "transparent",
    position: "absolute",
    top: 14,
    right: 18,
  },
  checkDotOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },

  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 18,
    justifyContent: "center",
  },
  infoModal: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15,17,26,0.12)",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    paddingRight: 12,
  },
  infoText: {
    color: "rgba(15,17,26,0.84)",
    fontSize: 14,
    lineHeight: 20,
  },
  infoCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,17,26,0.08)",
    borderWidth: 1,
    borderColor: "rgba(15,17,26,0.14)",
  },
  infoCloseText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: -1,
  },
});
