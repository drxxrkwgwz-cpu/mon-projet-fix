// ============================================================================
// ============================= IMPORTS GÉNÉRAUX ==============================
// ============================================================================
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  TextInput,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// On importe maintenant les écrans Boost depuis le fichier séparé
import { BoostMain, BoostCategory } from "./boostnutrition";

const { width: W } = Dimensions.get("window");

// ============================================================================
// ============================= CONFIG GRADIENT ===============================
// ============================================================================
const GRAD = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

const softVibrate = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// ============================================================================
// ========================== IMAGES ==========================================
// ============================================================================
const IMG_DEFAULT = require("./assets/image.jpg");
const IMG_PETITDEJ = require("./assets/petidejeuner.jpg");
const IMG_DEJEUNER = require("./assets/dejeuner.jpg");
const IMG_DINER = require("./assets/diner.jpg");
const IMG_COLATION = require("./assets/colation.jpg");

// Image d’illustration Boost = on réutilise l’image par défaut
const IMG_BOOST = IMG_DEFAULT;

// ============================================================================
// ============================ STACK NAVIGATION ==============================
// ============================================================================
const Stack = createNativeStackNavigator();

const Glass = ({ children, style }) => (
  <View style={[styles.glassWrap, style]}>
    <BlurView
      intensity={60}
      tint="light"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "rgba(255,255,255,0.08)" },
      ]}
    />
    <View style={{ padding: 14 }}>{children}</View>
  </View>
);

// ============================================================================
// ============================= WRAPPER PRINCIPAL ============================
// ============================================================================
export default function RecetteWrapper() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecetteMain" component={RecetteMain} />
      <Stack.Screen name="FilterTab" component={FilterTab} />
      <Stack.Screen name="SearchTab" component={SearchTab} />
      <Stack.Screen name="RecetteDetail" component={RecetteDetail} />

      {/* Boost Nutrition */}
      <Stack.Screen name="BoostMain" component={BoostMain} />
      <Stack.Screen name="BoostCategory" component={BoostCategory} />
    </Stack.Navigator>
  );
}

// ============================================================================
// =============================== MAIN SCREEN ================================
// ============================================================================
function RecetteMain({ navigation }) {
  const [tab, setTab] = useState("decouvrir");

  const handleTabPress = (key) => {
    softVibrate();
    setTab(key);
    if (key === "boost") {
      navigation.navigate("BoostMain");
    }
  };

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 200 }}>
        <View
          style={{
            marginTop: 55,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack?.()}>
            <Ionicons name="arrow-back" size={32} color="white" />
          </TouchableOpacity>

          <Text style={styles.title}>Recettes</Text>

          <View style={{ alignItems: "center", marginRight: 10 }}>
            <TouchableOpacity
              onPress={() => {
                softVibrate();
                navigation.navigate("SearchTab");
              }}
              style={{ marginBottom: 8 }}
            >
              <Ionicons name="search" size={28} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                softVibrate();
                navigation.navigate("FilterTab");
              }}
            >
              <Ionicons name="options" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Onglets en haut */}
        <View style={styles.tabContainer}>
          {[
            { key: "decouvrir", label: "Découvrir" },
            { key: "favoris", label: "Favoris" },
            { key: "boost", label: "Boost Nutrition" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => handleTabPress(t.key)}
              style={{ flex: 1, alignItems: "center" }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: tab === t.key ? "#7FFFD4" : "white" },
                ]}
              >
                {t.label}
              </Text>
              {tab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {tab === "decouvrir" && <DiscoverTab navigation={navigation} />}
        {tab === "favoris" && <FavorisTab />}
        {/* ← ici on a SUPPRIMÉ l’ancienne ligne BoostTab */}
      </ScrollView>
    </LinearGradient>
  );
}
// ============================================================================
// =============================== FAVORIS TAB ================================
// ============================================================================
function FavorisTab() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ color: "white", fontSize: 18 }}>
        Aucun favori ajouté pour le moment.
      </Text>
    </View>
  );
}

