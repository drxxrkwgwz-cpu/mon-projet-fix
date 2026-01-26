import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get("window");

/* ===================== DESIGN ===================== */
const GRAD = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

const C = {
  cyan: "#00C6FF",
  cyan2: "#00E0FF",
  aqua: "#3FCEF9",
  good: "#00E0FF",
  mid: "#FFD166",
  bad: "#EF476F",
  glassBorder: "rgba(255,255,255,0.14)",
  glassFill: "rgba(255,255,255,0.06)",
};

const softVibrate = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

/* ===================== GLASS ===================== */
const Glass = ({ children, style, pad = 18 }) => (
  <View
    style={[
      {
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.glassBorder,
        backgroundColor: C.glassFill,
      },
      style,
    ]}
  >
    <BlurView tint="dark" intensity={35} style={StyleSheet.absoluteFill} />
    <View style={{ padding: pad }}>{children}</View>
  </View>
);

/* ===================== ANIM UTILS ===================== */
const useScreenEnterAnim = () => {
  const fade = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(move, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, move]);

  return { fade, move };
};

const AnimatedPress = ({
  children,
  onPress,
  style,
  disabled,
  hitSlop,
  pressScale = 0.97,
}) => {
  const s = useRef(new Animated.Value(1)).current;

  const onIn = () => {
    if (disabled) return;
    Animated.spring(s, {
      toValue: pressScale,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  };

  const onOut = () => {
    Animated.spring(s, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: s }] }, style]}>
      <TouchableOpacity
        hitSlop={hitSlop}
        activeOpacity={0.9}
        disabled={disabled}
        onPressIn={onIn}
        onPressOut={onOut}
        onPress={() => {
          if (disabled) return;
          softVibrate();
          onPress && onPress();
        }}
        style={{ width: "100%" }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

function scoreMeta(score) {
  if (score >= 75) return { label: "Très bonne récupération", color: C.good, icon: "checkmark-circle" };
  if (score < 55) return { label: "Fatigue détectée, prudence", color: C.bad, icon: "warning" };
  return { label: "Récup moyenne, à soigner", color: C.mid, icon: "alert-circle" };
}

/* ===================== SCORE LOGIC ===================== */
function calculateRecoveryScore({ sleepHours, sleepQuality, fatigue, soreness, hydration }) {
  let sleepDurationScore = 60;
  if (sleepHours >= 7.5 && sleepHours <= 9) sleepDurationScore = 100;
  else if (sleepHours >= 7 && sleepHours < 7.5) sleepDurationScore = 90;
  else if (sleepHours > 9 && sleepHours <= 10) sleepDurationScore = 90;
  else if (sleepHours < 6) sleepDurationScore = 40;

  const sleepQualityScore = (sleepQuality / 5) * 100;
  const sleepScore = sleepDurationScore * 0.6 + sleepQualityScore * 0.4;

  const fatigueScore = (fatigue / 5) * 100;
  const sorenessScore = soreness === "low" ? 100 : soreness === "medium" ? 70 : 40;
  const hydrationScore = Math.min(hydration / 2.5, 1) * 100;

  const total =
    sleepScore * 0.4 +
    fatigueScore * 0.25 +
    sorenessScore * 0.2 +
    hydrationScore * 0.15;

  return Math.round(total);
}

function buildRecoveryInsights(data, score) {
  if (!data || score == null) {
    return {
      why: [],
      tips: [],
      headline: "",
    };
  }

  const why = [];
  const tips = [];

  // Sommeil
  if (data.sleepHours != null) {
    if (data.sleepHours < 6.5) {
      why.push("Ton score baisse surtout à cause d’un manque de sommeil.");
      tips.push("Objectif : 7h30–9h. Ce soir, couche-toi plus tôt (même 30–45 min ça change tout).");
    } else if (data.sleepHours < 7.5) {
      why.push("Durée de sommeil un peu courte pour une récup optimale.");
      tips.push("Vise +30 min de sommeil. Priorité : régularité (heure de coucher stable).");
    }
  }

  if (data.sleepQuality != null) {
    if (data.sleepQuality <= 2) {
      why.push("Qualité de sommeil faible (récup nerveuse moins bonne).");
      tips.push("Avant de dormir : écran coupé 30 min, douche tiède, respiration 2–3 min.");
    } else if (data.sleepQuality === 3) {
      why.push("Qualité de sommeil moyenne.");
      tips.push("Optimise la chambre : frais, sombre, et une routine simple (5–10 min).");
    }
  }

  // Fatigue
  if (data.fatigue != null) {
    if (data.fatigue <= 2) {
      why.push("Fatigue ressentie élevée, ton système est encore chargé.");
      tips.push("Aujourd’hui : baisse la charge ou fais une séance technique/qualité courte + récup active.");
    } else if (data.fatigue === 3) {
      why.push("Fatigue modérée.");
      tips.push("Reste intelligent : échauffement long + récup post-séance sérieuse.");
    }
  }

  // Courbatures
  if (data.soreness) {
    if (data.soreness === "high") {
      why.push("Courbatures fortes, donc réserve musculaire basse.");
      tips.push("Priorité : mobilité douce + marche/vélo 10–15 min. Évite les impacts lourds aujourd’hui.");
    } else if (data.soreness === "medium") {
      why.push("Courbatures modérées.");
      tips.push("Ajoute 8–12 min de mobilité + auto-massage léger sur la zone sensible.");
    }
  }

  // Hydratation
  if (data.hydration != null) {
    if (data.hydration < 1.5) {
      why.push("Hydratation trop basse, ça ralentit la récup.");
      tips.push("Objectif simple : 2–3 L. Commence par 500 mL dans l’heure qui vient + petites prises régulières.");
    } else if (data.hydration < 2.2) {
      why.push("Hydratation un peu juste.");
      tips.push("Ajoute 500–800 mL sur la journée, surtout autour de la séance.");
    }
  }

  let headline = "";
  if (score >= 85) headline = "Très solide. Garde la routine, et évite juste de surcharger pour rien.";
  else if (score >= 75) headline = "Bon niveau. Tu peux t’entraîner, mais reste propre sur la récup.";
  else if (score >= 55) headline = "Moyen. Tu peux faire une séance, mais optimise les fondamentaux.";
  else headline = "Bas. Aujourd’hui, priorité à récupérer et éviter de creuser la fatigue.";

  if (why.length === 0) {
    why.push("Ton score est cohérent avec tes réponses. Pas d’alerte majeure.");
  }
  if (tips.length === 0) {
    tips.push("Maintiens : sommeil régulier, hydratation 2–3 L, et récup post-séance simple (10–15 min).");
  }

  return { why, tips, headline };
}

/* ===================== SCORE REVEAL OVERLAY (LENT + PERSISTANT) ===================== */
function ScoreRevealOverlay({ visible, score, data, onClose }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const bar = useRef(new Animated.Value(0)).current;

  const insights = useMemo(() => buildRecoveryInsights(data, score || 0), [data, score]);

  useEffect(() => {
    if (!visible) return;

    fade.setValue(0);
    scale.setValue(0.92);
    bar.setValue(0);

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }),
    ]).start();

    Animated.timing(bar, {
      toValue: Math.max(0, Math.min(100, score || 0)),
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, score, fade, scale, bar]);

  if (!visible) return null;

  const meta = scoreMeta(score || 0);
  const barWidth = bar.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.scoreOverlayRoot}>
      <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.scoreOverlayBackdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.scoreOverlayCardWrap,
          { opacity: fade, transform: [{ scale }] },
        ]}
      >
        <Glass pad={16}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
            <Text style={[styles.scoreOverlayTitle, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>

          <View style={styles.scoreOverlayRow}>
            <Text style={styles.scoreOverlayLabel}>Score</Text>
            <Text style={styles.scoreOverlayValue}>
              {score == null ? "—" : `${score}/100`}
            </Text>
          </View>

          <View style={styles.scoreOverlayTrack}>
            <Animated.View style={[styles.scoreOverlayFill, { width: barWidth }]} />
          </View>

          <Text style={styles.scoreOverlayHint}>{insights.headline}</Text>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.insightTitle}>Pourquoi ce score</Text>
            {insights.why.slice(0, 3).map((t, i) => (
              <Text key={`why-${i}`} style={styles.insightLine}>• {t}</Text>
            ))}
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.insightTitle}>Comment améliorer</Text>
            {insights.tips.slice(0, 4).map((t, i) => (
              <Text key={`tip-${i}`} style={styles.insightLine}>• {t}</Text>
            ))}
          </View>

          <AnimatedPress pressScale={0.98} onPress={onClose} style={{ borderRadius: 18, marginTop: 14 }}>
            <View style={styles.overlayCloseBtn}>
              <Text style={styles.overlayCloseText}>Revenir au tableau de bord</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </View>
          </AnimatedPress>
        </Glass>
      </Animated.View>
    </View>
  );
}

