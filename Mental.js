import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

/* ======================== NAVIGATION ======================== */
const HOME_ROUTE = "Home";

/* ======================== COULEURS ======================== */
const AXIS_BG = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};
const COLORS = {
  sommeil: "#6930C3",
  blessure: "#5E60CE",
  fatigue: "#004CB6",
  prepa: "#0075D3",
  confiance: "#0099DA",
  vision: "#4EA8DE",
};
const CATEGORY_GRADIENTS = {
  sommeil: ["#6930C3", "#5E60CE"],
  blessure: ["#5E60CE", "#004CB6"],
  fatigue: ["#004CB6", "#0075D3"],
  prepa: ["#0075D3", "#0099DA"],
  confiance: ["#0099DA", "#4EA8DE"],
  vision: ["#4EA8DE", "#4EA8DE"],
};
const TEXT_WHITE = "#FFFFFF";
const TEXT_DIM = "rgba(255,255,255,0.85)";

/* ======================== DONNÉES ======================== */
const makeSteps = (arr) => arr;
const CATEGORIES = [
  {
    id: "sommeil",
    label: "Récupération & Sommeil",
    desc: "Apaiser l’esprit et faciliter l’endormissement.",
    color: COLORS.sommeil,
    routines: [
      {
        key: "sl3",
        name: "Respiration 4-7-8",
        minutes: 3,
        desc: "Réduit le rythme cardiaque et favorise l’endormissement.",
        steps: makeSteps([
          { label: "Inspire 4s", tip: "Calme, fluide.", pct: 0.4 },
          { label: "Retient 7s", tip: "Épaules relâchées.", pct: 0.3 },
          { label: "Expire 8s", tip: "Souffle long.", pct: 0.3 },
        ]),
      },
      {
        key: "sl5",
        name: "Scan corporel rapide",
        minutes: 5,
        desc: "Relâchement corporel global avant de dormir.",
        steps: makeSteps([
          { label: "Tête → épaules", tip: "Lourdeur agréable.", pct: 0.4 },
          { label: "Bras → jambes", tip: "Tensions qui s’évacuent.", pct: 0.4 },
          { label: "Respiration calme", tip: "Ventre qui se soulève.", pct: 0.2 },
        ]),
      },
      {
        key: "sl10",
        name: "Relaxation profonde",
        minutes: 10,
        desc: "Prépare le corps et l’esprit à un sommeil réparateur.",
        steps: makeSteps([
          { label: "Respire 5/5", tip: "Rythme stable.", pct: 0.4 },
          { label: "Scan complet", tip: "Des pieds à la tête.", pct: 0.4 },
          { label: "Lieu serein", tip: "Plage, forêt, etc.", pct: 0.2 },
        ]),
      },
    ],
  },
  {
    id: "blessure",
    label: "Blessure & Reprise",
    desc: "Gérer la douleur et reprendre sereinement.",
    color: COLORS.blessure,
    routines: [
      {
        key: "in3",
        name: "Souffle de détente",
        minutes: 3,
        desc: "Diminue la vigilance sur la zone douloureuse.",
        steps: makeSteps([
          { label: "Souffle 4-6", tip: "Envoie du calme.", pct: 0.6 },
          { label: "Relâche zone", tip: "Chaleur douce, sécurité.", pct: 0.4 },
        ]),
      },
      {
        key: "in5",
        name: "Reprise en confiance",
        minutes: 5,
        desc: "Réhabituer le mouvement sans appréhension.",
        steps: makeSteps([
          { label: "Respire 5 cycles", tip: "Stabilité d’abord.", pct: 0.4 },
          { label: "Mini-mouvement", tip: "Sans douleur.", pct: 0.3 },
          { label: "But personnel", tip: "Pourquoi tu le fais.", pct: 0.3 },
        ]),
      },
      {
        key: "in10",
        name: "Projection de retour",
        minutes: 10,
        desc: "Se visualiser performant et confiant.",
        steps: makeSteps([
          { label: "Respire 5/5", tip: "Confiance calme.", pct: 0.3 },
          { label: "Imagerie positive", tip: "Toi en forme.", pct: 0.4 },
          { label: "Mantra", tip: "“Je progresse chaque jour”.", pct: 0.3 },
        ]),
      },
    ],
  },
  {
    id: "fatigue",
    label: "Fatigue & Motivation",
    desc: "Relancer l’énergie et l’envie de s’entraîner.",
    color: COLORS.fatigue,
    routines: [
      {
        key: "tr3",
        name: "Recharge rapide",
        minutes: 3,
        desc: "Respiration énergisante + recentrage.",
        steps: makeSteps([
          { label: "Respire fort", tip: "Active le corps.", pct: 0.5 },
          { label: "Expire long", tip: "Vide les tensions.", pct: 0.5 },
        ]),
      },
      {
        key: "tr5",
        name: "Focus express",
        minutes: 5,
        desc: "Récupère la concentration avant la séance.",
        steps: makeSteps([
          { label: "Inspire 4s", tip: "Regard franc.", pct: 0.5 },
          { label: "Expire 6s", tip: "Posture haute.", pct: 0.5 },
        ]),
      },
      {
        key: "tr10",
        name: "Relance d’énergie",
        minutes: 10,
        desc: "Réveille ton corps et ton esprit pour repartir.",
        steps: makeSteps([
          { label: "Respire 4-4-6", tip: "Rythme ton souffle.", pct: 0.3 },
          { label: "Mobilité lente", tip: "Épaules/tête/jambes.", pct: 0.4 },
          { label: "Visualisation", tip: "Souvenir de réussite.", pct: 0.3 },
        ]),
      },
    ],
  },
  {
    id: "prepa",
    label: "Préparation Mentale",
    desc: "Canaliser le stress en énergie utile.",
    color: COLORS.prepa,
    routines: [
      {
        key: "pc3",
        name: "Respire & Gagne",
        minutes: 3,
        desc: "Retrouver son calme pré-performance.",
        steps: makeSteps([
          { label: "4-2-6", tip: "3 cycles lents.", pct: 0.55 },
          { label: "Image clé", tip: "1 repère fort.", pct: 0.45 },
        ]),
      },
      {
        key: "pc5",
        name: "Ancrage express",
        minutes: 5,
        desc: "Repère corporel simple avant le départ.",
        steps: makeSteps([
          { label: "Souffle 4-4", tip: "Rythme constant.", pct: 0.5 },
          { label: "Mantra court", tip: "“Calme • précis”.", pct: 0.5 },
        ]),
      },
      {
        key: "pc10",
        name: "Mode compétition",
        minutes: 10,
        desc: "Visualisation claire du scénario Jour J.",
        steps: makeSteps([
          { label: "Respire 5/5", tip: "Fluidité du geste.", pct: 0.4 },
          { label: "Scénario clair", tip: "Exécution parfaite.", pct: 0.4 },
          { label: "Mot clé", tip: "Ex: “impact”.", pct: 0.2 },
        ]),
      },
    ],
  },
  {
    id: "confiance",
    label: "Confiance & Calme",
    desc: "Reprendre le contrôle après un doute.",
    color: COLORS.confiance,
    routines: [
      {
        key: "cf3",
        name: "Reset émotionnel",
        minutes: 3,
        desc: "Revenir au calme rapidement.",
        steps: makeSteps([
          { label: "Respire 4-4", tip: "Rythme constant.", pct: 0.4 },
          { label: "Relâche épaules", tip: "Laisse tomber.", pct: 0.3 },
          { label: "Visualise réussite", tip: "Image positive.", pct: 0.3 },
        ]),
      },
      {
        key: "cf5",
        name: "Reconnexion positive",
        minutes: 5,
        desc: "Réactiver une confiance factuelle.",
        steps: makeSteps([
          { label: "Respire carré", tip: "Équilibre mental.", pct: 0.4 },
          { label: "Ton meilleur toi", tip: "Sensations nettes.", pct: 0.4 },
          { label: "Sourire léger", tip: "Physio du calme.", pct: 0.2 },
        ]),
      },
      {
        key: "cf10",
        name: "Confiance durable",
        minutes: 10,
        desc: "Stabilité mentale quotidienne.",
        steps: makeSteps([
          { label: "Respire 5/5", tip: "Régulier.", pct: 0.3 },
          { label: "3 preuves perso", tip: "Concrètes.", pct: 0.4 },
          { label: "Mantra", tip: "“Stable & confiant”.", pct: 0.3 },
        ]),
      },
    ],
  },
  {
    id: "vision",
    label: "Vision & Objectifs",
    desc: "Clarifier le cap et tenir la durée.",
    color: COLORS.vision,
    routines: [
      {
        key: "cr3",
        name: "Cap du jour",
        minutes: 3,
        desc: "Fixer l’objectif simple du jour.",
        steps: makeSteps([
          { label: "Respire court", tip: "Prépare-toi.", pct: 0.4 },
          { label: "Cap unique", tip: "“Aujourd’hui je…”.", pct: 0.6 },
        ]),
      },
      {
        key: "cr5",
        name: "Plan d’action",
        minutes: 5,
        desc: "Structurer 3 priorités concrètes.",
        steps: makeSteps([
          { label: "Respire calme", tip: "Clarté et vision.", pct: 0.4 },
          { label: "3 priorités", tip: "Nettes, faisables.", pct: 0.6 },
        ]),
      },
      {
        key: "cr10",
        name: "Projection future",
        minutes: 10,
        desc: "Se voir réussir à 6 mois.",
        steps: makeSteps([
          { label: "Respire régulier", tip: "Détente stable.", pct: 0.4 },
          { label: "Vision longue", tip: "Progrès constants.", pct: 0.4 },
          { label: "Mantra identitaire", tip: "“Je construis ma réussite”.", pct: 0.2 },
        ]),
      },
    ],
  },
];