// ============================================================================
// ================================ DISCOVER TAB ==============================
// ============================================================================
function DiscoverTab({ navigation }) {
  const SPECIFIC = [
    {
      label: "Prise de masse",
      desc:
        "Repas riches en protéines et glucides propres pour construire du muscle. Apport énergétique constant. Optimisé pour performances lourdes.",
      recipes: [
        "Gainer bowl",
        "Pâtes poulet",
        "Burger fit",
        "Oats mass",
        "Riz dinde",
      ],
    },
    {
      label: "Sèche athlétique",
      desc:
        "Repas protéinés légers pour brûler la masse grasse. Énergie stable en séance. Idéal pour garder le physique sec.",
      recipes: [
        "Poulet vapeur",
        "Wok légumes",
        "Skyr fruits",
        "Omelette light",
        "Wrap light",
      ],
    },
    {
      label: "Endurance",
      desc:
        "Glucides digestes pour éviter les coups de fatigue. Énergie longue durée. Parfait pour efforts prolongés.",
      recipes: [
        "Porridge endurance",
        "Pâtes complètes",
        "Riz légumes",
        "Banane + amandes",
        "Pain miel",
      ],
    },
    {
      label: "Force / puissance",
      desc:
        "Haute densité en calories propres. Soutient le système nerveux et la récupération. Adapté aux charges maximales.",
      recipes: [
        "Bœuf riz",
        "Omelette 4 œufs",
        "Patate douce",
        "Pâtes viande",
        "Shake calories",
      ],
    },
    {
      label: "Recomposition",
      desc:
        "Macronutriments équilibrés pour progresser et sécher. Digestion fluide. Idéal pour un physique athlétique.",
      recipes: [
        "Poulet quinoa",
        "Tofu bowl",
        "Poisson vapeur",
        "Oeufs légumes",
        "Riz lentilles",
      ],
    },
  ];

  const ATHLETE = [
    {
      label: "Smoothies performants",
      desc:
        "Apport rapide en énergie propre. Favorise la récupération et l’hydratation. Idéal autour de l’entraînement.",
      recipes: [
        "Smoothie whey",
        "Caséine banane",
        "Red boost",
        "Gainer clean",
        "Smoothie cacao",
      ],
    },
    {
      label: "Breakfast du champion",
      desc:
        "Petit-déjeuner complet pour rester fort toute la matinée. Favorise énergie stable. Parfait avant grosse séance.",
      recipes: [
        "Oats power",
        "Pancakes whey",
        "Omelette 3 œufs",
        "Toast protéines",
        "Skyr céréales",
      ],
    },
    {
      label: "Repas légers séance",
      desc:
        "Digestion ultra rapide pour rester léger. Boost immédiat. Zéro lourdeur avant séance technique.",
      recipes: [
        "Banane whey",
        "Compote miel",
        "Toast miel",
        "Skyr",
        "Riz compote",
      ],
    },
    {
      label: "Repas lourds post-training",
      desc:
        "Recharge instantanée du glycogène. Accélère reconstruction musculaire. Idéal après séance intense.",
      recipes: [
        "Pâtes bœuf",
        "Riz poulet",
        "Gnocchis",
        "Poke saumon",
        "Bowl mass",
      ],
    },
    {
      label: "Vegan sportif",
      desc:
        "Sources végétales complètes et digestes. Maintient la performance sans produits animaux. Énergie propre assurée.",
      recipes: [
        "Tofu bowl",
        "Dahl lentilles",
        "Pois chiches riz",
        "Pâtes soja",
        "Smoothie vegan",
      ],
    },
    {
      label: "Sans lactose",
      desc:
        "Zéro inconfort digestif pour les sensibles. Riches en protéines propres. Idéal pour la performance continue.",
      recipes: [
        "Smoothie coco",
        "Poulet riz",
        "Banane avoine",
        "Bowl fruits",
        "Wrap dinde",
      ],
    },
  ];

  const WORLD = [
    {
      label: "Japon",
      desc:
        "Cuisine légère et riche en poissons. Digestion parfaite. Saveurs propres idéales au sport.",
      recipes: [
        "Sushi saumon",
        "Soba poulet",
        "Miso protéines",
        "Donburi",
        "Riz vinaigré",
      ],
    },
    {
      label: "Mexique",
      desc:
        "Recettes épicées revisitées light. Glucides propres pour énergie rapide. Parfait avant séance.",
      recipes: [
        "Tacos poulet",
        "Burrito fit",
        "Fajitas light",
        "Nachos sains",
        "Quesadilla whey",
      ],
    },
    {
      label: "Italie",
      desc:
        "Glucides digestes pour recharger efficacement. Saveurs traditionnelles. Idéal post-training.",
      recipes: [
        "Pâtes pesto",
        "Risotto light",
        "Gnocchis",
        "Lasagne fit",
        "Pâtes tomate",
      ],
    },
    {
      label: "USA",
      desc:
        "Volumes contrôlés mais consistants. Riche en protéines. Optimal journées chargées.",
      recipes: [
        "Burger fit",
        "Mac&Cheese light",
        "Pancakes whey",
        "Wrap dinde",
        "Oats mass",
      ],
    },
    {
      label: "Thaïlande",
      desc:
        "Cuisine fraîche et énergisante. Digestion rapide. Idéal avant séances explosives.",
      recipes: [
        "Pad thaï light",
        "Poulet gingembre",
        "Riz coco",
        "Soupe thaï",
        "Bowl thaï",
      ],
    },
    // (Suite du tableau → reste inchangé)
  ];

  const POPULAR = [
    { emoji: "⚡", label: "Énergie" },
    { emoji: "🫚", label: "Anti-inflammatoire" },
    { emoji: "🌿", label: "Digestion" },
    { emoji: "🍗", label: "Protéines" },
    { emoji: "💧", label: "Hydratation" },
    { emoji: "🔥", label: "Sèche" },
    { emoji: "💪", label: "Masse" },
    { emoji: "🥤", label: "Shakers" },
    { emoji: "🥗", label: "Léger" },
    { emoji: "⏱️", label: "Rapide" },
  ];

  const MEALS = [
    { name: "Petit-déjeuner", img: IMG_PETITDEJ },
    { name: "Déjeuner", img: IMG_DEJEUNER },
    { name: "Dîner", img: IMG_DINER },
    { name: "Collation", img: IMG_COLATION },
  ];

  return (
    <>
      <Text style={styles.section}>Les plus recherchés</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {POPULAR.map((p, i) => (
          <Glass key={i} style={styles.popularCase}>
            <Text style={styles.popularEmoji}>{p.emoji}</Text>
            <Text style={styles.popularLabel}>{p.label}</Text>
          </Glass>
        ))}
      </ScrollView>

      <Text style={styles.section}>Choisissez votre repas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MEALS.map((m, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => navigation.navigate("RecetteDetail", { item: m })}
          >
            <View style={styles.mealCard}>
              <Image source={m.img} style={styles.mealImg} />
              <View style={styles.mealBottom}>
                <Text style={styles.mealName}>{m.name}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.section}>Objectifs physiques</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SPECIFIC.map((s, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => navigation.navigate("RecetteDetail", { item: s })}
          >
            <View style={styles.worldCard}>
              <Image source={IMG_DEFAULT} style={styles.worldImg} />
              <Text style={styles.worldTitle}>{s.label}</Text>
              <Text style={styles.worldDesc}>{s.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.section}>Spécial athlète</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {ATHLETE.map((a, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => navigation.navigate("RecetteDetail", { item: a })}
          >
            <View style={styles.worldCard}>
              <Image source={IMG_DEFAULT} style={styles.worldImg} />
              <Text style={styles.worldTitle}>{a.label}</Text>
              <Text style={styles.worldDesc}>{a.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.section}>Repas du monde</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {WORLD.map((w, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => navigation.navigate("RecetteDetail", { item: w })}
          >
            <View style={styles.worldCard}>
              <Image source={IMG_DEFAULT} style={styles.worldImg} />
              <Text style={styles.worldTitle}>{w.label}</Text>
              <Text style={styles.worldDesc}>{w.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

// ============================================================================
// ============================== DETAIL SCREEN ================================
// ============================================================================
function RecetteDetail({ route, navigation }) {
  const { item } = route.params;

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 55, marginBottom: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={styles.detailTitle}>{item.label || item.name}</Text>

        <Image
          source={item.img ? item.img : IMG_DEFAULT}
          style={styles.detailImg}
        />

        {item.recipes && (
          <>
            <Text style={styles.detailSubtitle}>Recettes recommandées</Text>
            {item.recipes.map((r, i) => (
              <Glass key={i} style={{ marginBottom: 16 }}>
                <Text style={styles.recipeItem}>{r}</Text>
              </Glass>
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ============================================================================
// ================================ FILTER TAB =================================
// ============================================================================
function FilterTab({ navigation }) {
  const [objectif, setObjectif] = useState(null);
  const [typeRepas, setTypeRepas] = useState(null);
  const [timing, setTiming] = useState(null);
  const [contraintes, setContraintes] = useState([]);
  const [calories, setCalories] = useState(null);

  const FILTER_OBJECTIF = [
    { label: "Prise de masse", emoji: "💪" },
    { label: "Sèche", emoji: "🔥" },
    { label: "Endurance", emoji: "🏃‍♂️" },
    { label: "Recomposition", emoji: "🍫" },
    { label: "Force", emoji: "🏋️" },
    { label: "Énergie", emoji: "⚡" },
    { label: "Récupération", emoji: "😴" },
  ];
  const FILTER_TYPE_REPAS = [
    { label: "Petit-déjeuner", emoji: "🍳" },
    { label: "Déjeuner", emoji: "🍽️" },
    { label: "Dîner", emoji: "🌙" },
    { label: "Collation", emoji: "🍌" },
    { label: "Shake", emoji: "🥤" },
  ];

  const FILTER_TIMING = [
    { label: "Avant séance", emoji: "⏱️" },
    { label: "Pendant", emoji: "💥" },
    { label: "Après séance", emoji: "💪" },
    { label: "Jour OFF", emoji: "😌" },
    { label: "Compétition", emoji: "🏅" },
  ];

  const FILTER_CONTRAINTE = [
    { label: "Vegan", emoji: "🌱" },
    { label: "Sans lactose", emoji: "🥛" },
    { label: "Sans gluten", emoji: "🌾" },
  ];

  const FILTER_CALORIES = [
    "0 - 100 kcal",
    "100 - 200 kcal",
    "200 - 400 kcal",
    "400 - 600 kcal",
    "600 - 800 kcal",
    "800 - 1000 kcal",
    "1000+ kcal",
  ];

  const toggleContrainte = (label) => {
    softVibrate();
    if (contraintes.includes(label)) {
      setContraintes(contraintes.filter((c) => c !== label));
    } else {
      setContraintes([...contraintes, label]);
    }
  };

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 55, marginBottom: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={styles.title}>Filtres</Text>

        <Text style={styles.filterSectionTitle}>Objectif sportif</Text>
        <View style={styles.pillRow}>
          {FILTER_OBJECTIF.map((o) => {
            const active = objectif === o.label;
            return (
              <TouchableOpacity
                key={o.label}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setObjectif(o.label)}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {o.label} {o.emoji}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.filterSectionTitle}>Type de repas</Text>
        <View style={styles.pillRow}>
          {FILTER_TYPE_REPAS.map((t) => {
            const active = typeRepas === t.label;
            return (
              <TouchableOpacity
                key={t.label}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setTypeRepas(t.label)}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {t.label} {t.emoji}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.filterSectionTitle}>Timing</Text>
        <View style={styles.pillRow}>
          {FILTER_TIMING.map((t) => {
            const active = timing === t.label;
            return (
              <TouchableOpacity
                key={t.label}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setTiming(t.label)}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {t.label} {t.emoji}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.filterSectionTitle}>Contraintes</Text>
        <View style={styles.pillRow}>
          {FILTER_CONTRAINTE.map((c) => {
            const active = contraintes.includes(c.label);
            return (
              <TouchableOpacity
                key={c.label}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => toggleContrainte(c.label)}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {c.label} {c.emoji} {active && "❌"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.filterSectionTitle}>Calories</Text>
        <View style={styles.pillRow}>
          {FILTER_CALORIES.map((c) => {
            const active = calories === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setCalories(c)}
              >
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.applyButtonText}>Appliquer</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </LinearGradient>
  );
}

// ============================================================================
// ================================ SEARCH TAB =================================
// ============================================================================
function SearchTab({ navigation }) {
  const [search, setSearch] = useState("");

  const results = [
    { label: "Pancakes whey", img: IMG_PETITDEJ },
    { label: "Poulet riz", img: IMG_DEJEUNER },
    { label: "Salade grecque", img: IMG_DEFAULT },
  ];

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 55, marginBottom: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={styles.title}>Recherche</Text>

        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={22}
            color="white"
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une recette..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.detailSubtitle}>Suggestions</Text>

        {results.map((r, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => navigation.navigate("RecetteDetail", { item: r })}
          >
            <Glass style={{ marginBottom: 16 }}>
              <Text style={styles.recipeItem}>{r.label}</Text>
            </Glass>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

// ============================================================================
// ================================== STYLES ===================================
// ============================================================================
const CARD_HEIGHT = 330;

const styles = StyleSheet.create({
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 20,
    flex: 1,
    textAlign: "center",
  },

  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    marginTop: 10,
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
  },

  tabUnderline: {
    marginTop: 6,
    width: 40,
    height: 3,
    backgroundColor: "#00E0FF",
    borderRadius: 20,
  },

  section: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 20,
  },

  popularCase: {
    width: 100,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  popularEmoji: {
    fontSize: 28,
    textAlign: "center",
  },

  popularLabel: {
    color: "white",
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
  },

  mealCard: {
    width: 250,
    borderRadius: 22,
    overflow: "hidden",
    marginRight: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  mealImg: {
    width: "100%",
    height: 210,
    resizeMode: "cover",
  },

  mealBottom: {
    padding: 14,
  },

  mealName: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },

  worldCard: {
    width: 220,
    height: 330,
    borderRadius: 22,
    marginRight: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    justifyContent: "flex-start",
  },

  worldImg: {
    width: "100%",
    height: 155,
    resizeMode: "cover",
  },

  worldTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    marginTop: 12,
    paddingHorizontal: 14,
  },

  worldDesc: {
    color: "white",
    opacity: 0.9,
    marginTop: 6,
    paddingHorizontal: 14,
    fontSize: 14,
    lineHeight: 19,
  },

  detailTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 20,
  },

  detailImg: {
    width: "100%",
    height: 260,
    resizeMode: "cover",
    borderRadius: 20,
    marginBottom: 20,
  },

  detailSubtitle: {
    color: "#7FFFD4",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  recipeItem: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  glassWrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  filterSectionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 8,
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  pillActive: {
    backgroundColor: "rgba(0,224,255,0.20)",
    borderColor: "#00E0FF",
  },

  pillText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },

  pillTextActive: {
    color: "#00E0FF",
  },

  applyButton: {
    backgroundColor: "#00E0FF",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },

  applyButtonText: {
    color: "#031948",
    fontWeight: "900",
    fontSize: 16,
  },

  searchBar: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 45,
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
}); // ← Fin de StyleSheet.create