/* ===================== RECOVERY FLOW (questions) ===================== */
const RecoveryFlow = ({ navigation, route }) => {
  const onDone = route.params?.onDone;

  const [data, setData] = useState({
    sleepHours: null,
    sleepQuality: null,
    fatigue: null,
    soreness: null,
    hydration: null,
  });

  const allAnswered = Object.values(data).every((v) => v !== null);

  const score = useMemo(() => {
    if (!allAnswered) return null;
    return calculateRecoveryScore(data);
  }, [data, allAnswered]);

  const { fade, move } = useScreenEnterAnim();
  const [showReveal, setShowReveal] = useState(false);

  const confirm = () => {
    if (!allAnswered || score == null) return;
    setShowReveal(true);
  };

  const closeOverlay = () => {
    if (score == null) return;
    onDone && onDone(score);
    setShowReveal(false);
    navigation.goBack();
  };

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: move }] }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.flowTitle}>Évaluer ma récupération</Text>
          </View>

          <QuestionBlock title="Durée de sommeil">
            <SliderRow
              values={[4, 5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10]}
              value={data.sleepHours}
              onSelect={(v) => setData({ ...data, sleepHours: v })}
              suffix="h"
            />
          </QuestionBlock>

          <QuestionBlock title="Qualité du sommeil" hint="Mauvais ← → Excellent">
            <SliderRow
              values={[1, 2, 3, 4, 5]}
              value={data.sleepQuality}
              onSelect={(v) => setData({ ...data, sleepQuality: v })}
            />
          </QuestionBlock>

          <QuestionBlock title="Fatigue ressentie" hint="Très fatigué ← → Très frais">
            <SliderRow
              values={[1, 2, 3, 4, 5]}
              value={data.fatigue}
              onSelect={(v) => setData({ ...data, fatigue: v })}
            />
          </QuestionBlock>

          <QuestionBlock title="Courbatures">
            <ChoiceRow
              value={data.soreness}
              onSelect={(v) => setData({ ...data, soreness: v })}
            />
          </QuestionBlock>

          <QuestionBlock title="Hydratation (aujourd’hui)" hint="Objectif ≈ 2,5–3 L">
            <SliderRow
              values={[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]}
              value={data.hydration}
              onSelect={(v) => setData({ ...data, hydration: v })}
              suffix="L"
            />
          </QuestionBlock>

          <AnimatedPress
            disabled={!allAnswered}
            style={[{ width: "100%" }, !allAnswered && { opacity: 0.4 }]}
            onPress={confirm}
          >
            <View style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Calculer mon score</Text>
            </View>
          </AnimatedPress>

          {!allAnswered && (
            <Text style={styles.helperText}>
              Réponds aux 5 questions pour obtenir un score fiable.
            </Text>
          )}
        </ScrollView>
      </Animated.View>

      <ScoreRevealOverlay visible={showReveal} score={score} data={data} onClose={closeOverlay} />
    </LinearGradient>
  );
};

/* ===================== HELPERS UI (flow) ===================== */
const QuestionBlock = ({ title, hint, children }) => (
  <Glass style={{ marginTop: 16 }}>
    <Text style={styles.qTitle}>{title}</Text>
    {hint && <Text style={styles.qHint}>{hint}</Text>}
    {children}
  </Glass>
);