const Stack = createNativeStackNavigator();

/* ======================== HEADER ======================== */
const Header = ({ title, onBack }) => {
  const pad = Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 0) + 12;
  return (
    <View style={[styles.header, { paddingTop: pad }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color="#2AA4FF" />
      </TouchableOpacity>
      <View style={styles.headerTitleBox}>
        <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={{ width: 42 }} />
    </View>
  );
};

/* ======================== ACCUEIL ======================== */
function MentalHome({ navigation }) {
  const goBackToMainHome = () => {
    const parent = navigation.getParent?.();
    if (parent) parent.navigate(HOME_ROUTE);
    else navigation.navigate(HOME_ROUTE);
  };

  return (
    <LinearGradient {...AXIS_BG} style={{ flex: 1 }}>
      <Header title="Espace Mental" onBack={goBackToMainHome} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 90 }}>
        <View style={{ alignItems: "center", paddingVertical: 4 }}>
          <Text style={styles.h2}>Choisis ton état du moment</Text>
        </View>

        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.92}
            onPress={() =>
              navigation.navigate("MentalRoutine", { categoryId: cat.id })
            }
            style={{ marginBottom: 14 }}
          >
            <View style={[styles.cardOutline, { borderColor: cat.color }]}>
              <View style={styles.cardInnerTransparent}>
                <View style={{ paddingVertical: 22 }}>
                  <Text style={styles.cardTitle}>{cat.label}</Text>
                  <Text style={styles.cardSub}>{cat.desc}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* PREMIUM */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => navigation.navigate("Premium")}
        >
          <LinearGradient
            colors={["#2AA4FF", "#0E67FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumOutline}
          >
            <View style={styles.premiumInner}>
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={styles.premiumTitle}>Coach mental IA</Text>
              <Text style={styles.premiumDesc}>
                Routines guidées, conseils personnalisés, suivi.
              </Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed-outline" size={14} color="#fff" />
                <Text style={styles.premiumBadgeTxt}>Premium</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

/* ======================== ROUTINES ======================== */
function MentalRoutine({ route, navigation }) {
  const { categoryId } = route.params;
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const winH = Dimensions.get("window").height;
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={CATEGORY_GRADIENTS[categoryId]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.4]}
        style={[StyleSheet.absoluteFill, { height: winH }]}
      />
      <Header title={category.label} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 90 }}>
        <Text style={styles.sectionLeadWhite}>{category.desc}</Text>

        {category.routines.map((r) => (
          <TouchableOpacity
            key={r.key}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("MentalProgram", {
                categoryId,
                routineKey: r.key,
                minutes: r.minutes,
              })
            }
            style={{ marginBottom: 16 }}
          >
            <View style={styles.glassListCard}>
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "rgba(255,255,255,0.08)" },
                ]}
              />
              <View style={{ padding: 18 }}>
                <Text style={styles.routineTitleWhite}>
                  {r.name} • {r.minutes} min
                </Text>
                <Text style={styles.routineDescWhite}>{r.desc}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

