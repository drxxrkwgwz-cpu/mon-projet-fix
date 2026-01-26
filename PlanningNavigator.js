// PlanningNavigator.js
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

const Stack = createNativeStackNavigator();

const GRADIENT = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

// Header
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

// Carte en verre
const GlassCard = ({ children, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginVertical: 8 }}>
    <View style={styles.card}>
      <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,45,110,0.35)" }]} />
      <View style={{ paddingVertical: 18, paddingHorizontal: 20 }}>{children}</View>
    </View>
  </TouchableOpacity>
);

// Mois
const MonthsScreen = ({ navigation }) => {
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return (
    <LinearGradient {...GRADIENT} style={{ flex: 1 }}>
      <Header title="Mois" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 50 }}>
        {months.map((m, i) => (
          <GlassCard key={i} onPress={() => navigation.navigate("Days", { monthIndex: i, year: 2025 })}>
            <Text style={styles.monthText}>{`${m} 2025`}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};

// Jours
const weekDays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const monthNames = [
  "janvier","février","mars","avril","mai","juin",
  "juillet","août","septembre","octobre","novembre","décembre",
];

const DaysScreen = ({ navigation, route }) => {
  const { monthIndex, year } = route.params;
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const [marks, setMarks] = useState({});
  const EMOJIS = {
    hard: require("./assets/emoji_hard.png"),
    medium: require("./assets/emoji_medium.png"),
    easy: require("./assets/emoji_easy.png"),
  };

  const days = Array.from({ length: last.getDate() }, (_, i) => {
    const d = new Date(year, monthIndex, i + 1);
    return { key: i + 1, label: `${weekDays[d.getDay()]} ${i + 1} ${monthNames[monthIndex]}` };
  });

  useEffect(() => {
    const sub = navigation.addListener("focus", () => {
      if (route.params?.savedEmoji && route.params?.savedDay) {
        setMarks((p) => ({ ...p, [route.params.savedDay]: route.params.savedEmoji }));
        navigation.setParams({ savedEmoji: undefined, savedDay: undefined });
      }
    });
    return sub;
  }, [navigation, route.params]);

  return (
    <LinearGradient {...GRADIENT} style={{ flex: 1 }}>
      <Header
        title={`${monthNames[monthIndex][0].toUpperCase() + monthNames[monthIndex].slice(1)} ${year}`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        {days.map((d) => (
          <View key={d.key} style={{ position: "relative" }}>
            <GlassCard
              onPress={() => navigation.navigate("DayDetail", { year, monthIndex, day: d.key })}
            >
              <Text style={styles.dayText}>{d.label}</Text>
            </GlassCard>
            {marks[d.key] && (
              <Image
                source={EMOJIS[marks[d.key]]}
                style={styles.dayEmoji}
                resizeMode="contain"
              />
            )}
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
};

// Détail d’un jour
const DayDetailScreen = ({ navigation, route }) => {
  const { year, monthIndex, day } = route.params;
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState(null);
  const EMOJIS = {
    hard: require("./assets/emoji_hard.png"),
    medium: require("./assets/emoji_medium.png"),
    easy: require("./assets/emoji_easy.png"),
  };

  const save = () => {
    navigation.navigate("Days", {
      year,
      monthIndex,
      savedDay: day,
      savedEmoji: selected,
    });
  };

  return (
    <LinearGradient {...GRADIENT} style={{ flex: 1 }}>
      <Header
        title={`${weekDays[new Date(year, monthIndex, day).getDay()]} ${day} ${monthNames[monthIndex]}`}
        onBack={() => navigation.goBack()}
      />
      <View style={{ flex: 1, justifyContent: "space-between", padding: 18 }}>
        <View style={[styles.card, { flex: 1, borderRadius: 22 }]}>
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,45,110,0.35)" }]} />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Écris ta journée..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
            style={{ flex: 1, padding: 16, color: "#fff", fontSize: 16 }}
          />
        </View>

        <View style={{ marginTop: 25, marginBottom: 10 }}>
          <Text style={styles.sectionLabel}>Niveau de difficulté :</Text>
          <View style={styles.emojiRow}>
            {["hard", "medium", "easy"].map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.emojiBtn, selected === k && { borderColor: "#3CC1FF" }]}
                onPress={() => setSelected(k)}
              >
                <Image source={EMOJIS[k]} style={{ width: 46, height: 46 }} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={save} activeOpacity={0.85} style={{ alignSelf: "center" }}>
            <LinearGradient
              colors={["#2AA4FF", "#0E67FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveBtn}
            >
              <Text style={styles.saveText}>Sauvegarder</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

// Navigation
export default function PlanningNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Months" component={MonthsScreen} />
      <Stack.Screen name="Days" component={DaysScreen} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} />
    </Stack.Navigator>
  );
}

// Styles
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTitleBox: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 22 },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#2E73FF",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 10,
  },
  monthText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  dayText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dayEmoji: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -15 }],
    width: 36,
    height: 36,
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  emojiBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 18, fontWeight: "800" },
});