const SliderRow = ({ values, value, onSelect, suffix = "" }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View style={{ flexDirection: "row", gap: 10 }}>
      {values.map((v) => {
        const active = value === v;
        return (
          <AnimatedPress
            key={String(v)}
            onPress={() => onSelect(v)}
            pressScale={0.96}
            style={{ borderRadius: 16 }}
          >
            <View style={[styles.sliderItem, active && styles.sliderItemActive]}>
              <Text style={styles.sliderText}>
                {v}
                {suffix}
              </Text>
            </View>
          </AnimatedPress>
        );
      })}
    </View>
  </ScrollView>
);

const ChoiceRow = ({ value, onSelect }) => (
  <View style={{ flexDirection: "row", gap: 10 }}>
    {["low", "medium", "high"].map((v) => {
      const active = value === v;
      return (
        <AnimatedPress key={v} onPress={() => onSelect(v)} pressScale={0.97} style={{ flex: 1 }}>
          <View style={[styles.choice, active && styles.choiceActive]}>
            <Text style={styles.choiceText}>
              {v === "low" ? "Faibles" : v === "medium" ? "Modérées" : "Fortes"}
            </Text>
          </View>
        </AnimatedPress>
      );
    })}
  </View>
);

/* ===================== DATA (post-séance) ===================== */
const DISCIPLINES = [
  "100m",
  "200m",
  "400m",
  "800m",
  "1500m",
  "Haies",
  "Longueur",
  "Triple",
  "Hauteur",
  "Perche",
  "Poids",
  "Disque",
  "Marteau",
  "Javelot",
  "Décathlon",
  "Heptathlon",
];

const DUREES = ["< 45 min", "45–90 min", "> 90 min"];
const INTENSITES = ["Facile", "Modérée", "Dure", "Très dure"];
const ZONES = ["Jambes", "Ischios", "Quadri", "Mollets", "Hanches", "Dos", "Épaules", "Global"];

