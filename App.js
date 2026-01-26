import "react-native-gesture-handler";
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  ImageBackground,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { supabase } from "./src/lib/supabase";

// === IMPORTS SCREENS ===
import PlanningNavigator from "./PlanningNavigator";
import Soins, { ListeBlessures, FicheBlessure } from "./Soins";
import Nutrition from "./Nutrition";
import Recette from "./Recette";
import Recuperation from "./Recuperation"; // FIX : Correct import
import CoachOnboarding from "./CoachOnboarding"; // AJOUT
import CoachDashboard from "./CoachDashboard";
import AuthScreen from "./AuthScreen";

// === ASSETS ===
const BG = require("./assets/track.jpg");
const LOGO = require("./assets/logo.png");

// === CONSTANTES UI ===
const { width, height } = Dimensions.get("window");
const DIAMETER = Math.min(width * 0.74, 310);
const RADIUS = DIAMETER / 2;
const NODE = 74;

// === LES PILIERS ===
const PILLARS = [
  {
    id: "recup",
    label: "Récupération",
    icon: <Ionicons name="bed-outline" size={22} color="#fff" />,
  },
  {
    id: "soins",
    label: "Soins",
    icon: <FontAwesome5 name="first-aid" size={20} color="#fff" />,
  },
  {
    id: "prev",
    label: "Prévention",
    icon: <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />,
  },
  {
    id: "mental",
    label: "Mental",
    icon: <MaterialIcons name="self-improvement" size={24} color="#fff" />,
  },
  {
    id: "nutri",
    label: "Nutrition",
    icon: <Ionicons name="restaurant-outline" size={22} color="#fff" />,
  },
];

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      rotate.setValue(0);
      Animated.timing(rotate, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      }).start(({ finished }) => finished && loop());
    };
    loop();
    return () => rotate.stopAnimation();
  }, []);

  const spinDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const counterSpin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  return (
    <ImageBackground source={BG} style={styles.container} resizeMode="cover">
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.18)"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setMenuVisible(!menuVisible)}
      >
        <Ionicons name="menu" size={34} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.planningBox}
        onPress={() => navigation.navigate("Planning")}
      >
        <Ionicons
          name="calendar-outline"
          size={22}
          color="#fff"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.planningText}>Planning</Text>
      </TouchableOpacity>

      <View
        style={[
          styles.ringWrap,
          { width: DIAMETER + 60, height: DIAMETER + 60 },
        ]}
      >
        <View
          style={[
            styles.outerRing,
            {
              width: DIAMETER + 60,
              height: DIAMETER + 60,
              borderRadius: (DIAMETER + 60) / 2,
            },
          ]}
        />
        <View
          style={[
            styles.outerRing,
            {
              width: DIAMETER + 30,
              height: DIAMETER + 30,
              borderRadius: (DIAMETER + 30) / 2,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.ring,
            {
              width: DIAMETER,
              height: DIAMETER,
              borderRadius: RADIUS,
              transform: [{ rotate: spinDeg }],
            },
          ]}
        >
          {PILLARS.map((p, i) => {
            const angle = (i / PILLARS.length) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * (RADIUS - NODE / 2 - 6);
            const y = Math.sin(angle) * (RADIUS - NODE / 2 - 6);

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.nodeWrap,
                  { transform: [{ translateX: x }, { translateY: y }] },
                ]}
                onPress={() => {
                  if (p.id === "recup") navigation.navigate("Recuperation");
                  else if (p.id === "soins") navigation.navigate("Soins");
                  else if (p.id === "nutri") navigation.navigate("Nutrition");
                  else if (p.id === "mental")
                    navigation.navigate("PillarDetail", { title: "Mental" });
                  else if (p.id === "prev")
                    navigation.navigate("PillarDetail", { title: "Prévention" });
                }}
              >
                <Animated.View style={{ transform: [{ rotate: counterSpin }] }}>
                  <View style={styles.nodeCircle}>
                    <BlurView
                      intensity={25}
                      tint="dark"
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.nodeContent}>
                      {p.icon}
                      <Text style={styles.nodeText}>{p.label}</Text>
                    </View>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* CENTRE : PALIER COACH IA */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.centerCoach}
          onPress={() => {
            navigation.navigate("CoachOnboarding");
          }}
        >
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.centerCoachInner}>
            <Image source={LOGO} style={styles.centerLogo} />
            <Text style={styles.centerCoachText}>Coach IA</Text>
          </View>
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuNode}
            onPress={() => navigation.navigate("PillarDetail", { title: "Profil" })}
          >
            <Ionicons name="person-circle-outline" size={18} color="#fff" />
            <Text style={styles.menuNodeText}>Profil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuNode}
            onPress={() => navigation.navigate("Recette")}
          >
            <Ionicons name="fast-food-outline" size={18} color="#fff" />
            <Text style={styles.menuNodeText}>Recettes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuNode}
            onPress={() => navigation.navigate("Recuperation")}
          >
            <Ionicons name="pulse-outline" size={18} color="#fff" />
            <Text style={styles.menuNodeText}>Récup</Text>
          </TouchableOpacity>
        </View>
      )}
    </ImageBackground>
  );
}

function PillarDetail({ route }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0A0A0F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "800",
          fontSize: 28,
          marginTop: 12,
        }}
      >
        {route.params?.title}
      </Text>
    </View>
  );
}

// === NAVIGATION ===
export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data?.session ?? null);
          setChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) setChecking(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecking(false);
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CoachOnboarding" component={CoachOnboarding} />
        <Stack.Screen name="CoachDashboard" component={CoachDashboard} />
        <Stack.Screen name="Planning" component={PlanningNavigator} />
        <Stack.Screen name="Soins" component={Soins} />
        <Stack.Screen name="ListeBlessures" component={ListeBlessures} />
        <Stack.Screen name="FicheBlessure" component={FicheBlessure} />
        <Stack.Screen name="Nutrition" component={Nutrition} />
        <Stack.Screen name="Recette" component={Recette} />

        {/* FIX : ton palier Récupération est bien une Screen */}
        <Stack.Screen name="Recuperation" component={Recuperation} />

        <Stack.Screen name="PillarDetail" component={PillarDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  hamburger: { position: "absolute", top: 48, left: 18, zIndex: 10 },
  planningBox: {
    position: "absolute",
    top: 48,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  planningText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ringWrap: {
    alignSelf: "center",
    marginTop: height * 0.27,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: { position: "absolute", alignItems: "center", justifyContent: "center" },
  outerRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  centerCoach: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.35)",
  },
  centerCoachInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  centerLogo: {
    width: 60,
    height: 60,
    tintColor: "#2D9CFF",
    resizeMode: "contain",
  },
  centerCoachText: {
    marginTop: 6,
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  nodeWrap: { position: "absolute", alignItems: "center" },
  nodeCircle: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  nodeContent: { alignItems: "center", justifyContent: "center" },
  nodeText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  menuContainer: { position: "absolute", top: 100, left: 18, gap: 12 },
  menuNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  menuNodeText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
