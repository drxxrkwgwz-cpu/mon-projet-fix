// ======================================================
// ===================== IMPORTS ========================
// ======================================================
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
} from "react-native";

import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// ÉCRAN RECETTES
import Recette from "./Recette";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ======================================================
// ===================== CONSTANTS ======================
// ======================================================
const GRAD = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

const softVibrate = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ======================================================
// ======================= GLASS ========================
// ======================================================
const Glass = ({ children, style }) => (
  <View
    style={[
      {
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        marginBottom: 16,
      },
      style,
    ]}
  >
    <BlurView tint="dark" intensity={35} style={{ position: "absolute", inset: 0 }} />
    <View style={{ padding: 18 }}>{children}</View>
  </View>
);

// ======================================================
// ==================== INFO BULLE ======================
// ======================================================
const InfoBubble = ({ text, pos, onClose }) => (
  <TouchableWithoutFeedback onPress={onClose}>
    <View
      style={{
        position: "absolute",
        inset: 0,
        justifyContent: "flex-start",
        paddingTop: pos?.top || 100,
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(0,60,120,0.85)",
          padding: 18,
          borderRadius: 18,
          width: "72%",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      >
        <Text style={{ color: "white", fontSize: 15, lineHeight: 21, textAlign: "center" }}>
          {text}
        </Text>
      </View>
    </View>
  </TouchableWithoutFeedback>
);

// ======================================================
// ===================== FOOTER TABS ====================
// ======================================================
function NutritionFooter({ current, setCurrent }) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: "rgba(0,20,60,0.55)",
        borderTopWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* JOURNAL */}
      <TouchableOpacity onPress={() => setCurrent("journal")}>
        <Text
          style={{
            color: current === "journal" ? "#3FCEF9" : "white",
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          Journal
        </Text>
      </TouchableOpacity>

      {/* RECETTES */}
      <TouchableOpacity onPress={() => setCurrent("recettes")}>
        <Text
          style={{
            color: current === "recettes" ? "#3FCEF9" : "white",
            fontSize: 18,
            fontWeight: "800",
          }}
        >
          Recettes
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ======================================================
// ===================== JOURNAL SCREEN =================
// ======================================================
function JournalScreen({ navigation }) {
  const GOAL = 3332;

  const [consumed, setConsumed] = useState(0);
  const [burned, setBurned] = useState(0);

  const remaining = Math.max(GOAL - consumed + burned, 0);

  const [showDetail, setShowDetail] = useState(false);

  const toggleDetail = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    softVibrate();
    setShowDetail((s) => !s);
  };

  // ===== CALORIE CIRCLE =====
  const radius = 55;
  const circumference = 2 * Math.PI * radius;

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: consumed / GOAL,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [consumed]);

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // ===== POIDS & MESURES =====
  const [weight, setWeight] = useState(78.8);
  const [bodyMetrics, setBodyMetrics] = useState([]);

  const goToAddMeasures = () => {
    navigation.navigate("AddMeasure", {
      onSave: (measure) => setBodyMetrics((prev) => [...prev, measure]),
    });
  };

  // ===== HYDRATATION =====
  const [water, setWater] = useState(0);
  const [glasses, setGlasses] = useState(Array(8).fill(0));

  const waterAnim = useRef(new Animated.Value(0)).current;

  const animateWater = (to) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(waterAnim, {
      toValue: to,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const toggleGlass = (i) => {
    const arr = [...glasses];

    if (arr[i] === 1) {
      arr[i] = 0;
      setWater((w) => Math.max(0, w - 0.25));
      animateWater(0);
    } else {
      arr[i] = 1;
      setWater((w) => w + 0.25);
      animateWater(1);
    }

    softVibrate();
    setGlasses(arr);
  };

  // ===== TRAINING =====
  const [steps, setSteps] = useState(4200);
  const stepGoal = 10000;

  const [activityList, setActivityList] = useState([]);

  const addBurn = (session) => {
    setBurned((b) => b + session.calories);
    setActivityList((prev) => [...prev, session]);
  };

  // ===== FOOD LIST =====
  const [foodList, setFoodList] = useState([]);

  // ===== MACROS =====
  const [info, setInfo] = useState(null);
  const [infoPos, setInfoPos] = useState(null);

  const macros = [
    { label: "Glucides", total: 406, info: "Énergie rapide du sportif." },
    { label: "Protéines", total: 163, info: "Construction musculaire." },
    { label: "Lipides", total: 107, info: "Énergie longue durée." },
  ];

  // ===== RENDER =====
  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 200,
        }}
      >
        {/* RETOUR */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: "absolute", top: 40, left: 15, zIndex: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        {/* COMPOSITION */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Composition")}
          style={{
            position: "absolute",
            top: 78,
            right: 20,
            backgroundColor: "#00C6FF",
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 18,
            zIndex: 20,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            Composition
          </Text>
        </TouchableOpacity>

        {/* ================= CERCLE CALORIQUE ================= */}
        <Glass style={{ marginTop: 110 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* INGÉRÉES */}
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#00D5FF", fontSize: 24, fontWeight: "800" }}>
                {consumed}
              </Text>
              <Text style={{ color: "white", opacity: 0.7 }}>Ingérées</Text>
            </View>

            {/* CERCLE */}
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Svg height="170" width="170">
                <Defs>
                  <SvgGrad id="grad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#00E0FF" />
                    <Stop offset="1" stopColor="#7FFFD4" />
                  </SvgGrad>
                </Defs>

                <Circle
                  cx="85"
                  cy="85"
                  r={radius}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="14"
                  fill="none"
                />

                <AnimatedCircle
                  cx="85"
                  cy="85"
                  r={radius}
                  stroke="url(#grad)"
                  strokeWidth="14"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(90 85 85)"
                />
              </Svg>

              <View style={{ position: "absolute", top: 50, left: 0, right: 0, alignItems: "center" }}>
                <Text style={{ color: "white", fontSize: 34, fontWeight: "800" }}>
                  {remaining}
                </Text>
                <Text style={{ color: "#7FFFD4", fontSize: 16 }}>Restantes</Text>
              </View>
            </View>

            {/* BRÛLÉES */}
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#00D5FF", fontSize: 24, fontWeight: "800" }}>
                {burned}
              </Text>
              <Text style={{ color: "white", opacity: 0.7 }}>Brûlées</Text>
            </View>
          </View>

          {/* DETAILS */}
          <TouchableOpacity
            onPress={toggleDetail}
            style={{ marginTop: 18, alignSelf: "center" }}
          >
            <Ionicons
              name={showDetail ? "chevron-up" : "chevron-down"}
              size={30}
              color="#7FFFD4"
            />
          </TouchableOpacity>

          {showDetail && (
            <View style={{ marginTop: 10 }}>
              {/* FOOD */}
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  marginTop: 6,
                  marginBottom: 4,
                }}
              >
                • Aliments :
              </Text>

              {foodList.length === 0 ? (
                <Text style={{ color: "gray" }}>Aucun aliment enregistré</Text>
              ) : (
                foodList.map((f, i) => (
                  <Text key={i} style={{ color: "white" }}>
                    - {f}
                  </Text>
                ))
              )}

              {/* ACTIVITÉ */}
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  marginTop: 10,
                  marginBottom: 4,
                }}
              >
                • Training :
              </Text>

              {activityList.length === 0 ? (
                <Text style={{ color: "gray" }}>Aucune séance ajoutée</Text>
              ) : (
                activityList.map((a, i) => (
                  <Text key={i} style={{ color: "white" }}>
                    • {a.name} — {a.minutes} min — {a.calories} kcal
                  </Text>
                ))
              )}
            </View>
          )}

          {/* MACROS */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 18,
            }}
          >
            {macros.map((m, i) => (
              <View
                key={i}
                style={{ width: "30%", alignItems: "center" }}
              >
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center" }}
                  onPress={() => {
                    setInfo(m.info);
                    setInfoPos({ top: 130 });
                  }}
                >
                  <Text style={{ color: "white" }}>{m.label}</Text>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color="#00E0FF"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>

                <View
                  style={{
                    width: "85%",
                    height: 4,
                    backgroundColor: "rgba(255,255,255,0.25)",
                    borderRadius: 4,
                    marginTop: 6,
                  }}
                />
                <Text style={{ color: "white", opacity: 0.8, marginTop: 4 }}>
                  0 / {m.total} g
                </Text>
              </View>
            ))}
          </View>
        </Glass>

        {/* ======================================================
            ==================== BOUTONS KCAL ====================
            ====================================================== */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          {[100, 250, 500].map((v, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setConsumed((c) => c + v);
                softVibrate();
              }}
              style={{
                flex: 1,
                marginHorizontal: 6,
                borderColor: "#00C6FF",
                borderWidth: 1.5,
                borderRadius: 18,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                +{v} kcal
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ======================================================
            ====================== ALIMENTATION ==================
            ====================================================== */}
        <Text
          style={{
            color: "white",
            fontSize: 26,
            fontWeight: "800",
            marginTop: 28,
          }}
        >
          Alimentation
        </Text>

        {[
          { label: "Petit-déjeuner", icon: <MaterialIcons name="local-cafe" size={24} color="#3FCEF9" /> },
          { label: "Déjeuner", icon: <MaterialIcons name="restaurant" size={24} color="#3FCEF9" /> },
          { label: "Dîner", icon: <MaterialIcons name="ramen-dining" size={24} color="#3FCEF9" /> },
          { label: "En-cas", icon: <FontAwesome5 name="apple-alt" size={22} color="#3FCEF9" /> },
        ].map((m, i) => (
          <Glass key={i}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {m.icon}
                <Text style={{ color: "white", fontSize: 18, marginLeft: 10 }}>
                  {m.label}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  softVibrate();
                  setFoodList((prev) => [...prev, m.label]);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 18,
                  borderColor: "#00C6FF",
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#00C6FF",
                    fontSize: 22,
                    fontWeight: "900",
                  }}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </Glass>
        ))}

        {/* ======================================================
            ====================== SUIVI CORPOREL ================
            ====================================================== */}
        <Text
          style={{
            color: "white",
            fontSize: 26,
            fontWeight: "800",
            marginTop: 20,
          }}
        >
          Suivi corporel
        </Text>

        <Glass>
          <Text
            style={{
              color: "#7FFFD4",
              fontSize: 20,
              fontWeight: "700",
            }}
          >
            Poids & Mesures
          </Text>

          <View style={{ marginTop: 14 }}>
            <Text style={{ color: "#7FFFD4" }}>Objectif : 78.0 kg</Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              {/* ——— MINUS ——— */}
              <TouchableOpacity
                onPress={() => {
                  setWeight((w) => w - 0.1);
                  softVibrate();
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 28,
                  borderColor: "#00C6FF",
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 30,
                    fontWeight: "900",
                  }}
                >
                  −
                </Text>
              </TouchableOpacity>

              <Text
                style={{
                  color: "white",
                  fontSize: 38,
                  fontWeight: "900",
                }}
              >
                {weight.toFixed(1)} kg
              </Text>

              {/* ——— PLUS ——— */}
              <TouchableOpacity
                onPress={() => {
                  setWeight((w) => w + 0.1);
                  softVibrate();
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 28,
                  borderColor: "#00C6FF",
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 30,
                    fontWeight: "900",
                  }}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>

            {/* MESURES ENREGISTRÉES */}
            {bodyMetrics.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    color: "#7FFFD4",
                    fontSize: 18,
                    marginBottom: 10,
                  }}
                >
                  Mesures enregistrées
                </Text>

                {bodyMetrics.map((m, i) => (
                  <Text
                    key={i}
                    style={{
                      color: "white",
                      fontSize: 16,
                      marginBottom: 6,
                    }}
                  >
                    • {m.name}: {m.value} {m.unit}
                  </Text>
                ))}
              </View>
            )}

            {/* AJOUTER UNE MESURE */}
            <TouchableOpacity
              onPress={goToAddMeasures}
              style={{
                marginTop: 14,
                backgroundColor: "#00C6FF",
                paddingVertical: 12,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                Ajouter une mesure
              </Text>
            </TouchableOpacity>
          </View>
        </Glass>

        {/* ======================================================
            ======================= HYDRATATION =================
            ====================================================== */}
        <Text
          style={{ color: "white", fontSize: 26, fontWeight: "800", marginTop: 20 }}
        >
          Hydratation
        </Text>

        <Glass>
          <Text
            style={{ color: "#7FFFD4", textAlign: "center", marginBottom: 6 }}
          >
            Objectif : 2.0 L
          </Text>

          <Text
            style={{
              color: "white",
              fontSize: 30,
              fontWeight: "800",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {water.toFixed(2)} L
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 15,
            }}
          >
            {glasses.map((g, i) => (
              <TouchableOpacity key={i} onPress={() => toggleGlass(i)}>
                <Animated.View
                  style={{
                    width: 32,
                    height: 60,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: "#00C6FF",
                    backgroundColor: g
                      ? waterAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            "rgba(0,0,0,0)",
                            "rgba(0,200,255,0.45)",
                          ],
                        })
                      : "transparent",
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Glass>

        {/* ======================================================
            ========================== TRAINING =================
            ====================================================== */}
        <Text
          style={{ color: "white", fontSize: 26, fontWeight: "800", marginTop: 20 }}
        >
          Training
        </Text>

        <Glass>
          {/* PAS DU JOUR */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#7FFFD4", fontSize: 18 }}>
              Pas du jour
            </Text>
            <Text
              style={{ color: "white", fontSize: 34, fontWeight: "800" }}
            >
              {steps} pas
            </Text>
            <Text style={{ color: "#7FFFD4" }}>Objectif : {stepGoal}</Text>

            <View
              style={{
                width: "100%",
                height: 12,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 20,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  width: `${(steps / stepGoal) * 100}%`,
                  height: "100%",
                  backgroundColor: "#00C6FF",
                  borderRadius: 20,
                }}
              />
            </View>
          </View>

          {/* AJOUT ACTIVITÉ */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("ActivitySearch", {
                onAdd: addBurn,
              })
            }
            style={{
              alignSelf: "center",
              marginTop: 14,
              backgroundColor: "rgba(255,255,255,0.15)",
              width: 48,
              height: 48,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#7FFFD4",
                fontSize: 32,
                fontWeight: "900",
              }}
            >
              +
            </Text>
          </TouchableOpacity>

          {activityList.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: "#7FFFD4", fontSize: 18 }}>
                Activités :
              </Text>

              {activityList.map((a, i) => (
                <Text key={i} style={{ color: "white", marginTop: 6 }}>
                  • {a.name} — {a.minutes} min — {a.calories} kcal
                </Text>
              ))}
            </View>
          )}
        </Glass>
      </ScrollView>

      {info && (
        <InfoBubble text={info} pos={infoPos} onClose={() => setInfo(null)} />
      )}
    </LinearGradient>
  );
}

