import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { supabase } from "./src/lib/supabase";

// === IMPORTS SCREENS ===
import PlanningNavigator from "./PlanningNavigator";
import Soins, { ListeBlessures, FicheBlessure } from "./Soins";
import Nutrition from "./Nutrition";
import Recette from "./Recette";
import Recuperation from "./Recuperation";
import CoachOnboarding from "./CoachOnboarding";
import CoachDashboard from "./CoachDashboard";

enableScreens();

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
    icon: <Ionicons name="pulse-outline" size={22} color="#fff" />,
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
const Tab = createBottomTabNavigator();

function PremiumTabButton({ children, onPress, accessibilityState, isCenter = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  const focused = Boolean(accessibilityState?.selected);

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(isCenter ? 0.92 : 0.9)}
      onPressOut={() => animateTo(1)}
      style={[styles.tabButtonWrap, isCenter && styles.centerTabButtonWrap]}
    >
      <Animated.View
        style={[
          styles.tabButton,
          focused && styles.tabButtonFocused,
          isCenter && styles.centerTabButton,
          { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function HomeScreen({ navigation, hasCompletedOnboarding }) {
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
  }, [rotate]);

  const spinDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const counterSpin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-360deg"],
  });

  const handleCoachPress = () => {
    if (hasCompletedOnboarding) {
      navigation.navigate("Coach");
      return;
    }
    navigation.navigate("Coach");
  };

  return (
    <ImageBackground source={BG} style={styles.container} resizeMode="cover">
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.18)"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setMenuVisible((v) => !v)}
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

      <View style={styles.ringWrap}>
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
          {PILLARS.map((p, idx) => {
            const angle = (idx / PILLARS.length) * Math.PI * 2 - Math.PI / 2;
            const x = RADIUS + Math.cos(angle) * (RADIUS - NODE / 2) - NODE / 2;
            const y = RADIUS + Math.sin(angle) * (RADIUS - NODE / 2) - NODE / 2;

            const onPress = () => {
              if (p.id === "recup") navigation.navigate("Recuperation");
              else if (p.id === "soins") navigation.navigate("Soins");
              else if (p.id === "nutri") navigation.navigate("Nutrition");
              else if (p.id === "mental")
                navigation.navigate("PillarDetail", { title: "Mental" });
              else if (p.id === "prev")
                navigation.navigate("PillarDetail", { title: "Prévention" });
            };

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.86}
                style={[styles.node, { left: x, top: y }]}
                onPress={onPress}
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

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.centerCoach}
          onPress={handleCoachPress}
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

          <TouchableOpacity
            style={styles.menuNode}
            onPress={async () => {
              await supabase.auth.signOut();
              setMenuVisible(false);
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.menuNodeText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </ImageBackground>
  );
}

function PillarDetail({ route }) {
  return (
    <View style={styles.placeholderScreen}>
      <Text style={styles.placeholderTitle}>{route.params?.title}</Text>
    </View>
  );
}

function ProgressionScreen() {
  return (
    <View style={styles.placeholderScreen}>
      <Ionicons name="stats-chart" size={42} color="#3FCEF9" />
      <Text style={styles.placeholderTitle}>Progression</Text>
      <Text style={styles.placeholderText}>Suivi des performances bientôt disponible.</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={styles.placeholderScreen}>
      <Ionicons name="settings-outline" size={42} color="#3FCEF9" />
      <Text style={styles.placeholderTitle}>Paramètres</Text>
      <Text style={styles.placeholderText}>Écran placeholder prêt à être complété.</Text>
    </View>
  );
}

function CoachTabScreen({ hasCompletedOnboarding, onComplete }) {
  if (!hasCompletedOnboarding) {
    return <CoachOnboarding onDone={onComplete} />;
  }

  return <CoachDashboard />;
}

function AppTabs({ hasCompletedOnboarding, onCompleteOnboarding }) {
  const getTabIcon = (routeName, focused, color) => {
    if (routeName === "Accueil") {
      return <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />;
    }
    if (routeName === "Planning") {
      return (
        <Ionicons
          name={focused ? "calendar" : "calendar-outline"}
          size={22}
          color={color}
        />
      );
    }
    if (routeName === "Coach") {
      return <Ionicons name="fitness" size={30} color="#0A0A0F" />;
    }
    if (routeName === "Progression") {
      return (
        <Ionicons
          name={focused ? "trending-up" : "trending-up-outline"}
          size={22}
          color={color}
        />
      );
    }

    return (
      <Ionicons
        name={focused ? "settings" : "settings-outline"}
        size={22}
        color={color}
      />
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: 4,
        },
        tabBarActiveTintColor: "#3FCEF9",
        tabBarInactiveTintColor: "#6C788F",
        tabBarStyle: styles.premiumTabBar,
        tabBarIcon: ({ focused, color }) => getTabIcon(route.name, focused, color),
        tabBarButton: (props) => {
          const isCenter = route.name === "Coach";
          return <PremiumTabButton {...props} isCenter={isCenter} />;
        },
      })}
    >
      <Tab.Screen name="Accueil">
        {(props) => (
          <HomeScreen
            {...props}
            hasCompletedOnboarding={hasCompletedOnboarding}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Planning" component={PlanningNavigator} />
      <Tab.Screen
        name="Coach"
        options={{
          tabBarLabelStyle: { marginBottom: 10, fontSize: 12, fontWeight: "800" },
          tabBarActiveTintColor: "#3FCEF9",
        }}
      >
        {(props) => (
          <CoachTabScreen
            {...props}
            hasCompletedOnboarding={hasCompletedOnboarding}
            onComplete={onCompleteOnboarding}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Progression" component={ProgressionScreen} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const signIn = async () => {
    setLoading(true);
    setMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setLoading(true);
    setMsg("");
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) setMsg(error.message);
      else setMsg("Compte créé. Vérifie tes emails si confirmation activée.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authWrap}>
      <Text style={styles.authTitle}>Connexion</Text>

      <View style={styles.authCard}>
        <Text style={styles.authLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email"
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.authInput}
        />

        <Text style={[styles.authLabel, { marginTop: 12 }]}>Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="mot de passe"
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.authInput}
        />

        {msg ? <Text style={styles.authMsg}>{msg}</Text> : null}

        <TouchableOpacity onPress={signIn} disabled={loading} style={styles.authBtn}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.authBtnText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={signUp}
          disabled={loading}
          style={[
            styles.authBtn,
            { marginTop: 10, backgroundColor: "rgba(255,255,255,0.12)" },
          ]}
        >
          <Text style={styles.authBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// === APP ===
export default function App() {
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const isChecking = useMemo(
    () => isCheckingSession || isCheckingProfile,
    [isCheckingSession, isCheckingProfile]
  );

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data?.session ?? null);
          setIsCheckingSession(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsCheckingSession(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsCheckingSession(false);

      if (!nextSession) {
        setHasCompletedOnboarding(false);
        setIsCheckingProfile(false);
      }
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkProfile = async () => {
      if (!session?.user?.id) {
        if (isMounted) {
          setHasCompletedOnboarding(false);
          setIsCheckingProfile(false);
        }
        return;
      }

      setIsCheckingProfile(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coach_calls_you, level")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data) {
          setHasCompletedOnboarding(false);
        } else {
          const hasCoachName =
            typeof data.coach_calls_you === "string" &&
            data.coach_calls_you.trim().length > 0;
          const hasLevel =
            data.level !== null &&
            data.level !== undefined &&
            `${data.level}`.trim().length > 0;

          setHasCompletedOnboarding(hasCoachName && hasLevel);
        }
      } catch (_e) {
        if (isMounted) setHasCompletedOnboarding(false);
      } finally {
        if (isMounted) setIsCheckingProfile(false);
      }
    };

    checkProfile();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  if (isChecking) {
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
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs">
            {(props) => (
              <AppTabs
                {...props}
                hasCompletedOnboarding={hasCompletedOnboarding}
                onCompleteOnboarding={handleOnboardingComplete}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Soins" component={Soins} />
          <Stack.Screen name="ListeBlessures" component={ListeBlessures} />
          <Stack.Screen name="FicheBlessure" component={FicheBlessure} />
          <Stack.Screen name="Nutrition" component={Nutrition} />
          <Stack.Screen name="Recette" component={Recette} />
          <Stack.Screen name="Recuperation" component={Recuperation} />
          <Stack.Screen name="PillarDetail" component={PillarDetail} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
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

  premiumTabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#0D111A",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(63,206,249,0.22)",
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
  },
  tabButtonWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTabButtonWrap: {
    marginTop: -28,
  },
  tabButton: {
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tabButtonFocused: {
    backgroundColor: "rgba(63,206,249,0.10)",
  },
  centerTabButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#3FCEF9",
    borderWidth: 3,
    borderColor: "rgba(8,14,22,0.92)",
    shadowColor: "#3FCEF9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 16,
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
    marginTop: height * 0.24,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: { position: "absolute" },

  node: {
    position: "absolute",
    width: NODE,
    height: NODE,
  },
  nodeCircle: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  nodeContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  nodeText: {
    marginTop: 6,
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    textAlign: "center",
  },

  centerCoach: {
    width: Math.min(width * 0.42, 170),
    height: Math.min(width * 0.42, 170),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  centerCoachInner: { alignItems: "center", justifyContent: "center" },
  centerLogo: { width: 54, height: 54, resizeMode: "contain", marginBottom: 8 },
  centerCoachText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  menuContainer: {
    position: "absolute",
    left: 18,
    top: 98,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 10,
  },
  menuNode: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuNodeText: { color: "#fff", fontWeight: "800" },

  placeholderScreen: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 28,
    marginTop: 12,
    textAlign: "center",
  },
  placeholderText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },

  authWrap: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  authTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 14,
  },
  authCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  authLabel: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  authInput: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  authMsg: { marginTop: 10, color: "rgba(255,255,255,0.8)" },
  authBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  authBtnText: { color: "#fff", fontWeight: "800" },
});
