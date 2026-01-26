// Soins.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Image,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

/* === Dégradé bleu profond inspiré de ton image === */
const APP_GRADIENT = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

/* === Carte avec effet verre bleuté et lueur === */
const GlassCard = ({ children, style }) => (
  <View style={[styles.cardShadow, style]}>
    <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: "rgba(15, 45, 110, 0.35)", // bleu foncé semi-transparent
        },
      ]}
    />
    <View style={styles.cardInner}>{children}</View>
  </View>
);

/* === Animation d’apparition fluide === */
const FadeIn = ({ delay = 0, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }, { scale }] }, style]}>
      {children}
    </Animated.View>
  );
};

/* === Effet tactile pressé (3D) === */
const PressableCard = ({ onPress, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, friction: 5, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  return (
    <TouchableWithoutFeedback onPressIn={pressIn} onPressOut={pressOut} onPress={onPress}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>
    </TouchableWithoutFeedback>
  );
};

/* === Header === */
const HeaderBar = ({ title, onBack }) => {
  const nav = useNavigation();
  const topPad = Platform.OS === "ios" ? 56 : (StatusBar.currentHeight ?? 0) + 12;

  return (
    <View style={[styles.headerWrap, { paddingTop: topPad }]}>
      <TouchableWithoutFeedback onPress={onBack ?? (() => nav.goBack())}>
        <View style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.headerTitlePill}>
        <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.headerTitleText}>{title}</Text>
      </View>

      <View style={{ width: 42, height: 42 }} />
    </View>
  );
};

/* === Données blessures === */
const BLESSURES_HAUT = [
  "Épaule (tendinite coiffe)",
  "Épaule (conflit sous-acromial)",
  "Épaule (instabilité)",
  "Luxation épaule",
  "Bursite épaule",
  "Capsulite",
  "Coude (épicondylite)",
  "Biceps (tendinite)",
  "Poignet (entorse)",
  "Main (entorse)",
  "Cervicalgies",
  "Trapèze (tension musculaire)",
];

const BLESSURES_BAS = [
  "Genou (entorse LCA)",
  "Genou (ménisque)",
  "Cheville (entorse)",
  "Mollet (claquage)",
  "Ischio-jambiers (déchirure)",
  "Quadriceps (déchirure)",
  "Tendon d'Achille (tendinite)",
  "Aponévrosite plantaire",
  "Pubalgie",
  "Périostite tibiale",
];

/* === Écran principal === */
function SoinsScreen() {
  const navigation = useNavigation();
  const goto = (zone) => navigation.navigate("ListeBlessures", { zone });

  return (
    <LinearGradient
      colors={APP_GRADIENT.colors}
      start={APP_GRADIENT.start}
      end={APP_GRADIENT.end}
      style={{ flex: 1 }}
    >
      <HeaderBar title="Soins" />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <FadeIn delay={40}>
          <PressableCard onPress={() => goto("haut")}>
            <GlassCard style={styles.bigCard}>
              <View style={styles.cardContent}>
                <Image
                  source={require("./assets/muscle_haut.png")}
                  style={styles.muscleImage}
                  resizeMode="contain"
                />
                <Text style={styles.cardTitle}>Haut du corps</Text>
                <Text style={styles.cardSub}>Ex : épaule, coude, poignet…</Text>
              </View>
            </GlassCard>
          </PressableCard>
        </FadeIn>

        <FadeIn delay={100}>
          <PressableCard onPress={() => goto("bas")}>
            <GlassCard style={styles.bigCard}>
              <View style={styles.cardContent}>
                <Image
                  source={require("./assets/muscle_bas.png")}
                  style={styles.muscleImage}
                  resizeMode="contain"
                />
                <Text style={styles.cardTitle}>Bas du corps</Text>
                <Text style={styles.cardSub}>Ex : genou, cheville, mollet…</Text>
              </View>
            </GlassCard>
          </PressableCard>
        </FadeIn>

        <FadeIn delay={160}>
          <PressableCard>
            <GlassCard style={styles.bigCard}>
              <View style={styles.cardContent}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={50}
                  color="#fff"
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.cardTitle}>Discuter avec l’IA</Text>
                <Text style={styles.cardSub}>
                  Obtiens un avis intelligent sur ta douleur
                </Text>
              </View>
            </GlassCard>
          </PressableCard>
        </FadeIn>
      </ScrollView>
    </LinearGradient>
  );
}