/* ===================== Dropdown ===================== */
function SelectDropdown({ label, value, placeholder, items, onChange }) {
  const [open, setOpen] = useState(false);
  const { fade, move } = useScreenEnterAnim();

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: move }] }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.qLabel}>{label}</Text>

        <AnimatedPress onPress={() => setOpen((s) => !s)} pressScale={0.985} style={{ borderRadius: 16 }}>
          <View style={styles.qSelect}>
            <Text style={[styles.qValue, !value && { opacity: 0.55 }]}>
              {value || placeholder}
            </Text>
            <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={C.aqua} />
          </View>
        </AnimatedPress>

        {open && (
          <View style={styles.qList}>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
              {items.map((it) => {
                const active = it === value;
                return (
                  <TouchableOpacity
                    key={it}
                    onPress={() => {
                      softVibrate();
                      onChange(it);
                      setOpen(false);
                    }}
                    style={[styles.qItem, active && styles.qItemActive]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.qItemText, active && { color: C.aqua }]}>
                      {it}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

/* ===================== RSI MODAL ===================== */
function RSIPremiumModal({ visible, onClose }) {
  const features = [
    { title: "Test RSI guidé (détente / réactivité)", desc: "Protocole pas-à-pas, consignes claires, capture des résultats.", icon: "flash" },
    { title: "Score fatigue musculaire", desc: "Interprétation automatique + tendance (amélioration / surcharge).", icon: "analytics" },
    { title: "Prévention blessures", desc: "Alertes intelligentes si baisse anormale de réactivité.", icon: "shield-checkmark" },
    { title: "Historique & progression", desc: "Graphes, comparaisons et export de tes tests.", icon: "time" },
  ];

  const sheetFade = useRef(new Animated.Value(0)).current;
  const sheetMove = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!visible) return;
    sheetFade.setValue(0);
    sheetMove.setValue(10);
    Animated.parallel([
      Animated.timing(sheetFade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetMove, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, sheetFade, sheetMove]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.modalSheet,
          { top: Platform.OS === "ios" ? 70 : 55, bottom: 18, opacity: sheetFade, transform: [{ translateY: sheetMove }] },
        ]}
      >
        <BlurView tint="dark" intensity={35} style={StyleSheet.absoluteFill} />

        <View style={{ padding: 18, flex: 1 }}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Test RSI Premium</Text>
              <Text style={styles.modalSub}>
                Mesure ta réactivité, détecte la fatigue, protège ta saison.
              </Text>
            </View>

            <AnimatedPress onPress={onClose} pressScale={0.94} style={{ borderRadius: 14 }}>
              <View style={styles.modalClose}>
                <Ionicons name="close" size={22} color="white" />
              </View>
            </AnimatedPress>
          </View>

          <View style={styles.premiumPillRow}>
            <View style={styles.premiumPill}>
              <Ionicons name="lock-closed" size={14} color="white" />
              <Text style={styles.premiumPillText}>Premium</Text>
            </View>
            <View style={styles.premiumPillSoft}>
              <Text style={styles.premiumPillSoftText}>Démo disponible</Text>
            </View>
          </View>

          <ScrollView style={{ marginTop: 14, flex: 1 }} contentContainerStyle={{ paddingBottom: 34 }} showsVerticalScrollIndicator={false}>
            {features.map((f) => (
              <View key={f.title} style={styles.modalFeature}>
                <View style={styles.modalIcon}>
                  <Ionicons name={f.icon} size={18} color={C.cyan2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalFeatureTitle}>{f.title}</Text>
                  <Text style={styles.modalFeatureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}

            <Glass style={{ marginTop: 14 }}>
              <Text style={styles.modalExplainTitle}>Pourquoi c’est important</Text>
              <Text style={styles.modalExplainText}>
                Une baisse de réactivité est souvent un signal précoce (fatigue neuromusculaire,
                surcharge, risque de blessure). Le RSI Premium te donne un repère concret
                avant que les sensations bizarres arrivent.
              </Text>
            </Glass>

            <AnimatedPress onPress={() => {}} pressScale={0.98} style={{ borderRadius: 18, marginTop: 14 }}>
              <View style={styles.modalCTA}>
                <Text style={styles.modalCTAText}>Débloquer Premium</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </View>
            </AnimatedPress>

            <AnimatedPress onPress={() => {}} pressScale={0.98} style={{ borderRadius: 18, marginTop: 10 }}>
              <View style={styles.modalSecondary}>
                <Text style={styles.modalSecondaryText}>Voir un aperçu (démo)</Text>
              </View>
            </AnimatedPress>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ===================== HOME ===================== */
const MainRecup = ({ navigation }) => {
  const { fade, move } = useScreenEnterAnim();
  const [showPremium, setShowPremium] = useState(false);

  const [recupScore, setRecupScore] = useState(null);
  const [dismissPrompt, setDismissPrompt] = useState(false);

  const dashStatic = useMemo(() => {
    return {
      sleep: "7h40",
      hydration: "1.2L",
      status: "Bon",
      noteBase: "Ajoute une récup post-séance pour obtenir ton protocole.",
    };
  }, []);

  const score = recupScore == null ? null : Math.max(0, Math.min(100, recupScore));
  const meta = score == null ? null : scoreMeta(score);

  const openRecoveryFlow = () => {
    softVibrate();
    navigation.navigate("RecoveryFlow", {
      onDone: (s) => {
        setRecupScore(s);
        setDismissPrompt(true);
      },
    });
  };

  const showPrompt = score == null && !dismissPrompt;

  const readinessText = useMemo(() => {
    if (score == null) return "Calcule ton score pour obtenir une lecture claire de ta journée.";
    if (score >= 85) return "Feu vert. Tu peux charger, mais reste propre sur la récup.";
    if (score >= 75) return "Bon. Tu peux t’entraîner, évite juste la surcharge inutile.";
    if (score >= 55) return "Moyen. Privilégie qualité/technique et récup sérieuse.";
    return "Bas. Aujourd’hui, priorité récup. Évite de creuser la fatigue.";
  }, [score]);

  return (
    <LinearGradient {...GRAD} style={styles.container}>
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>Récupération</Text>
        <Text style={styles.homeSubTitle}>Optimise ta régénération</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: move }] }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
          {showPrompt && (
            <Glass style={{ marginBottom: 16 }} pad={16}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.iconBubble}>
                  <Ionicons name="pulse" size={20} color={C.cyan2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.firstCalcTitle}>Calculer mon score du jour</Text>
                  <Text style={styles.firstCalcDesc}>
                    5 questions rapides. Tu obtiens un score + des conseils adaptés.
                  </Text>
                </View>
              </View>

              <View style={styles.firstCalcBtnsRow}>
                <AnimatedPress
                  pressScale={0.98}
                  onPress={() => setDismissPrompt(true)}
                  style={{ flex: 1, borderRadius: 18 }}
                >
                  <View style={styles.firstCalcSecondaryBtn}>
                    <Text style={styles.firstCalcSecondaryText}>Passer</Text>
                  </View>
                </AnimatedPress>

                <AnimatedPress
                  pressScale={0.98}
                  onPress={openRecoveryFlow}
                  style={{ flex: 1, borderRadius: 18 }}
                >
                  <View style={styles.firstCalcPrimaryBtn}>
                    <Text style={styles.firstCalcPrimaryText}>Calculer</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </View>
                </AnimatedPress>
              </View>
            </Glass>
          )}

          <Glass style={{ marginBottom: 16 }} pad={16}>
            <View style={styles.dashTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dashTitle}>Tableau de bord</Text>
                <Text style={styles.dashSub}>Aujourd’hui</Text>
              </View>

              <View style={styles.scoreBadgeWrap}>
                <LinearGradient
                  colors={[
                    "rgba(0,224,255,0.28)",
                    "rgba(63,206,249,0.10)",
                    "rgba(255,255,255,0.04)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scoreBadgeBorder}
                >
                  <View style={styles.scoreBadge}>
                    <Text style={[styles.scoreBadgeLabel, meta && { color: meta.color }]}>
                      Récup
                    </Text>
                    <Text style={styles.scoreBadgeValue}>
                      {score == null ? "—" : `${score}/100`}
                    </Text>
                  </View>
                </LinearGradient>

                <AnimatedPress
                  pressScale={0.94}
                  onPress={openRecoveryFlow}
                  style={{ borderRadius: 14 }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <View style={styles.recalcBtn}>
                    <Ionicons name="refresh" size={16} color="white" />
                  </View>
                </AnimatedPress>
              </View>
            </View>

            <View style={styles.readinessCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name={score == null ? "information-circle" : meta?.icon} size={20} color={score == null ? C.cyan2 : meta?.color} />
                <Text style={[styles.readinessTitle, { color: score == null ? "white" : meta?.color }]}>
                  {score == null ? "Lecture du jour" : meta?.label}
                </Text>
              </View>
              <Text style={styles.readinessText}>{readinessText}</Text>

              <View style={styles.miniStatsRow}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>Sommeil</Text>
                  <Text style={styles.miniValue}>{dashStatic.sleep}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>Hydrat.</Text>
                  <Text style={styles.miniValue}>{dashStatic.hydration}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>État</Text>
                  <Text style={[styles.miniValue, { color: C.aqua }]}>{dashStatic.status}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${score == null ? 0 : score}%` }]} />
              </View>

              {score == null && dismissPrompt && (
                <AnimatedPress pressScale={0.985} onPress={openRecoveryFlow} style={{ borderRadius: 16, marginTop: 12 }}>
                  <View style={styles.calcChip}>
                    <Ionicons name="pulse" size={16} color={C.cyan2} />
                    <Text style={styles.calcChipText}>Calculer ma récupération</Text>
                  </View>
                </AnimatedPress>
              )}

              <Text style={styles.dashNote}>{dashStatic.noteBase}</Text>
            </View>
          </Glass>

          <AnimatedPress pressScale={0.985} onPress={() => navigation.navigate("Optimisation")} style={{ borderRadius: 22 }}>
            <Glass style={styles.bigAction}>
              <View style={styles.bigActionRow}>
                <View style={styles.iconBubble}>
                  <Ionicons name="settings" size={20} color={C.cyan2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bigActionTitle}>Optimisation générale</Text>
                  <Text style={styles.bigActionDesc}>
                    Sommeil, hydratation, nutrition, mental — le socle de la récup.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.aqua} />
              </View>
            </Glass>
          </AnimatedPress>

          <AnimatedPress pressScale={0.985} onPress={() => navigation.navigate("PostSeance")} style={{ borderRadius: 22 }}>
            <Glass style={styles.bigAction}>
              <View style={styles.bigActionRow}>
                <View style={styles.iconBubble}>
                  <Ionicons name="fitness" size={20} color={C.cyan2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bigActionTitle}>Récup’ Post-Séance</Text>
                  <Text style={styles.bigActionDesc}>
                    Réponds aux questions → protocole adapté à ta séance.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.aqua} />
              </View>
            </Glass>
          </AnimatedPress>

          <AnimatedPress pressScale={0.99} onPress={() => setShowPremium(true)} style={{ borderRadius: 24, marginTop: 12 }}>
            <View style={styles.premiumCardWrap}>
              <LinearGradient
                colors={[
                  "rgba(0,224,255,0.28)",
                  "rgba(63,206,249,0.12)",
                  "rgba(255,255,255,0.05)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumBorder}
              >
                <Glass style={styles.premiumInner} pad={16}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <View style={styles.premiumIcon}>
                      <Ionicons name="flash" size={18} color="white" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.premiumTitle}>Test RSI Premium</Text>
                      <Text style={styles.premiumSub}>
                        Détente • réactivité • fatigue musculaire • prévention
                      </Text>
                    </View>

                    <View style={styles.premiumBadge}>
                      <Ionicons name="lock-closed" size={14} color="white" />
                      <Text style={styles.premiumBadgeText}>Premium</Text>
                    </View>
                  </View>

                  <View style={styles.premiumBullets}>
                    <Text style={styles.premiumBullet}>• Protocole guidé + score fatigue</Text>
                    <Text style={styles.premiumBullet}>• Historique & tendances</Text>
                    <Text style={styles.premiumBullet}>• Alertes prévention blessures</Text>
                  </View>

                  <View style={styles.premiumFooterRow}>
                    <Text style={styles.premiumTap}>Appuie pour voir ce que tu débloques</Text>
                    <Ionicons name="chevron-forward" size={18} color={C.aqua} />
                  </View>
                </Glass>
              </LinearGradient>
            </View>
          </AnimatedPress>
        </ScrollView>
      </Animated.View>

      <RSIPremiumModal visible={showPremium} onClose={() => setShowPremium(false)} />
    </LinearGradient>
  );
};

/* ===================== OPTIMISATION ===================== */
const DEFAULT_CHECKLIST = [
  { id: "water", label: "Hydratation régulière (petites prises)", checked: false },
  { id: "mob", label: "10–12 min de mobilité douce", checked: false },
  { id: "food", label: "Protéines + glucides dans les 2h post-séance", checked: false },
  { id: "sleep", label: "Coucher à heure stable", checked: false },
];

const SUGGESTIONS = [
  "Foam roll 8–12 min",
  "Étirements avec élastique 8 min",
  "Bain froid / contraste (si utile)",
  "Respiration 3 min (downshift)",
  "Séance kiné / soins (si prévu)",
  "Compression 20–30 min",
  "Marche 15 min (récup active)",
];

const OptimisationScreen = ({ navigation }) => {
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [addOpen, setAddOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  const scrollRef = useRef(null);
  const { fade, move } = useScreenEnterAnim();

  const toggle = (id) => {
    softVibrate();
    setChecklist((prev) => prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  };

  const addCustom = () => {
    const t = customText.trim();
    if (!t) return;
    softVibrate();
    setChecklist((prev) => [...prev, { id: `custom_${Date.now()}`, label: t, checked: false }]);
    setCustomText("");
  };

  const addSuggestion = (label) => {
    softVibrate();
    setChecklist((prev) => {
      const exists = prev.some((x) => x.label.toLowerCase() === label.toLowerCase());
      if (exists) return prev;
      return [...prev, { id: `sugg_${Date.now()}`, label, checked: false }];
    });
  };

  const items = [
    { name: "Sommeil", icon: "moon", hint: "Qualité, durée, routine" },
    { name: "Hydratation", icon: "water", hint: "Volume, sodium, timing" },
    { name: "Nutrition", icon: "nutrition", hint: "Carburant & réparation" },
    { name: "Mental", icon: "sparkles", hint: "Stress → récup plus lente" },
  ];

  return (
    <LinearGradient {...GRAD} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.headerSub}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.titleSub}>Optimisation Générale</Text>
        </View>

        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: move }] }}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          >
            <Glass style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.checkTitle}>Checklist quotidienne</Text>

                <AnimatedPress
                  pressScale={0.98}
                  onPress={() => {
                    setAddOpen((s) => !s);
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                  }}
                  style={{ borderRadius: 14 }}
                >
                  <View style={styles.addChip}>
                    <Ionicons name={addOpen ? "remove" : "add"} size={16} color={C.cyan2} />
                    <Text style={styles.addChipText}>Ajouter</Text>
                  </View>
                </AnimatedPress>
              </View>

              <Text style={styles.checkSub}>
                Coche ce que tu fais aujourd’hui. Ajoute tes habitudes (kiné, rouleau, etc.).
              </Text>

              {checklist.map((it) => (
                <AnimatedPress
                  key={it.id}
                  pressScale={0.99}
                  onPress={() => toggle(it.id)}
                  style={{ borderRadius: 16, marginTop: 12 }}
                >
                  <View style={styles.checkRow}>
                    <View style={[styles.checkBox, it.checked && styles.checkBoxOn]}>
                      {it.checked && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <Text
                      style={[
                        styles.checkText,
                        it.checked && { opacity: 0.6, textDecorationLine: "line-through" },
                      ]}
                    >
                      {it.label}
                    </Text>
                  </View>
                </AnimatedPress>
              ))}

              {addOpen && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.suggTitle}>Suggestions</Text>

                  <View style={styles.suggWrap}>
                    {SUGGESTIONS.map((s) => (
                      <AnimatedPress key={s} pressScale={0.98} onPress={() => addSuggestion(s)} style={{ borderRadius: 16 }}>
                        <View style={styles.suggChip}>
                          <Text style={styles.suggChipText}>{s}</Text>
                        </View>
                      </AnimatedPress>
                    ))}
                  </View>

                  <Text style={[styles.suggTitle, { marginTop: 14 }]}>Ajouter ton élément</Text>

                  <View style={styles.customRow}>
                    <TextInput
                      value={customText}
                      onChangeText={setCustomText}
                      placeholder="Ex : Kiné (2×/semaine) • Bain froid • Étirements..."
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      style={styles.customInput}
                      onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180)}
                    />
                    <AnimatedPress pressScale={0.95} onPress={addCustom} style={{ borderRadius: 16 }}>
                      <View style={styles.customBtn}>
                        <Ionicons name="add" size={20} color="white" />
                      </View>
                    </AnimatedPress>
                  </View>
                </View>
              )}
            </Glass>

            {items.map((item) => (
              <AnimatedPress key={item.name} pressScale={0.99} onPress={() => {}} style={{ borderRadius: 22 }}>
                <Glass style={{ marginBottom: 14 }}>
                  <View style={styles.optRow}>
                    <View style={styles.iconBubble}>
                      <Ionicons name={item.icon} size={20} color={C.cyan2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optTitle}>{item.name}</Text>
                      <Text style={styles.optHint}>{item.hint}</Text>
                    </View>
                    <View style={styles.soonTag}>
                      <Text style={styles.soonText}>Bientôt</Text>
                    </View>
                  </View>
                </Glass>
              </AnimatedPress>
            ))}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

/* ===================== POST-SEANCE ===================== */
const PostSeanceScreen = ({ navigation }) => {
  const [sport, setSport] = useState("Athlétisme");
  const [discipline, setDiscipline] = useState(null);
  const [duree, setDuree] = useState(null);
  const [intensite, setIntensite] = useState(null);
  const [zone, setZone] = useState(null);

  const ready = !!(sport && discipline && duree && intensite && zone);
  const { fade, move } = useScreenEnterAnim();

  return (
    <LinearGradient {...GRAD} style={styles.container}>
      <View style={styles.headerSub}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titleSub}>Récup’ Post-Séance</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: move }] }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text style={styles.postIntro}>
            Réponds aux questions — on te propose une séance de récupération cohérente.
          </Text>

          <Glass style={{ marginTop: 12 }}>
            <Text style={styles.blockTitle}>Ta séance</Text>

            <SelectDropdown label="1) Sport pratiqué" value={sport} placeholder="Choisir" items={["Athlétisme"]} onChange={setSport} />
            <SelectDropdown label="2) Discipline" value={discipline} placeholder="Choisir une discipline" items={DISCIPLINES} onChange={setDiscipline} />
            <SelectDropdown label="3) Durée de la séance" value={duree} placeholder="Choisir une durée" items={DUREES} onChange={setDuree} />
            <SelectDropdown label="4) Intensité ressentie" value={intensite} placeholder="Choisir une intensité" items={INTENSITES} onChange={setIntensite} />
            <SelectDropdown label="5) Zone prioritaire à soulager" value={zone} placeholder="Choisir une zone" items={ZONES} onChange={setZone} />

            <AnimatedPress
              disabled={!ready}
              pressScale={0.98}
              onPress={() => {
                navigation.navigate("Resultats", {
                  sport: discipline,
                  meta: { sport, discipline, duree, intensite, zone },
                });
              }}
              style={[{ borderRadius: 18, marginTop: 10 }, !ready && { opacity: 0.55 }]}
            >
              <View style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Ajouter</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </View>
            </AnimatedPress>

            {!ready && (
              <Text style={styles.helperText}>
                Sélectionne les 5 éléments pour générer ton protocole.
              </Text>
            )}
          </Glass>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
};

/* ===================== DB + RESULTS ===================== */
const RecupDATABASE = {
  "100m": [
    { title: "Décrassage 8 min + Étirements", desc: "Augmente le retour veineux, élimine lactates, réduit rigidité musculaire." },
    { title: "Bain froid + Respiration", desc: "Diminution inflammation + reset système nerveux." },
  ],
  "200m": [
    { title: "Vélo 12 min + Foam Roll", desc: "Micro-circulation ++, prévention ischios." },
    { title: "Cryothérapie locale", desc: "Idéal post-accélérations longues." },
  ],
  "400m": [
    { title: "Footing 15 min + Étirements dynamiques", desc: "Élimination maximale des déchets lactiques." },
    { title: "Compression mollets", desc: "Aide au retour veineux + moins jambes lourdes demain." },
    { title: "Protocole contrastes eau chaude/froide", desc: "Accélère la régénération musculaire globale." },
  ],
  "800m": [
    { title: "Footing léger 16 min + Respiration", desc: "Système cardio en récup active optimale." },
    { title: "Glace sur douleurs", desc: "Post impact répétée + prévention." },
  ],
  "1500m": [
    { title: "30 min récupération active", desc: "Clear lactates + mobilité hanches++" },
    { title: "Étirements contrôlés", desc: "Récupération tonique" },
  ],
  "Haies": [
    { title: "Glace hanche/ischios", desc: "Zones les plus sollicitées en haies." },
    { title: "Massage quadri", desc: "Aide à récupérer l'explosivité." },
  ],
  "Longueur": [
    { title: "Mobilité chevilles", desc: "Améliore récupération saut + prévention entorses." },
    { title: "Bain froid jambes", desc: "Pieds/genoux/ischios froid ++" },
  ],
  "Triple": [
    { title: "Compression + Glace genou", desc: "Fort impact sur articulations." },
    { title: "Étirements psoas + fessiers", desc: "Récup force d’impulsion." },
  ],
  "Hauteur": [
    { title: "Gainage postural léger", desc: "Maintient stabilité rachis." },
    { title: "Mobilité dorsale", desc: "Technique dorsal sollicitée." },
  ],
  "Perche": [
    { title: "Mobilité épaules", desc: "Réduction tensions du haut du corps." },
    { title: "Auto-massage dorsaux", desc: "Décharge prise + suspension." },
  ],
  "Poids": [
    { title: "Auto-massage pec/épaule", desc: "Décharge tensions lancer." },
    { title: "Glace coude", desc: "Prévention tendinopathies." },
  ],
  "Disque": [{ title: "Compression pouce/main", desc: "Rotation lanceur = charge articulation." }],
  "Marteau": [{ title: "Glace bas du dos", desc: "Rotation lombaires ++" }],
  "Javelot": [{ title: "Glace/Strapping épaule", desc: "Prévention blessure commune." }],
  "Décathlon": [{ title: "Protocole complet 30 min", desc: "Multi-fatigue système nerveux + muscles." }],
  "Heptathlon": [{ title: "Étirements + compression jambes", desc: "Pluridisciplinaire → charge totale." }],
};

const ResultatsScreen = ({ route, navigation }) => {
  const discipline = route.params?.sport;
  const meta = route.params?.meta;
  const data = RecupDATABASE[discipline] || [];
  const { fade, move } = useScreenEnterAnim();

  return (
    <LinearGradient {...GRAD} style={styles.container}>
      <View style={styles.headerSub}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titleSub}>Résultats</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: move }] }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text style={styles.resultTitle}>{discipline || "—"}</Text>

          {meta && (
            <Glass style={{ marginBottom: 14 }}>
              <Text style={styles.blockTitle}>Résumé</Text>
              <Text style={styles.summaryLine}>• Sport : {meta.sport}</Text>
              <Text style={styles.summaryLine}>• Discipline : {meta.discipline}</Text>
              <Text style={styles.summaryLine}>• Durée : {meta.duree}</Text>
              <Text style={styles.summaryLine}>• Intensité : {meta.intensite}</Text>
              <Text style={styles.summaryLine}>• Zone : {meta.zone}</Text>
            </Glass>
          )}

          <Text style={styles.blockTitle}>Protocole recommandé</Text>

          {data.map((item, i) => (
            <Glass key={i} style={{ marginTop: 12 }}>
              <Text style={styles.resultItemTitle}>{item.title}</Text>
              <Text style={styles.resultItemDesc}>{item.desc}</Text>
            </Glass>
          ))}

          {data.length === 0 && (
            <Text style={styles.noDataText}>Aucune recommandation trouvée</Text>
          )}
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
};

/* ===================== NAV ===================== */
export default function Recuperation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainRecup" component={MainRecup} />
      <Stack.Screen name="RecoveryFlow" component={RecoveryFlow} />
      <Stack.Screen name="Optimisation" component={OptimisationScreen} />
      <Stack.Screen name="PostSeance" component={PostSeanceScreen} />
      <Stack.Screen name="Resultats" component={ResultatsScreen} />
    </Stack.Navigator>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1 },

  homeHeader: { paddingTop: 78, paddingLeft: 22, paddingRight: 22, marginBottom: 6 },
  homeTitle: { fontSize: 40, fontWeight: "900", color: "white" },
  homeSubTitle: { marginTop: 4, color: "#C8E2FF", opacity: 0.75, fontSize: 16 },

  dashTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  dashTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  dashSub: { color: "white", opacity: 0.7, marginTop: 4 },

  scoreBadgeWrap: { alignItems: "flex-end", gap: 10 },
  scoreBadgeBorder: { borderRadius: 18, padding: 1 },
  scoreBadge: {
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 96,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.16)",
    alignItems: "center",
  },
  scoreBadgeLabel: { color: C.cyan2, fontWeight: "900", fontSize: 12 },
  scoreBadgeValue: { color: "white", fontWeight: "900", fontSize: 16, marginTop: 2 },

  recalcBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(0,198,255,0.26)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
  },

  readinessCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  readinessTitle: { fontWeight: "900", fontSize: 15 },
  readinessText: { color: "white", opacity: 0.8, marginTop: 8, lineHeight: 18 },

  miniStatsRow: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniStat: { flex: 1, alignItems: "center" },
  miniDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.12)" },
  miniLabel: { color: "white", opacity: 0.7, fontWeight: "800", fontSize: 12 },
  miniValue: { color: C.cyan2, fontSize: 18, fontWeight: "900", marginTop: 6 },

  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.cyan, borderRadius: 18 },

  dashNote: { marginTop: 12, color: "white", opacity: 0.78, lineHeight: 18 },

  calcChip: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.22)",
    backgroundColor: "rgba(0,224,255,0.08)",
  },
  calcChipText: { color: C.cyan2, fontWeight: "900" },

  bigAction: { marginBottom: 14 },
  bigActionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(0,200,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  bigActionTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  bigActionDesc: { color: "white", opacity: 0.72, marginTop: 4, lineHeight: 18 },

  premiumCardWrap: { borderRadius: 24, overflow: "hidden" },
  premiumBorder: { borderRadius: 24, padding: 1 },
  premiumInner: { borderRadius: 23 },
  premiumIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(0,198,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { color: "white", fontSize: 20, fontWeight: "900" },
  premiumSub: { color: "white", opacity: 0.75, marginTop: 2, fontSize: 13 },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  premiumBadgeText: { color: "white", fontWeight: "900", fontSize: 12 },
  premiumBullets: { marginTop: 2, gap: 4 },
  premiumBullet: { color: "white", opacity: 0.86, lineHeight: 18 },
  premiumFooterRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  premiumTap: { color: C.aqua, fontWeight: "800" },

  headerSub: { paddingTop: 66, paddingLeft: 18, flexDirection: "row", alignItems: "center" },
  backBtn: { marginRight: 10, padding: 6 },
  titleSub: { fontSize: 26, fontWeight: "900", color: "#fff" },

  optRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  optTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  optHint: { color: "white", opacity: 0.7, marginTop: 4 },
  soonTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(63,206,249,0.35)",
    backgroundColor: "rgba(63,206,249,0.10)",
  },
  soonText: { color: C.aqua, fontWeight: "900" },

  checkTitle: { color: "white", fontSize: 20, fontWeight: "900" },
  checkSub: { color: "white", opacity: 0.75, marginTop: 8, lineHeight: 18 },
  addChip: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.22)",
    backgroundColor: "rgba(0,224,255,0.08)",
  },
  addChipText: { color: C.cyan2, fontWeight: "900" },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxOn: { backgroundColor: C.cyan, borderColor: "rgba(255,255,255,0.20)" },
  checkText: { color: "white", opacity: 0.9, flex: 1, lineHeight: 18 },

  suggTitle: { color: C.aqua, fontWeight: "900", marginTop: 6 },
  suggWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  suggChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  suggChipText: { color: "white", fontWeight: "800", opacity: 0.9 },

  customRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  customInput: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "white",
    fontWeight: "800",
  },
  customBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: C.cyan,
    alignItems: "center",
    justifyContent: "center",
  },

  postIntro: { color: "white", opacity: 0.78, lineHeight: 18, marginTop: 10 },
  blockTitle: { color: C.aqua, fontSize: 18, fontWeight: "900", marginBottom: 12 },

  qLabel: { color: C.aqua, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  qSelect: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qValue: { color: "white", fontSize: 16, fontWeight: "800" },
  qList: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  qItem: { paddingVertical: 12, paddingHorizontal: 14 },
  qItemActive: { backgroundColor: "rgba(0,224,255,0.12)" },
  qItemText: { color: "white", fontSize: 15, fontWeight: "700" },

  primaryBtn: {
    backgroundColor: C.cyan,
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "white", fontSize: 18, fontWeight: "900" },
  helperText: { color: "white", opacity: 0.65, marginTop: 10, textAlign: "center" },

  resultTitle: { color: "white", fontSize: 34, fontWeight: "900", marginBottom: 10 },
  resultItemTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  resultItemDesc: { color: "white", opacity: 0.78, marginTop: 6, lineHeight: 18 },
  noDataText: { color: "white", opacity: 0.65, marginTop: 20, textAlign: "center" },
  summaryLine: { color: "white", opacity: 0.82, marginTop: 6 },

  modalBackdrop: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)" },
  modalSheet: {
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(10,20,45,0.82)",
  },
  modalHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  modalTitle: { color: "white", fontSize: 26, fontWeight: "900" },
  modalSub: { color: "white", opacity: 0.75, marginTop: 6, lineHeight: 18 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumPillRow: { flexDirection: "row", gap: 10, marginTop: 12, alignItems: "center" },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  premiumPillText: { color: "white", fontWeight: "900" },
  premiumPillSoft: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(0,224,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.22)",
  },
  premiumPillSoftText: { color: C.cyan2, fontWeight: "900" },

  modalFeature: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
  },
  modalIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(0,224,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  modalFeatureTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  modalFeatureDesc: { color: "white", opacity: 0.75, marginTop: 4, lineHeight: 18 },

  modalExplainTitle: { color: C.aqua, fontSize: 16, fontWeight: "900" },
  modalExplainText: { color: "white", opacity: 0.78, marginTop: 8, lineHeight: 18 },

  modalCTA: {
    backgroundColor: C.cyan,
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCTAText: { color: "white", fontSize: 18, fontWeight: "900" },
  modalSecondary: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.22)",
    backgroundColor: "rgba(0,224,255,0.08)",
  },
  modalSecondaryText: { color: C.cyan2, fontWeight: "900" },

  flowTitle: { color: "white", fontSize: 22, fontWeight: "900", marginLeft: 10 },

  qTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  qHint: { color: "white", opacity: 0.7, marginTop: 6, marginBottom: 10 },

  sliderItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderItemActive: {
    backgroundColor: "rgba(0,224,255,0.16)",
    borderColor: "rgba(0,224,255,0.35)",
  },
  sliderText: { color: "white", fontWeight: "900" },

  choice: {
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceActive: {
    backgroundColor: "rgba(0,224,255,0.16)",
    borderColor: "rgba(0,224,255,0.35)",
  },
  choiceText: { color: "white", fontWeight: "900" },

  scoreOverlayRoot: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  scoreOverlayBackdrop: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  scoreOverlayCardWrap: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
  },
  scoreOverlayTitle: { fontSize: 16, fontWeight: "900" },
  scoreOverlayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  scoreOverlayLabel: { color: "white", opacity: 0.75, fontWeight: "800" },
  scoreOverlayValue: { color: "white", fontWeight: "900", fontSize: 18 },
  scoreOverlayTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  scoreOverlayFill: { height: "100%", backgroundColor: C.cyan2, borderRadius: 18 },
  scoreOverlayHint: { color: "white", opacity: 0.82, marginTop: 10, lineHeight: 18 },

  insightTitle: { color: C.aqua, fontWeight: "900", marginBottom: 8 },
  insightLine: { color: "white", opacity: 0.85, lineHeight: 18, marginTop: 4 },

  overlayCloseBtn: {
    backgroundColor: C.cyan2,
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCloseText: { color: "white", fontSize: 16, fontWeight: "900" },

  firstCalcTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  firstCalcDesc: { color: "white", opacity: 0.75, marginTop: 4, lineHeight: 18 },
  firstCalcBtnsRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  firstCalcSecondaryBtn: {
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  firstCalcSecondaryText: { color: "white", fontWeight: "900" },
  firstCalcPrimaryBtn: {
    backgroundColor: C.cyan2,
    borderRadius: 18,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  firstCalcPrimaryText: { color: "white", fontWeight: "900" },
});