// ======================================================
// ===================== FIN DU BLOC 1 ==================
// ======================================================
// ======================================================
// ====================== ADD MEASURE ====================
// ======================================================
function AddMeasure({ navigation, route }) {
  const { onSave } = route.params;

  // ——— NOUVELLES CATÉGORIES TRIÉES ———
  const PRESET_MEASURES = [
    // ——— SANTÉ ———
    "Tension artérielle",
    "Fréquence cardiaque au repos",
    "Fréquence cardiaque maximale",
    "IMC",
    "Body Fat %",
    "Masse musculaire %",
    "Masse hydrique %",
    "Masse osseuse %",

    // ——— MESURES GÉNÉRALES ———
    "Poids",
    "Taille",
    "Tour de poitrine",
    "Tour de taille",
    "Tour de hanches",
    "Tour cervical",
    "Tour de poignet",
    "Tour de cheville",

    // ——— MEMBRES SUPÉRIEURS ———
    "Tour de bras",
    "Tour de biceps contracté",
    "Tour de triceps",
    "Tour d’avant-bras",
    "Longueur bras",

    // ——— MEMBRES INFÉRIEURS ———
    "Tour de cuisse",
    "Tour de quadriceps",
    "Tour d’ischios",
    "Tour de mollet",
    "Longueur jambe",

    // ——— PERFORMANCE ———
    "Envergure",
    "Hauteur de saut vertical",
    "Hauteur détente horizontale",
    "VMA",
    "VO2Max",
    "Temps 100m",
    "Temps 200m",
    "Temps 400m",
    "Temps 800m",
    "Temps 1500m",
    "1RM Bench Press",
    "1RM Squat",
    "1RM Soulevé de terre",
  ];

  const [name, setName] = useState(PRESET_MEASURES[0]);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("cm");
  const [openList, setOpenList] = useState(false);

  const handleSave = () => {
    if (!value) return;
    softVibrate();
    onSave({ name, value, unit });
    navigation.goBack();
  };

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 200 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 60, marginBottom: 15 }}>
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={{ color: "white", fontSize: 34, fontWeight: "900", marginBottom: 25 }}>
          Ajouter une mesure
        </Text>

        <Glass>
          {/* NOM */}
          <Text style={{ color: "#7FFFD4", fontSize: 18 }}>Nom de la mesure</Text>

          <TouchableOpacity
            onPress={() => setOpenList(!openList)}
            style={{
              marginTop: 10,
              backgroundColor: "rgba(255,255,255,0.15)",
              padding: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "white", fontSize: 18 }}>{name}</Text>
          </TouchableOpacity>

          {openList && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: 10,
                maxHeight: 260,
              }}
            >
              <ScrollView>
                {PRESET_MEASURES.map((m, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setName(m);
                      setOpenList(false);
                      softVibrate();
                    }}
                    style={{ paddingVertical: 10 }}
                  >
                    <Text style={{ color: "white", fontSize: 17 }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* VALEUR */}
          <Text style={{ color: "#7FFFD4", fontSize: 18, marginTop: 20 }}>Valeur</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="Ex : 55"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={{
              marginTop: 10,
              backgroundColor: "rgba(255,255,255,0.15)",
              padding: 14,
              borderRadius: 14,
              color: "white",
              fontSize: 18,
            }}
          />

          {/* UNITÉ */}
          <Text style={{ color: "#7FFFD4", fontSize: 18, marginTop: 20 }}>Unité</Text>
          <TextInput
            value={unit}
            onChangeText={setUnit}
            placeholder="cm / kg / % / bpm…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={{
              marginTop: 10,
              backgroundColor: "rgba(255,255,255,0.15)",
              padding: 14,
              borderRadius: 14,
              color: "white",
              fontSize: 18,
            }}
          />

          {/* BOUTON */}
          <TouchableOpacity
            onPress={handleSave}
            style={{
              marginTop: 25,
              backgroundColor: "#00C6FF",
              paddingVertical: 14,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontSize: 20, fontWeight: "800" }}>
              Ajouter
            </Text>
          </TouchableOpacity>
        </Glass>
      </ScrollView>
    </LinearGradient>
  );
}

