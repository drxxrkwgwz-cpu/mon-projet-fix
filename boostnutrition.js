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
  Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons"; // Icônes Expo

// ============================================================================
// ========================== GRADIENT + UTIL LOCAL ===========================
// ============================================================================

// Gradient global (défini localement pour éviter tout import manquant)
const GRAD = {
  colors: ["#031948", "#052D7A", "#0847BF"],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

// Haptique très léger (no-op pour être sûr qu’il n’y ait aucun bug)
const softVibrate = () => {};

// Composant "Glass" local (aucun import externe, donc zéro erreur)
function Glass({ style, children }) {
  return <View style={[styles.glassBase, style]}>{children}</View>;
}

// Image Boost-header (la seule que tu veux ici)
const IMG_BOOST = require("./assets/boost-header.jpg");

// Dimensions
const { width: W } = Dimensions.get("window");

// ============================================================================
// ============================== BOOST MAIN GRID =============================
// ============================================================================
const BOOST_CATEGORIES = [
  {
    id: "testosterone",
    title: "Boost testostérone & hormones",
    subtitle: "Puissance, force, agressivité contrôlée.",
    emoji: "🧬",
  },
  {
    id: "antiInflammatoire",
    title: "Anti-inflammatoire",
    subtitle: "Douleurs ↓, récupération tendons / muscles.",
    emoji: "🧊",
  },
  {
    id: "recovery",
    title: "Récupération musculaire",
    subtitle: "Synthèse protéique & reconstructions.",
    emoji: "💪",
  },
  {
    id: "explosive",
    title: "Énergie explosive",
    subtitle: "Sprints, sauts, efforts courts violents.",
    emoji: "⚡",
  },
  {
    id: "endurance",
    title: "Endurance & mitochondries",
    subtitle: "VO2max, efforts longs, régularité.",
    emoji: "🏃‍♂️",
  },
  {
    id: "focus",
    title: "Concentration & réflexes",
    subtitle: "Clarté mentale, décision rapide.",
    emoji: "🧠",
  },
  {
    id: "sommeil",
    title: "Sommeil & hormone de croissance",
    subtitle: "Nuit profonde, reconstruction max.",
    emoji: "🌙",
  },
  {
    id: "digestion",
    title: "Digestion & microbiote",
    subtitle: "Zéro ballonnement, énergie stable.",
    emoji: "🦠",
  },
  {
    id: "hydratation",
    title: "Hydratation & électrolytes",
    subtitle: "Crampes ↓, perf maintenue.",
    emoji: "💧",
  },
  {
    id: "tendons",
    title: "Os & tendons",
    subtitle: "Prévention blessures & solidité.",
    emoji: "🦵",
  },
];

// ============================================================================
// ============================= BOOST FOODS MAP ==============================
// ============================================================================
// 10 aliments par catégorie, avec grade scientifique + explications
const BOOST_FOODS = {
  testosterone: [
    {
      name: "Huîtres",
      grade: "A",
      details:
        "Ultra riches en zinc, minéral clé de la production de testostérone. Soutient aussi l’immunité. Idéal 1 à 2 fois / semaine.",
      timing:
        "Plutôt hors séance, en repas classique. Important surtout sur la semaine, pas en pré-workout.",
    },
    {
      name: "Grenade",
      grade: "A",
      details:
        "Les polyphénols de la grenade aident à réduire le cortisol et soutiennent les hormones androgènes. Utile en période de stress ou de grosse charge d’entraînement.",
      timing:
        "Jus ou fruit entier le matin ou en collation. Intéressant en pré-compétition pour limiter le stress.",
    },
    {
      name: "Gingembre",
      grade: "A",
      details:
        "Plusieurs études humaines montrent une hausse de la testostérone et une meilleure qualité de spermatogenèse. Effet anti-inflammatoire en bonus.",
      timing:
        "Dans les plats, infusions ou shots. Peut être pris avant ou après séance, ou le soir.",
    },
    {
      name: "Saumon",
      grade: "A",
      details:
        "Oméga-3 + vitamine D → soutien global du système hormonal, amélioration du ratio testostérone / cortisol.",
      timing:
        "Repas du midi ou du soir, idéalement après une grosse séance pour calmer l’inflammation et le cortisol.",
    },
    {
      name: "Œufs entiers",
      grade: "A",
      details:
        "Fournissent le cholestérol de base utilisé par l’organisme pour fabriquer la testostérone. Profil d’acides aminés parfait pour la masse musculaire.",
      timing:
        "Petit-déjeuner ou repas post-training. 2 à 4 œufs selon le volume de l’athlète.",
    },
    {
      name: "Viande rouge maigre",
      grade: "A",
      details:
        "Apporte fer, zinc et créatine naturelle. Support hormonal + meilleure oxygénation du sang pour les séances lourdes.",
      timing:
        "Repas post-training lourd ou dîner 2–3 fois par semaine, en quantité maîtrisée.",
    },
    {
      name: "Amandes",
      grade: "B",
      details:
        "Source de bons lipides et de magnésium, associés à un meilleur équilibre hormonal chez le sportif.",
      timing:
        "Collation de la journée ou ajout dans un yaourt / smoothie.",
    },
    {
      name: "Avocat",
      grade: "B",
      details:
        "Riche en graisses mono-insaturées, favorise la santé cardiovasculaire et le terrain hormonal.",
      timing:
        "Repas du midi ou du soir, parfait dans un bowl post-training.",
    },
    {
      name: "Brocoli",
      grade: "B",
      details:
        "Les composés soufrés du brocoli aident à mieux gérer l’excès d’œstrogènes et à garder un profil hormonal plus favorable à la prise de force.",
      timing:
        "Avec les sources de protéines (poulet, bœuf, poisson) au déjeuner ou au dîner.",
    },
    {
      name: "Huile d’olive extra vierge",
      grade: "B",
      details:
        "Les polyphénols et les graisses mono-insaturées contribuent à un environnement métabolique qui soutient les hormones sexuelles.",
      timing:
        "Assaisonnement des repas, quotidiennement, plutôt cru qu’en cuisson forte.",
    },
  ],

  antiInflammatoire: [
    {
      name: "Curcuma",
      grade: "A",
      details:
        "Contient la curcumine, molécule largement étudiée pour ses effets anti-inflammatoires. Aide à réduire les douleurs articulaires et musculaires après les séances.",
      timing:
        "Dans les plats, lait d’or ou compléments, plutôt après l’entraînement ou le soir.",
    },
    {
      name: "Saumon",
      grade: "A",
      details:
        "EPA et DHA (oméga-3) réduisent les marqueurs d’inflammation et les DOMS. Favorise une meilleure récupération entre les séances.",
      timing: "Repas post-training ou dîner 2–3 fois / semaine.",
    },
    {
      name: "Myrtilles",
      grade: "A",
      details:
        "Riches en anthocyanes antioxydantes, aident à limiter les dommages oxydatifs liés aux séances intenses.",
      timing: "Collation, smoothie ou dessert post-séance.",
    },
    {
      name: "Gingembre",
      grade: "A",
      details:
        "Réduit douleurs musculaires et articulaires grâce à ses composés anti-inflammatoires. Intéressant sur des blocs de travail lourds.",
      timing: "Infusion ou ajout dans les repas, quotidiennement.",
    },
    {
      name: "Huile d’olive",
      grade: "A",
      details:
        "L’oléocanthal agit de manière similaire à certains anti-inflammatoires légers. Protège aussi le système cardiovasculaire.",
      timing: "Assaisonnement de base, tous les jours.",
    },
    {
      name: "Thé vert",
      grade: "A",
      details:
        "Les catéchines (EGCG) limitent le stress oxydatif et soutiennent la récupération globale.",
      timing: "En boisson dans la journée, loin du coucher (caféine).",
    },
    {
      name: "Noix",
      grade: "A",
      details:
        "Apportent des oméga-3 végétaux et de la vitamine E, qui participent à la protection des tissus.",
      timing: "En collation ou ajout dans muesli / salades.",
    },
    {
      name: "Tomates",
      grade: "B",
      details:
        "Le lycopène est associé à une diminution de certains marqueurs inflammatoires.",
      timing: "Plats cuisinés, sauces, salades.",
    },
    {
      name: "Brocoli",
      grade: "B",
      details:
        "Le sulforaphane contribue à l’activation des enzymes de défense cellulaire.",
      timing: "Accompagnement standard des repas protéinés.",
    },
    {
      name: "Ail",
      grade: "B",
      details:
        "Possède des effets anti-inflammatoires et antimicrobiens, intéressant pour le système immunitaire du sportif.",
      timing: "Dans les plats, quotidiennement si la digestion le tolère.",
    },
  ],

  recovery: [
    {
      name: "Whey protéine",
      grade: "A",
      details:
        "Protéine à digestion rapide, riche en leucine. Lance la synthèse musculaire juste après la séance.",
      timing: "Immédiatement post-workout ou dans l’heure qui suit.",
    },
    {
      name: "Lait / boisson lactée",
      grade: "A",
      details:
        "Mélange de whey + caséine + glucides naturels, combo idéal pour enclencher la récupération.",
      timing: "Après l’entraînement ou le soir pour compléter les apports.",
    },
    {
      name: "Œufs",
      grade: "A",
      details:
        "Protéines complètes avec profil d’acides aminés optimal pour la réparation musculaire.",
      timing:
        "Petit-déjeuner post-séance matinale ou repas après entraînement.",
    },
    {
      name: "Poulet",
      grade: "A",
      details:
        "Source de protéines maigres très utilisée en diète sportive pour reconstruire les fibres endommagées.",
      timing: "Repas du midi / soir après séance.",
    },
    {
      name: "Saumon",
      grade: "A",
      details:
        "Associe protéines de qualité et oméga-3 anti-inflammatoires → combo parfait récupération.",
      timing: "Repas du soir sur journées lourdes.",
    },
    {
      name: "Fromage blanc / skyr",
      grade: "A",
      details:
        "Protéines lentes (caséine) qui alimentent les muscles pendant plusieurs heures, idéal la nuit.",
      timing: "Collation du soir ou dessert post-dîner.",
    },
    {
      name: "Bœuf maigre",
      grade: "A",
      details:
        "Protéines, fer et créatine naturelle pour soutenir force et reconstruction musculaire.",
      timing:
        "1 à 3 fois par semaine, plutôt après grosses séances forces / sprint.",
    },
    {
      name: "Lentilles",
      grade: "B",
      details:
        "Protéines végétales + glucides + fer, utiles dans une récupération lente et complète.",
      timing:
        "Repas du midi ou du soir, hors séance immédiate (digestion un peu plus longue).",
    },
    {
      name: "Quinoa",
      grade: "B",
      details:
        "Céréale pseudo-complète qui apporte protéines + glucides, intéressant pour les repas post-training.",
      timing: "Base d’un bowl post-séance ou dîner de récupération.",
    },
    {
      name: "Yaourt grec",
      grade: "A",
      details:
        "Très riche en protéines + probiotiques pour le microbiote, donc meilleure assimilation des nutriments.",
      timing: "Collation post-séance ou petit-déjeuner.",
    },
  ],

  explosive: [
    {
      name: "Miel",
      grade: "A",
      details:
        "Glucides rapides naturels, parfaits pour donner un coup de fouet avant un effort explosif.",
      timing:
        "15–30 minutes avant séance courte / sprint ou en fin d’échauffement.",
    },
    {
      name: "Pain blanc",
      grade: "A",
      details:
        "Index glycémique élevé → recharge très rapide du glycogène musculaire.",
      timing:
        "Repas pré-séance explosive (1h30–2h avant) ou juste après pour recharge.",
    },
    {
      name: "Riz blanc",
      grade: "A",
      details:
        "Très bien toléré, remplit rapidement les muscles en glycogène sans trop charger la digestion.",
      timing: "Repas pré-compétition ou post-séance intensive.",
    },
    {
      name: "Banane",
      grade: "A",
      details:
        "Combo idéal glucides + potassium. Super snack avant sprint, sauts, muscu lourde.",
      timing:
        "30–60 minutes avant séance ou juste après avec une source de protéines.",
    },
    {
      name: "Jus de raisin",
      grade: "A",
      details:
        "Apporte des sucres rapides, utilisé dans plusieurs études comme carburant pour efforts intenses.",
      timing: "Peu avant ou pendant un effort court et violent.",
    },
    {
      name: "Dattes",
      grade: "A",
      details:
        "Très concentrées en glucides, faciles à transporter. C’est un carburant parfait pendant ou juste avant l’effort.",
      timing:
        "Pendant la séance (entre séries denses) ou 30 minutes avant.",
    },
    {
      name: "Pâtes blanches",
      grade: "A",
      details:
        "Base classique des repas de la veille ou du midi avant compétition pour remplir le glycogène.",
      timing: "Repas pré-compétition ou pré-séance clé (2–3h avant).",
    },
    {
      name: "Chocolat noir (70 % +)",
      grade: "B",
      details:
        "Caféine + flavonoïdes qui stimulent légèrement le système nerveux et la vigilance.",
      timing: "En petite portion avant séance ou en dessert.",
    },
    {
      name: "Café",
      grade: "B",
      details:
        "La caféine augmente la puissance et la mobilisation du système nerveux central.",
      timing: "30–45 minutes avant la séance (éviter tard le soir).",
    },
    {
      name: "Patate douce",
      grade: "B",
      details:
        "Glucides d’index modéré, utiles pour avoir assez d’énergie sans crash glycémiques.",
      timing:
        "Repas pré-séance explosive mais à bonne distance (2–3h).",
    },
  ],

  endurance: [
    {
      name: "Betterave",
      grade: "A",
      details:
        "Riche en nitrates, améliore l’utilisation de l’oxygène et peut augmenter la VO2max.",
      timing:
        "Jus ou betterave cuite 2–3h avant une séance longue ou une compétition.",
    },
    {
      name: "Avoine",
      grade: "A",
      details:
        "Glucides à digestion lente + fibres → énergie très stable sur la durée.",
      timing:
        "Petit-déjeuner avant une journée avec gros volume ou séance longue.",
    },
    {
      name: "Quinoa",
      grade: "A",
      details:
        "Glucides + protéines, très intéressant pour les sports d’endurance avec travail musculaire important.",
      timing:
        "Repas du midi avant séance longue ou en récupération.",
    },
    {
      name: "Bananes",
      grade: "A",
      details:
        "Snack classique des sports d’endurance pour recharger rapidement et maintenir les électrolytes.",
      timing:
        "Avant ou pendant l’effort (course, vélo, entraînement long).",
    },
    {
      name: "Poulet",
      grade: "A",
      details:
        "Protéine maigre qui aide à maintenir la masse musculaire malgré de gros volumes cardio.",
      timing:
        "Repas post-séance ou entre deux journées d’endurance.",
    },
    {
      name: "Noix",
      grade: "B",
      details:
        "Apport en graisses de qualité qui permettent de soutenir l’énergie de fond.",
      timing:
        "Collations dans la journée, hors immédiat autour de séance si digestion sensible.",
    },
    {
      name: "Lentilles",
      grade: "B",
      details:
        "Fer + glucides + protéines pour soutenir le système sanguin et l’endurance.",
      timing: "Repas loin des séances intenses (digestion plus longue).",
    },
    {
      name: "Oranges",
      grade: "B",
      details:
        "Vitamine C et hydratation, utiles pour limiter le stress oxydatif lié au volume.",
      timing: "Collation ou dessert sur les jours de grosses charges.",
    },
    {
      name: "Pommes de terre",
      grade: "B",
      details:
        "Réservoir de glycogène très efficace, notamment en version vapeur / bouillie.",
      timing:
        "Repas de veille de séance longue ou de compétition.",
    },
    {
      name: "Saumon",
      grade: "A",
      details:
        "Oméga-3 et protéines = soutien cardiovasculaire + protection des fibres musculaires.",
      timing:
        "Repas du soir après une grosse journée d’endurance.",
    },
  ],

  focus: [
    {
      name: "Café",
      grade: "A",
      details:
        "Augmente la vigilance, la vitesse de réaction et la concentration sur les tâches techniques.",
      timing:
        "30–45 minutes avant séance technique, muscu précise ou compétition.",
    },
    {
      name: "Thé vert",
      grade: "A",
      details:
        "Association caféine + L-théanine : boost de focus sans trop de nervosité.",
      timing:
        "Dans la matinée ou début d’après-midi avant un entraînement tactique / technique.",
    },
    {
      name: "Chocolat noir 70%+",
      grade: "A",
      details:
        "Flavonoïdes qui améliorent la perf cognitive et la vascularisation cérébrale.",
      timing:
        "Petite portion avant séance nécessitant beaucoup de concentration.",
    },
    {
      name: "Œufs",
      grade: "A",
      details:
        "Riche en choline, précurseur de l’acétylcholine, neurotransmetteur clé pour la coordination.",
      timing: "Petit-déjeuner des jours de séances techniques.",
    },
    {
      name: "Saumon",
      grade: "A",
      details:
        "Les oméga-3 (DHA) soutiennent les membranes neuronales et la vitesse de transmission.",
      timing:
        "Repas réguliers dans la semaine, surtout en période de grosse charge mentale.",
    },
    {
      name: "Noix",
      grade: "A",
      details:
        "Souvent associées aux fonctions cognitives (mémoire, concentration) via leurs graisses et antioxydants.",
      timing: "Collation au cours de la journée.",
    },
    {
      name: "Myrtilles",
      grade: "B",
      details:
        "Améliorent certaines fonctions cognitives dans plusieurs études. Intéressant en pré-séance cognitive.",
      timing: "Smoothie ou collation avant séance.",
    },
    {
      name: "Orange",
      grade: "B",
      details:
        "Vitamine C + flavonoïdes → meilleure irrigation cérébrale.",
      timing: "Collation 1–2h avant séance.",
    },
    {
      name: "Avocat",
      grade: "B",
      details:
        "Bons lipides pour le cerveau et la myéline des nerfs.",
      timing:
        "Repas classiques de la journée, hors pré-séance immédiat.",
    },
    {
      name: "Ginseng",
      grade: "C",
      details:
        "Plante adaptogène avec des résultats prometteurs sur la vigilance et la réactivité, mais données encore hétérogènes.",
      timing: "Matin ou début d’après-midi, en cure courte, pas le soir.",
    },
  ],

  sommeil: [
    {
      name: "Kiwi",
      grade: "A",
      details:
        "Les études montrent une amélioration de la qualité du sommeil et de l’endormissement.",
      timing: "1–2 kiwis 1 heure avant le coucher.",
    },
    {
      name: "Amandes",
      grade: "A",
      details:
        "Magnésium + bons lipides, favorisent la relaxation musculaire et nerveuse.",
      timing: "Petite poignée en collation du soir.",
    },
    {
      name: "Lait chaud",
      grade: "A",
      details:
        "Apporte tryptophane et glucides légers, favorise la production de mélatonine.",
      timing: "Avant le coucher, surtout après séance tardive.",
    },
    {
      name: "Banane",
      grade: "A",
      details:
        "Source de tryptophane, magnésium et potassium pour la détente globale.",
      timing: "Collation du soir ou dessert post-dîner.",
    },
    {
      name: "Riz blanc",
      grade: "A",
      details:
        "Un repas avec riz blanc quelques heures avant le coucher améliore l’endormissement dans certaines études.",
      timing: "Dîner 3–4h avant le coucher.",
    },
    {
      name: "Miel",
      grade: "A",
      details:
        "Légère réaction insulinique qui facilite l’entrée du tryptophane dans le cerveau.",
      timing: "Une cuillère dans une tisane ou sur un yaourt le soir.",
    },
    {
      name: "Saumon",
      grade: "B",
      details:
        "Vitamine D et oméga-3, impliqués dans la régulation des rythmes circadiens.",
      timing: "Repas du soir, quelques fois par semaine.",
    },
    {
      name: "Camomille",
      grade: "B",
      details:
        "Plante utilisée pour faciliter la détente et le sommeil, avec plusieurs études positives.",
      timing: "Infusion 30–60 minutes avant le coucher.",
    },
    {
      name: "Épinards",
      grade: "B",
      details:
        "Riches en magnésium, utile pour limiter les tensions nerveuses.",
      timing: "Repas du soir ou du midi, en accompagnement.",
    },
    {
      name: "Cerises griottes",
      grade: "C",
      details:
        "Contiennent de la mélatonine naturelle, données encourageantes mais encore limitées.",
      timing:
        "Petit dessert du soir en saison ou en jus spécifique.",
    },
  ],

  digestion: [
    {
      name: "Yaourt grec / kéfir",
      grade: "A",
      details:
        "Apporte des probiotiques qui améliorent l’équilibre du microbiote, donc la digestion et l’absorption des nutriments.",
      timing: "Petit-déjeuner ou collation, quotidiennement.",
    },
    {
      name: "Banane",
      grade: "A",
      details:
        "Source de prébiotiques naturels et très bien tolérée, même après séances intenses.",
      timing: "Avant ou après séance si l’estomac le supporte bien.",
    },
    {
      name: "Avoine",
      grade: "A",
      details:
        "Fibres solubles (bêta-glucanes) qui régulent la digestion et stabilisent la glycémie.",
      timing:
        "Petit-déjeuner ou snack, surtout les jours d’entraînement long.",
    },
    {
      name: "Lentilles",
      grade: "A",
      details:
        "Fibres + protéines, efficaces pour la santé digestive à condition d’être bien tolérées.",
      timing:
        "Repas hors proches séances explosives (risque de ballonnements).",
    },
    {
      name: "Chou fermenté (choucroute, kimchi)",
      grade: "B",
      details:
        "Riche en lactobacilles, apporte des bactéries bénéfiques pour le microbiote.",
      timing: "Petites portions en accompagnement de repas.",
    },
    {
      name: "Ail",
      grade: "B",
      details:
        "Prébiotique, nourrit certaines bonnes bactéries intestinales.",
      timing: "Dans les plats, si bien toléré.",
    },
    {
      name: "Pomme",
      grade: "B",
      details:
        "Pectine, fibre soluble qui aide à réguler le transit.",
      timing: "Collation dans la journée.",
    },
    {
      name: "Gingembre",
      grade: "B",
      details:
        "Réduit les nausées et améliore le confort digestif chez beaucoup de sportifs.",
      timing: "Infusions, plats, avant trajets ou séances longues.",
    },
    {
      name: "Concombre",
      grade: "C",
      details:
        "Riche en eau, très léger, soulage souvent la sensation de lourdeur.",
      timing: "Salades ou accompagnements, surtout par temps chaud.",
    },
    {
      name: "Riz blanc",
      grade: "A",
      details:
        "Très digeste, base idéale pour un repas léger avant séance technique.",
      timing: "Repas pré-séance quand tu veux être léger.",
    },
  ],

  hydratation: [
    {
      name: "Eau + pincée de sel",
      grade: "A",
      details:
        "Le sodium est essentiel pour retenir l’eau dans le compartiment sanguin et éviter les chutes de performance.",
      timing:
        "Avant et pendant les séances longues ou sous forte chaleur.",
    },
    {
      name: "Banane",
      grade: "A",
      details:
        "Apporte du potassium, indispensable pour l’équilibre hydrique et la prévention des crampes.",
      timing:
        "Avant ou après l’entraînement, voire pendant une séance longue.",
    },
    {
      name: "Eau de coco",
      grade: "A",
      details:
        "Naturellement riche en électrolytes (potassium, sodium, magnésium).",
      timing: "Pendant ou après séance, selon la tolérance digestive.",
    },
    {
      name: "Pastèque",
      grade: "A",
      details:
        "Très riche en eau et en citrulline, aide à la réhydratation après l’effort.",
      timing: "Collation post-séance ou snack par temps chaud.",
    },
    {
      name: "Orange",
      grade: "A",
      details:
        "Eau + électrolytes + vitamine C, utile pour recharger rapidement.",
      timing: "Collation pré ou post-séance.",
    },
    {
      name: "Pommes de terre",
      grade: "A",
      details:
        "Beaucoup de potassium, intéressant pour reconstituer les réserves après gros efforts.",
      timing: "Repas après séance ou le soir.",
    },
    {
      name: "Bouillon salé",
      grade: "A",
      details:
        "Concentre sodium et minéraux, utilisé chez les sportifs pour réhydrater après grosses pertes sudorales.",
      timing: "Après entraînement très transpirant ou match.",
    },
    {
      name: "Épinards",
      grade: "B",
      details:
        "Contiennent magnésium et potassium, utiles pour l’équilibre hydrique.",
      timing: "Repas classiques de la semaine.",
    },
    {
      name: "Yaourt",
      grade: "B",
      details:
        "Apporte eau, sodium, potassium et calcium dans un aliment bien toléré.",
      timing: "Collation de récupération ou petit-déjeuner.",
    },
    {
      name: "Tomate",
      grade: "B",
      details:
        "Riche en eau et en potassium, à intégrer facilement dans des salades ou plats froids.",
      timing: "Repas légers avant ou après entraînement.",
    },
  ],

  tendons: [
    {
      name: "Sardines avec arêtes",
      grade: "A",
      details:
        "Très riches en calcium et en vitamine D, fondamentales pour solidifier l’os.",
      timing: "Repas réguliers (1–2 fois / semaine), midi ou soir.",
    },
    {
      name: "Collagène / gélatine",
      grade: "A",
      details:
        "Études cliniques : prise de collagène + vitamine C avant la séance stimule la synthèse de collagène des tendons et ligaments.",
      timing:
        "30–60 minutes avant travail pliométrique, sauts ou muscu lourde sur les tendons.",
    },
    {
      name: "Œufs",
      grade: "A",
      details:
        "Apportent du soufre et des acides aminés utilisés dans les tissus conjonctifs.",
      timing:
        "Petit-déjeuner ou repas après séances sollicitant fortement les tendons.",
    },
    {
      name: "Saumon",
      grade: "A",
      details:
        "Oméga-3 anti-inflammatoires qui aident à calmer les tendinites et micro-inflammations.",
      timing:
        "Repas du soir sur périodes de douleur ou de gros volumes.",
    },
    {
      name: "Yaourt grec",
      grade: "A",
      details:
        "Source importante de calcium et de protéines pour la réparation des tissus.",
      timing: "Collation post-séance ou dessert.",
    },
    {
      name: "Amandes",
      grade: "A",
      details:
        "Magnésium + bons lipides, utiles pour la qualité des os et tendons.",
      timing: "Collation quotidienne.",
    },
    {
      name: "Kiwi",
      grade: "B",
      details:
        "Très riche en vitamine C, cofacteur indispensable à la synthèse de collagène.",
      timing:
        "En collation, autour des prises de collagène ou après séance.",
    },
    {
      name: "Épinards",
      grade: "B",
      details:
        "Minéraux et vitamine K qui participent à la santé osseuse.",
      timing: "Légume régulier des repas du midi / soir.",
    },
    {
      name: "Oranges",
      grade: "B",
      details:
        "Vitamine C pour soutenir la fabrication des fibres de collagène.",
      timing: "Collation ou dessert post-repas.",
    },
    {
      name: "Bouillon d’os",
      grade: "C",
      details:
        "Riche en collagène et minéraux, intéressant mais études encore limitées.",
      timing:
        "Repas du soir sur périodes de gros travail mécanique.",
    },
  ],
};

// ============================================================================
// ================================ BOOST TAB =================================
// ============================================================================
function BoostTab({ navigation }) {
  return (
    <>
      <Text style={styles.section}>Boost Nutrition</Text>
      <Glass style={styles.boostIntroCard}>
        <Image source={IMG_BOOST} style={styles.boostImg} />
        <Text style={styles.boostTitle}>
          Développe ton potentiel avec une nutrition 100 % pensée pour la
          performance.
        </Text>
        <Text style={styles.boostDesc}>
          Chaque catégorie est basée sur des données scientifiques pour
          améliorer une capacité précise : hormones, récupération, énergie,
          sommeil, concentration…
        </Text>
        <TouchableOpacity
          onPress={() => {
            softVibrate();
            navigation.navigate("BoostMain");
          }}
          style={styles.boostButton}
        >
          <Text style={styles.boostButtonText}>Explorer Boost Nutrition</Text>
          <Ionicons name="arrow-forward" size={20} color="#031948" />
        </TouchableOpacity>
      </Glass>
    </>
  );
}

// ============================================================================
// ========================== BOOST MAIN SCREEN ===============================
// ============================================================================

function BoostMain({ navigation }) {
  const [step, setStep] = useState("card"); // "card" puis "categories"

  const handleBack = () => {
    if (step === "categories") {
      setStep("card");
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 120 }}>
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginTop: 55, marginBottom: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={styles.title}>Boost Nutrition</Text>

        {step === "card" ? (
          <>
            <Glass style={styles.boostIntroCard}>
              <Image source={IMG_BOOST} style={styles.boostImg} />
              <Text style={styles.boostTitle}>
                Développe ton potentiel avec une nutrition 100 % pensée pour la
                performance.
              </Text>
              <Text style={styles.boostDesc}>
                Chaque catégorie est basée sur des données scientifiques pour
                améliorer une capacité précise : hormones, récupération, énergie,
                sommeil, concentration…
              </Text>
              <TouchableOpacity
                onPress={() => {
                  softVibrate();
                  setStep("categories");
                }}
                style={styles.boostButton}
              >
                <Text style={styles.boostButtonText}>
                  Voir les 10 catégories
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#031948" />
              </TouchableOpacity>
            </Glass>
          </>
        ) : (
          <>
            <Text style={styles.boostIntroText}>
              Choisis une capacité à améliorer. Chaque catégorie regroupe les 10
              meilleurs aliments, classés par niveau de preuve scientifique.
            </Text>

            <Text style={styles.boostLegend}>
              Les aliments sont notés avec un grade scientifique : A, B ou C.
            </Text>

            <View style={styles.boostGrid}>
              {BOOST_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.boostCard}
                  onPress={() => {
                    softVibrate();
                    navigation.navigate("BoostCategory", { categoryId: cat.id });
                  }}
                >
                  <Text style={styles.boostEmoji}>{cat.emoji}</Text>
                  <Text style={styles.boostCardTitle}>{cat.title}</Text>
                  <Text style={styles.boostCardSubtitle}>{cat.subtitle}</Text>
                  <View style={styles.boostArrowBadge}>
                    <Ionicons name="arrow-up-outline" size={18} color="#031948" />
                    <Text style={styles.boostArrowText}>Boost</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ============================================================================
// ======================== BOOST CATEGORY DETAIL =============================
// ============================================================================
function BoostCategory({ route, navigation }) {
  const { categoryId } = route.params;
  const category = BOOST_CATEGORIES.find((c) => c.id === categoryId);
  const foods = BOOST_FOODS[categoryId] || [];

  const [expandedIndex, setExpandedIndex] = useState(null);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [gradeInfo, setGradeInfo] = useState({
    grade: "",
    title: "",
    text: "",
  });

  const openGradeInfo = (grade) => {
    softVibrate();
    let title = "";
    let text = "";

    if (grade === "A") {
      title = "Grade A — Efficacité prouvée";
      text =
        "Les études sur humains, souvent en contexte sportif, montrent des effets clairs et mesurables sur la performance ou la récupération.";
    } else if (grade === "B") {
      title = "Grade B — Bon niveau de preuve";
      text =
        "Plusieurs études indiquent un effet positif, mais les résultats peuvent varier selon le profil ou le protocole.";
    } else {
      title = "Grade C — Potentiel intéressant";
      text =
        "Les données sont prometteuses mais encore limitées ou hétérogènes. À intégrer pour varier sans en faire la base.";
    }

    setGradeInfo({ grade, title, text });
    setGradeModalVisible(true);
  };

  const toggleExpand = (index) => {
    softVibrate();
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <LinearGradient {...GRAD} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 180 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 55, marginBottom: 20 }}
        >
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>

        <Text style={styles.boostCategoryTitle}>{category?.title}</Text>
        <Text style={styles.boostCategorySubtitle}>{category?.subtitle}</Text>

        {/* Bandeau explicatif des grades */}
        <Glass style={{ marginTop: 16, marginBottom: 10 }}>
          <Text style={styles.gradeLegendTitle}>
            Comprendre les grades scientifiques
          </Text>
          <View style={styles.gradeRow}>
            {["A", "B", "C"].map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.gradePill}
                onPress={() => openGradeInfo(g)}
              >
                <Text style={styles.gradePillText}>Grade {g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.gradeLegendText}>
            Appuie sur un grade pour voir ce qu’il signifie et comment
            l’interpréter dans ta nutrition de sportif.
          </Text>
        </Glass>

        {/* Liste des aliments */}
        {foods.map((food, index) => {
          const isOpen = expandedIndex === index;
          return (
            <Glass key={food.name} style={styles.foodCard}>
              <View style={styles.foodHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{food.name}</Text>

                  <TouchableOpacity
                    onPress={() => openGradeInfo(food.grade)}
                    style={styles.foodGradeBadge}
                  >
                    <Text style={styles.foodGradeText}>
                      Grade {food.grade} • cliquer pour l’explication
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => toggleExpand(index)}>
                  <Ionicons
                    name={
                      isOpen ? "chevron-up-outline" : "chevron-down-outline"
                    }
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {isOpen && (
                <View style={styles.foodDetails}>
                  <Text style={styles.foodDetailsText}>{food.details}</Text>

                  {food.timing && (
                    <View style={styles.foodTimingBox}>
                      <Text style={styles.foodTimingTitle}>
                        Quand l’utiliser ?
                      </Text>
                      <Text style={styles.foodTimingText}>{food.timing}</Text>
                    </View>
                  )}
                </View>
              )}
            </Glass>
          );
        })}
      </ScrollView>

      {/* MODAL GRADES */}
      <Modal
        transparent
        visible={gradeModalVisible}
        animationType="fade"
        onRequestClose={() => setGradeModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setGradeModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{gradeInfo.title}</Text>
            <Text style={styles.modalText}>{gradeInfo.text}</Text>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setGradeModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>J’ai compris</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

// ============================================================================
// ================================ FILTER TAB ================================
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
// ================================ SEARCH TAB ================================
// ============================================================================
function SearchTab({ navigation }) {
  const [search, setSearch] = useState("");

  // Suggestions simples (sans images comme tu le veux)
  const results = [
    { label: "Porridge protéiné" },
    { label: "Poulet riz" },
    { label: "Salade grecque" },
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
          <Glass key={i} style={{ marginBottom: 16 }}>
            <Text style={styles.recipeItem}>{r.label}</Text>
          </Glass>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

// ============================================================================
// ================================== STYLES ==================================
// ============================================================================
const CARD_HEIGHT = 330;

const styles = StyleSheet.create({
  glassBase: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 20,
    flex: 1,
    textAlign: "center",
  },

  section: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 20,
  },

  detailSubtitle: {
    color: "#3FCEF9",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  recipeItem: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
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

  // =============== STYLES BOOST NUTRITION ===============
  boostIntroCard: {
    marginTop: 10,
    borderRadius: 24,
    overflow: "hidden",
  },

  boostImg: {
    width: "100%",
    height: 140,
    borderRadius: 18,
    marginBottom: 12,
  },

  boostTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  boostDesc: {
    color: "white",
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },

  boostButton: {
    marginTop: 4,
    backgroundColor: "#00E0FF",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },

  boostButtonText: {
    color: "#031948",
    fontWeight: "800",
    fontSize: 14,
    marginRight: 6,
  },

  boostIntroText: {
    color: "white",
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },

  boostLegend: {
    color: "#3FCEF9",
    fontSize: 13,
    marginBottom: 14,
    fontWeight: "600",
  },

  boostGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6,
  },

  boostCard: {
    width: (W - 22 * 2 - 12) / 2,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  boostEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },

  boostCardTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4,
  },

  boostCardSubtitle: {
    color: "white",
    opacity: 0.85,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },

  boostArrowBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00E0FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },

  boostArrowText: {
    color: "#031948",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 4,
  },

  boostCategoryTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
  },

  boostCategorySubtitle: {
    color: "white",
    opacity: 0.9,
    fontSize: 14,
    marginBottom: 10,
  },

  gradeLegendTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 8,
  },

  gradeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  gradePill: {
    backgroundColor: "rgba(0,224,255,0.16)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#00E0FF",
  },

  gradePillText: {
    color: "#00E0FF",
    fontWeight: "700",
    fontSize: 12,
  },

  gradeLegendText: {
    color: "white",
    opacity: 0.9,
    fontSize: 12,
    lineHeight: 16,
  },

  foodCard: {
    marginTop: 12,
  },

  foodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  foodName: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  foodGradeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,224,255,0.18)",
  },

  foodGradeText: {
    color: "#3FCEF9",
    fontSize: 11,
    fontWeight: "700",
  },

  foodDetails: {
    marginTop: 10,
  },

  foodDetailsText: {
    color: "white",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },

  foodTimingBox: {
    marginTop: 4,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(3,25,72,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.35)",
  },

  foodTimingTitle: {
    color: "#3FCEF9",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 4,
  },

  foodTimingText: {
    color: "white",
    fontSize: 12,
    lineHeight: 16,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalContent: {
    width: "100%",
    borderRadius: 22,
    padding: 18,
    backgroundColor: "rgba(3,25,72,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,224,255,0.5)",
  },

  modalTitle: {
    color: "#3FCEF9",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 10,
  },

  modalText: {
    color: "white",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },

  modalCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: "#00E0FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  modalCloseText: {
    color: "#031948",
    fontWeight: "800",
    fontSize: 12,
  },
});

// ============================================================================
// ================================ EXPORTS ===================================
// ============================================================================
export {
  BoostTab,
  BoostMain,
  BoostCategory,
  FilterTab,
  SearchTab,
  BOOST_CATEGORIES,
  BOOST_FOODS,
};