/* === ListeBlessures === */
function ListeBlessures() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const zone = params?.zone === "haut" ? "haut" : "bas";
  const [query, setQuery] = useState("");

  const data = zone === "haut" ? BLESSURES_HAUT : BLESSURES_BAS;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    const strip = (s) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return data.filter((x) => strip(x).includes(strip(q)));
  }, [query, data]);

  return (
    <LinearGradient
      colors={APP_GRADIENT.colors}
      start={APP_GRADIENT.start}
      end={APP_GRADIENT.end}
      style={{ flex: 1 }}
    >
      <HeaderBar
        title={zone === "haut" ? "Haut du corps" : "Bas du corps"}
        onBack={() => navigation.goBack()}
      />

      <View style={{ paddingHorizontal: 18, marginTop: 8 }}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color="rgba(255,255,255,0.95)"
            style={{ marginLeft: 10 }}
          />
          <TextInput
            placeholder="Cherche une blessure (ex : tendinite)"
            placeholderTextColor="rgba(255,255,255,0.8)"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
        {filtered.map((lib, idx) => (
          <FadeIn key={idx} delay={20 + idx * 10}>
            <PressableCard
              onPress={() => navigation.navigate("FicheBlessure", { titre: lib })}
            >
              <GlassCard style={styles.smallCard}>
                <View style={styles.blessureItem}>
                  <Text style={styles.itemText}>{lib}</Text>
                </View>
              </GlassCard>
            </PressableCard>
          </FadeIn>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

/* === FicheBlessure === */
function FicheBlessure() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const titre = params?.titre ?? "Blessure";

  return (
    <LinearGradient
      colors={APP_GRADIENT.colors}
      start={APP_GRADIENT.start}
      end={APP_GRADIENT.end}
      style={{ flex: 1 }}
    >
      <HeaderBar title={titre} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
        <GlassCard>
          <Text style={styles.sectionTitle}>Symptômes</Text>
          <Text style={styles.sectionText}>
            Douleur localisée, limitation de mouvement, douleur à l’effort…
          </Text>

          <Text style={styles.sectionTitle}>Diagnostic possible</Text>
          <Text style={styles.sectionText}>
            Tests cliniques, imagerie si nécessaire. Consulte si douleur vive,
            fièvre, ou perte de force.
          </Text>

          <Text style={styles.sectionTitle}>Premiers soins</Text>
          <Text style={styles.sectionText}>
            Repos, glace (15–20 min), compression, élévation. Antalgiques usuels
            si besoin. Évite les gestes douloureux.
          </Text>

          <Text style={styles.sectionTitle}>Rééducation / reprise</Text>
          <Text style={styles.sectionText}>
            Mobilité douce puis renforcement progressif. Reprise graduelle à
            l’effort avec échauffement et étirements légers.
          </Text>
        </GlassCard>
      </ScrollView>
    </LinearGradient>
  );
}

/* === Styles === */
const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTitlePill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    maxWidth: "72%",
  },
  headerTitleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 22,
    textAlign: "center",
  },

  /* --- effet verre + ombre bleue douce --- */
  cardShadow: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#2E73FF",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 16,
  },

  cardInner: { padding: 16 },
  bigCard: { marginVertical: 12 },
  smallCard: { marginVertical: 7, borderRadius: 22 },
  cardContent: { alignItems: "center", justifyContent: "center" },

  /* bonhommes agrandis de +40% */
  muscleImage: { width: 200, height: 200, marginBottom: 10 },

  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },

  searchWrap: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  searchInput: { flex: 1, color: "#fff", marginLeft: 8, fontSize: 15 },
  blessureItem: { paddingVertical: 10, paddingHorizontal: 16 },
  itemText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 6,
  },
  sectionText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
});

export default SoinsScreen;
export { ListeBlessures, FicheBlessure };