// ======================================================
// ===================== COMPOSITION ====================
// ======================================================
function CompositionScreen({ navigation }) {
  const sections = [
    {
      title: "Macros",
      data: [
        ["Glucides", "0 / 406 g"],
        ["Protéines", "0 / 163 g"],
        ["Lipides", "0 / 107 g"],
        ["Fibres", "0 / 30 g"],
        ["Sucres", "0 / 90 g"],
      ],
    },
    {
      title: "Vitamines",
      data: [
        ["Vitamine A", "0"],
        ["Vitamine B1", "0"],
        ["Vitamine B2", "0"],
        ["Vitamine B3", "0"],
        ["Vitamine B5", "0"],
        ["Vitamine B6", "0"],
        ["Vitamine B7", "0"],
        ["Vitamine B9", "0"],
        ["Vitamine B12", "0"],
        ["Vitamine C", "0"],
        ["Vitamine D", "0"],
        ["Vitamine E", "0"],
        ["Vitamine K", "0"],
      ],
    },
    {
      title: "Minéraux",
      data: [
        ["Calcium", "0"],
        ["Fer", "0"],
        ["Magnésium", "0"],
        ["Potassium", "0"],
        ["Sodium", "0"],
        ["Zinc", "0"],
        ["Cuivre", "0"],
      ],
    },
  ];

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 200 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 60, marginBottom: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={{ color: "white", fontSize: 34, fontWeight: "900", marginBottom: 20 }}>
          Composition
        </Text>

        {sections.map((sec, i) => (
          <Glass key={i}>
            <Text style={{ color: "#7FFFD4", fontSize: 24, fontWeight: "800", marginBottom: 10 }}>
              {sec.title}
            </Text>

            {sec.data.map((d, j) => (
              <View key={j} style={{ marginBottom: 10 }}>
                <Text style={{ color: "white", fontSize: 18 }}>
                  {d[0]} — {d[1]}
                </Text>
                <View
                  style={{
                    width: "100%",
                    height: 3,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    marginTop: 6,
                  }}
                />
              </View>
            ))}
          </Glass>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

// ======================================================
// ================== ACTIVITY SEARCH ====================
// ======================================================
const ACTIVITY_DATA = [
  { name: "Course à pied", baseCal: 7 },
  { name: "Cyclisme", baseCal: 6 },
  { name: "Natation", baseCal: 8 },
  { name: "Musculation", baseCal: 5 },
  { name: "Athlétisme", baseCal: 9 },
  { name: "Sprint", baseCal: 11 },
  { name: "Corde à sauter", baseCal: 9 },
  { name: "Footing", baseCal: 7 },
  { name: "Foot", baseCal: 8 },
  { name: "Basket", baseCal: 9 },
  { name: "Tennis", baseCal: 7 },
  { name: "Boxe", baseCal: 10 },
];

function ActivitySearch({ navigation, route }) {
  const { onAdd } = route.params;

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 200 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 60, marginBottom: 15 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={{ color: "white", fontSize: 34, fontWeight: "900", marginBottom: 20 }}>
          Training
        </Text>

        {ACTIVITY_DATA.map((a, i) => (
          <Glass key={i}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>{a.name}</Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ActivityDetails", {
                    activity: a,
                    onAdd,
                  })
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 20,
                  borderColor: "#00C6FF",
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#00C6FF", fontSize: 26, fontWeight: "900" }}>+</Text>
              </TouchableOpacity>
            </View>
          </Glass>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

// ======================================================
// ================== ACTIVITY DETAILS ==================
// ======================================================
function ActivityDetails({ navigation, route }) {
  const { activity, onAdd } = route.params;

  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState(1);

  const calories = Math.round(activity.baseCal * minutes * intensity);

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 200 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 60, marginBottom: 15 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={{ color: "white", fontSize: 34, fontWeight: "900", marginBottom: 18 }}>
          {activity.name}
        </Text>

        <Glass>
          {/* DURÉE */}
          <Text style={{ color: "#7FFFD4", fontSize: 20, marginBottom: 10 }}>Durée (minutes)</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 10 }}>
            <TouchableOpacity
              onPress={() => {
                setMinutes((m) => Math.max(5, m - 5));
                softVibrate();
              }}
              style={{
                width: 55,
                height: 55,
                borderRadius: 30,
                borderColor: "#00C6FF",
                borderWidth: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 32, fontWeight: "900" }}>−</Text>
            </TouchableOpacity>

            <Text style={{ color: "white", fontSize: 40, fontWeight: "900" }}>{minutes}</Text>

            <TouchableOpacity
              onPress={() => {
                setMinutes((m) => m + 5);
                softVibrate();
              }}
              style={{
                width: 55,
                height: 55,
                borderRadius: 30,
                borderColor: "#00C6FF",
                borderWidth: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 32, fontWeight: "900" }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* INTENSITÉ */}
          <Text style={{ color: "#7FFFD4", marginTop: 20 }}>Intensité</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 20 }}>
            <TouchableOpacity
              onPress={() => {
                setIntensity(1);
                softVibrate();
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 22,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: intensity === 1 ? "#7FFFD4" : "#00C6FF",
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>Normal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIntensity(2);
                softVibrate();
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 22,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: intensity === 2 ? "#7FFFD4" : "#00C6FF",
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>Intense</Text>
            </TouchableOpacity>
          </View>

          {/* KCAL */}
          <Text style={{ color: "white", fontSize: 22, textAlign: "center", marginBottom: 10 }}>
            ≈ {calories} kcal brûlées
          </Text>

          {/* BOUTON AJOUT */}
          <TouchableOpacity
            onPress={() => {
              onAdd({
                name: activity.name,
                minutes,
                intensity,
                calories,
              });
              softVibrate();
              navigation.goBack();
            }}
            style={{
              marginTop: 10,
              backgroundColor: "#00C6FF",
              borderRadius: 18,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontSize: 20, fontWeight: "800" }}>
              Ajouter
            </Text>
          </TouchableOpacity>
        </Glass>
      </ScrollView>
    </LinearGradient>
  );
}

// ======================================================
// ======================= NAVIGATION ===================
// ======================================================
const Stack = createNativeStackNavigator();

export default function Nutrition() {
  const [current, setCurrent] = useState("journal");

  return (
    <View style={{ flex: 1 }}>
      {current === "journal" ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Journal" component={JournalScreen} />
          <Stack.Screen name="Composition" component={CompositionScreen} />
          <Stack.Screen name="ActivitySearch" component={ActivitySearch} />
          <Stack.Screen name="ActivityDetails" component={ActivityDetails} />
          <Stack.Screen name="AddMeasure" component={AddMeasure} />
        </Stack.Navigator>
      ) : (
        <Recette />
      )}

      {/* FOOTER TABS */}
      <NutritionFooter current={current} setCurrent={setCurrent} />
    </View>
  );
}

// ======================================================
// ===================== FIN DU BLOC 2 ==================
// ======================================================