/* ======================== PROGRAMME ======================== */
function MentalProgram({ route, navigation }) {
  const { categoryId, routineKey, minutes } = route.params;
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const routine = category.routines.find((r) => r.key === routineKey);
  const total = minutes * 60;
  const steps = routine.steps.map((s) => ({
    label: s.label,
    tip: s.tip,
    seconds: Math.max(10, Math.round(total * s.pct)),
  }));

  const [i, setI] = useState(0);
  const [remaining, setRemaining] = useState(steps[0].seconds);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let interval;
    if (playing) {
      interval = setInterval(() => {
        setRemaining((sec) => {
          if (sec > 0) return sec - 1;
          if (i < steps.length - 1) {
            setI((prev) => prev + 1);
            return steps[i + 1].seconds;
          }
          setPlaying(false);
          return 0;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [playing, i]);

  const format = (sec) => {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={CATEGORY_GRADIENTS[categoryId]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFill}
      />
      <Header
        title={`${routine.name} • ${minutes} min`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 90 }}>
        <Text style={styles.sectionLeadWhite}>{routine.desc}</Text>

        <LinearGradient
          colors={CATEGORY_GRADIENTS[categoryId]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0, 0.4]}
          style={styles.timerOutline}
        >
          <View style={styles.timerGlass}>
            <BlurView intensity={22} tint="light" style={StyleSheet.absoluteFill} />
            <Text style={styles.stepTitle}>{steps[i].label}</Text>
            <Text style={styles.timerValue}>{format(remaining)}</Text>
            <Text style={styles.stepTip}>{steps[i].tip}</Text>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.ctrlBtnGlass}
                onPress={() => setPlaying((p) => !p)}
              >
                <Ionicons
                  name={playing ? "pause" : "play"}
                  size={18}
                  color="#0E3A8A"
                />
                <Text style={styles.ctrlTxtDark}>
                  {playing ? "Pause" : "Start"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ctrlBtnGlass}
                onPress={() => {
                  if (i < steps.length - 1) {
                    setI((prev) => prev + 1);
                    setRemaining(steps[i + 1].seconds);
                  }
                }}
              >
                <Ionicons name="play-skip-forward" size={18} color="#0E3A8A" />
                <Text style={styles.ctrlTxtDark}>Suivante</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ctrlBtnGlass}
                onPress={() => {
                  setI(0);
                  setRemaining(steps[0].seconds);
                  setPlaying(false);
                }}
              >
                <Ionicons name="refresh" size={18} color="#0E3A8A" />
                <Text style={styles.ctrlTxtDark}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

/* ======================== PREMIUM ======================== */
function Premium({ navigation }) {
  const [chatVisible, setChatVisible] = useState(false);
  const [timer, setTimer] = useState(30);
  const [isPremiumPrompt, setIsPremiumPrompt] = useState(false);
  const fadeAnim = new Animated.Value(0);

  const goBack = () => navigation.goBack();

  useEffect(() => {
    if (chatVisible && !isPremiumPrompt) {
      const interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            setIsPremiumPrompt(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [chatVisible]);

  useEffect(() => {
    if (chatVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [chatVisible]);

  return (
    <LinearGradient
      colors={["#051738", "#0B2C6E", "#0E3A8A"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1 }}
    >
      <Header title="Premium AxisFive" onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        <View style={styles.premiumHero}>
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.heroTitle}>Coach mental IA — ton allié</Text>
          <Text style={styles.heroSubSimple}>
            Parle avec ton coach IA, découvre des conseils personnalisés pour ton
            mental, ton sommeil et ta performance.
          </Text>
          <View style={styles.simplePoints}>
            <View style={styles.simplePointRow}>
              <Ionicons name="chatbubbles-outline" size={18} color="#A5D8E8" />
              <Text style={styles.simplePointTxt}>
                Discussion guidée IA 24/7
              </Text>
            </View>
            <View style={styles.simplePointRow}>
              <Ionicons name="pulse-outline" size={18} color="#A5D8E8" />
              <Text style={styles.simplePointTxt}>
                Analyse émotionnelle instantanée
              </Text>
            </View>
            <View style={styles.simplePointRow}>
              <Ionicons name="bulb-outline" size={18} color="#A5D8E8" />
              <Text style={styles.simplePointTxt}>
                Exercices adaptés à ton état
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.ctaPrimary}>
            <Ionicons name="lock-open-outline" size={18} color="#0B1D3A" />
            <Text style={styles.ctaPrimaryTxt}>Essayer 7 jours</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSecondary}>
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.ctaSecondaryTxt}>Voir plans</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.legal}>
          30 s d’essai gratuit avec le coach IA. Annulation à tout moment.
        </Text>
      </ScrollView>

      {/* Coach IA flottant */}
      <TouchableOpacity
        onPress={() => setChatVisible(true)}
        activeOpacity={0.85}
        style={styles.floatingBtn}
      >
        <LinearGradient
          colors={["#00B4FF", "#0075D3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.floatingGradient}
        >
          <Ionicons name="mic-outline" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {chatVisible && (
        <Animated.View
          style={[
            styles.chatBubble,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          {!isPremiumPrompt ? (
            <View style={{ padding: 14 }}>
              <Text style={styles.chatTitle}>Coach IA</Text>
              <Text style={styles.chatText}>
                Salut 👋 Je suis ton coach mental IA. Dis-moi comment tu te sens,
                et je t’aide à te recentrer. (Essai gratuit : {timer}s)
              </Text>
              <Text style={styles.chatMini}>
                💬 “Je me sens stressé avant l’entraînement…”
              </Text>
            </View>
          ) : (
            <View style={{ padding: 14 }}>
              <Text style={styles.chatTitle}>Temps écoulé ⏱️</Text>
              <Text style={styles.chatText}>
                L’essai gratuit est terminé. Active le mode Premium pour continuer
                à discuter avec ton coach personnel IA.
              </Text>
              <TouchableOpacity style={styles.ctaMini}>
                <Ionicons name="sparkles-outline" size={16} color="#0B1D3A" />
                <Text style={styles.ctaMiniTxt}>Passer au Premium</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}
    </LinearGradient>
  );
}

/* ======================== NAVIGATEUR ======================== */
export default function Mental() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MentalHome" component={MentalHome} />
      <Stack.Screen name="MentalRoutine" component={MentalRoutine} />
      <Stack.Screen name="MentalProgram" component={MentalProgram} />
      <Stack.Screen name="Premium" component={Premium} />
    </Stack.Navigator>
  );
}

/* ======================== STYLES ======================== */
const styles = StyleSheet.create({
  h2: { color: TEXT_DIM, fontSize: 15, textAlign: "center", fontWeight: "700" },
  header: { paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 42, height: 42, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },
  headerTitleBox: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 26, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 20 },
  cardOutline: { borderRadius: 28, padding: 2, borderWidth: 4, backgroundColor: "transparent" },
  cardInnerTransparent: { borderRadius: 24, backgroundColor: "transparent", alignItems: "center" },
  cardTitle: { color: TEXT_WHITE, fontSize: 20, fontWeight: "900", textAlign: "center" },
  cardSub: { color: TEXT_DIM, fontSize: 14, marginTop: 4, fontWeight: "700", textAlign: "center", paddingHorizontal: 4 },
  sectionLeadWhite: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 10 },
  glassListCard: { borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "transparent" },
  routineTitleWhite: { color: "#fff", fontSize: 18, fontWeight: "900" },
  routineDescWhite: { color: "rgba(255,255,255,0.92)", marginTop: 6, fontWeight: "700" },
  timerOutline: { borderRadius: 26, padding: 2, marginTop: 18 },
  timerGlass: { borderRadius: 24, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.55)", alignItems: "center", padding: 18 },
  stepTitle: { color: "#0E3A8A", fontSize: 18, fontWeight: "900", textAlign: "center", marginTop: 4 },
  timerValue: { color: "#0B1D3A", fontSize: 44, marginVertical: 6, fontWeight: "900", textAlign: "center" },
  stepTip: { color: "#0E3A8A", textAlign: "center", fontWeight: "700", marginBottom: 8 },
  controls: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 10 },
  ctrlBtnGlass: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.65)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  ctrlTxtDark: { color: "#0E3A8A", fontWeight: "900" },
  premiumOutline: { borderRadius: 26, padding: 2, marginTop: 14 },
  premiumInner: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", padding: 18, minHeight: 96, justifyContent: "center" },
  premiumTitle: { color: "#fff", fontWeight: "900", fontSize: 18 },
  premiumDesc: { color: "rgba(255,255,255,0.92)", marginTop: 6, fontSize: 13.5, fontWeight: "700" },
  premiumBadge: { position: "absolute", right: 12, top: 12, flexDirection: "row", gap: 6, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, alignItems: "center" },
  premiumBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 12.5 },
  premiumHero: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)", padding: 18 },
  heroTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 22, marginBottom: 6 },
  heroSubSimple: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 14.5, marginBottom: 10 },
  simplePoints: { gap: 8, marginBottom: 10 },
  simplePointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  simplePointTxt: { color: "#FFFFFF", fontWeight: "800", fontSize: 14.5 },
  floatingBtn: { position: "absolute", bottom: 40, right: 26, zIndex: 99 },
  floatingGradient: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#00B4FF", shadowOpacity: 0.6, shadowRadius: 10 },
  chatBubble: { position: "absolute", bottom: 110, right: 20, width: 280, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", backgroundColor: "rgba(255,255,255,0.1)" },
  chatTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 16, marginBottom: 4 },
  chatText: { color: "rgba(255,255,255,0.95)", fontWeight: "700", marginBottom: 6 },
  chatMini: { color: "rgba(255,255,255,0.8)", fontStyle: "italic", fontSize: 13 },
  ctaMini: { flexDirection: "row", gap: 6, backgroundColor: "#4EA8DE", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  ctaMiniTxt: { color: "#0B1D3A", fontWeight: "900", fontSize: 14 },
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  ctaPrimary: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: "#4EA8DE" },
  ctaPrimaryTxt: { color: "#0B1D3A", fontWeight: "900", fontSize: 15 },
  ctaSecondary: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.06)" },
  ctaSecondaryTxt: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  legal: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 10, textAlign: "center", fontWeight: "700" },
});






