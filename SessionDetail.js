import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { supabase } from "./src/lib/supabase";
import { styles, FULL_DAY_LABELS, buildIntervals, getDayKey } from "./backend";

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session?.access_token || null;
}

function ScreenHeader({ title, onBack }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.screenHeader}>
      <Pressable onPress={onBack} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.backButton, { transform: [{ scale }] }]}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Animated.View>
      </Pressable>
      <Text style={styles.screenTitle}>{title}</Text>
    </View>
  );
}

function PressableScale({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function SessionDetailScreen({ session, onBack, userId, onSaved }) {
  const [difficulty, setDifficulty] = useState("ok");
  const [feedback, setFeedback] = useState("");
  const derivedIntervals = useMemo(() => buildIntervals(session), [session]);
  const [splits, setSplits] = useState(() => Array.from({ length: derivedIntervals?.reps || 0 }, () => ""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showRecalc, setShowRecalc] = useState(false);
  const recalcProgress = useRef(new Animated.Value(0)).current;

  const plan = session?.plan || {};
  const isRestPlan = Boolean(plan?.isRest);
  const planBlocks = Array.isArray(plan?.blocks) ? plan.blocks : [];

  const showSplits = (derivedIntervals?.reps || 0) > 0;

  useEffect(() => {
    console.log("🔍 [SessionDetailScreen] Session loaded:");
    console.log("   Title:", session?.title);
    console.log("   Date:", session?.dateKey || session?.date);
    console.log("   Plan keys:", Object.keys(plan || {}));
    console.log("   Full plan:", JSON.stringify(plan, null, 2));
  }, [session, plan]);

  useEffect(() => {
    setSplits(Array.from({ length: derivedIntervals?.reps || 0 }, () => ""));
  }, [derivedIntervals]);

  const persistFeedback = useCallback(async () => {
    if (!userId) {
      Alert.alert("Connexion requise", "Connecte-toi pour enregistrer le feedback.");
      return false;
    }

    const payload = {
      user_id: userId,
      workout_id: session?.workoutId || session?.workout_id || null,
      workout_date: session?.dateKey || session?.date || null,
      title: session?.title || "Séance",
      difficulty,
      comment: feedback,
      splits: showSplits ? splits : [],
      intervals: derivedIntervals || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("workouts_feedback").insert([payload]);
    if (error) {
      Alert.alert("Erreur", error.message || "Impossible d'enregistrer le feedback.");
      return false;
    }
    return true;
  }, [difficulty, feedback, derivedIntervals, session, showSplits, splits, userId]);

  const handleValidate = useCallback(async () => {
    if (isSubmitting) return;

    Vibration.vibrate(3500);

    setIsSubmitting(true);
    try {
      const ok = await persistFeedback();
      if (ok) {
        setShowRecalc(true);
        onSaved?.();
      }
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Erreur inconnue.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, persistFeedback, onSaved]);

  const handleRecalculate = useCallback(async () => {
    if (!userId) return;

    setIsRecalculating(true);
    recalcProgress.setValue(0);

    Animated.timing(recalcProgress, {
      toValue: 1,
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert("Connexion requise", "Connecte-toi pour ajuster le plan.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("recalculate_plan", {
        body: {
          userId,
          basedOn: {
            date: session?.dateKey || session?.date || null,
            difficulty,
            hasSplits: showSplits,
            splits: showSplits ? splits : [],
            intervals: derivedIntervals || null,
          },
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        Alert.alert("Erreur", error.message || "Recalcul impossible.");
        return;
      }

      if (!data) {
        Alert.alert("Erreur", "Réponse vide du serveur.");
        return;
      }

      onSaved?.();
    } catch (_e) {
      Alert.alert("Erreur", "Recalcul impossible.");
    } finally {
      setTimeout(() => setIsRecalculating(false), 600);
    }
  }, [derivedIntervals, difficulty, onSaved, recalcProgress, session, showSplits, splits, userId]);

  const monthLong = useMemo(
    () => ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
    []
  );

  const parseMinutes = useCallback((durationText) => {
    const match = String(durationText || "").match(/(\d+)\s*min/i);
    if (match) return `${match[1]} min`;
    if (plan?.warmup?.duration) return plan.warmup.duration;
    return "—";
  }, [plan]);

  const getIntensityLabel = useCallback(() => {
    const all = [session?.focus || [], plan?.title || "", plan?.coachAdvice || ""].flat().join(" ").toLowerCase();
    if (all.includes("dur") || all.includes("lactate") || all.includes("intense")) return "Dur";
    if (all.includes("récup") || all.includes("recup") || all.includes("facile")) return "Facile";
    if (all.includes("tempo") || all.includes("contrôlé") || all.includes("controle")) return "Modéré";
    return "—";
  }, [plan, session]);

  const getTypeLabel = useCallback(() => {
    if (isRestPlan) return "Repos";
    const all = [session?.focus || [], plan?.title || ""].flat().join(" ").toLowerCase();
    if (all.includes("vitesse") || all.includes("sprint")) return "Sprint 400m";
    if (session?.type && session.type !== "À définir") return session.type;
    return "Entraînement";
  }, [isRestPlan, plan, session]);

  const headerDate = useMemo(() => {
    const iso = session?.dateKey || session?.date;
    if (!iso) return `${session?.dayLabel || "Jour"} ${session?.dateLabel || ""}`.trim();
    const d = new Date(iso);
    const dayName = session?.dayLabel || FULL_DAY_LABELS[getDayKey(d)] || "Jour";
    return `${dayName} ${d.getDate()} ${monthLong[d.getMonth()]}`;
  }, [monthLong, session]);

  const statusLabel = useMemo(() => {
    const s = String(session?.status || "").toLowerCase();
    return s.includes("termin") ? "Terminée" : "Prévue";
  }, [session]);

  const mainTitle = useMemo(() => {
    if (derivedIntervals?.reps && derivedIntervals?.label) {
      return `${derivedIntervals.reps} x ${derivedIntervals.label}`;
    }
    return "—";
  }, [derivedIntervals]);

  const objectiveText = session?.description || plan?.explanation || "";

  return (
    <SafeAreaView style={styles.sessionDetailSafeArea}>
      <ScrollView
        style={styles.sessionDetailContainer}
        contentContainerStyle={styles.sessionDetailContent}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.sessionDetailHeader}>
          <PressableScale style={styles.sessionDetailBack} onPress={onBack}>
            <Text style={styles.sessionDetailBackText}>‹</Text>
          </PressableScale>

          <View style={styles.sessionDetailHeaderMid}>
            <Text style={styles.sessionDetailHeaderDate} numberOfLines={1}>
              {headerDate}
            </Text>
          </View>

          <View style={styles.sessionDetailStatusPill}>
            <Text style={styles.sessionDetailStatusText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.sessionDetailTitle}>{session?.title || plan?.title || "Séance"}</Text>

        <View style={styles.sessionDetailChipsRow}>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{parseMinutes(session?.duration)}</Text>
          </View>
          <View style={[styles.detailChip, styles.detailChipWarm]}>
            <Text style={[styles.detailChipText, styles.detailChipTextWarm]}>{getIntensityLabel()}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{getTypeLabel()}</Text>
          </View>
        </View>

        {objectiveText ? (
          <>
            <Text style={styles.detailSectionLabel}>OBJECTIF</Text>
            <View style={styles.detailCard}>
              <Text style={styles.detailPlaceholder}>{objectiveText}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.detailSectionLabel}>STRUCTURE</Text>
        <View style={styles.detailCard}>
          {isRestPlan ? (
            <View style={styles.structureItem}>
              <View style={[styles.structureLeftBar, styles.structureLeftBarCool]} />
              <View style={styles.structureItemBody}>
                <View style={styles.structureItemHeader}>
                  <Text style={styles.structureItemTitle}>{plan?.title || "Repos"}</Text>
                </View>
                <Text style={styles.structureItemSub}>
                  {plan?.explanation || "Journée de repos. Profite-en pour bien récupérer."}
                </Text>
              </View>
            </View>
          ) : (
            <>
              {plan?.warmup ? (
                <>
                  <View style={styles.structureItem}>
                    <View style={[styles.structureLeftBar, styles.structureLeftBarCool]} />
                    <View style={styles.structureItemBody}>
                      <View style={styles.structureItemHeader}>
                        <Text style={styles.structureItemTitle}>Échauffement</Text>
                        <Text style={styles.structureItemDuration}>{plan?.warmup?.duration || "—"}</Text>
                      </View>
                      <Text style={styles.structureItemSub}>{plan?.warmup?.content || "—"}</Text>
                    </View>
                  </View>
                  <View style={styles.structureDivider} />
                </>
              ) : null}

              {planBlocks.length > 0 ? (
                planBlocks.map((block, blockIndex) => (
                  <View key={`block-${blockIndex}`}>
                    <View style={styles.structureItem}>
                      <View style={[styles.structureLeftBar, styles.structureLeftBarWarm]} />
                      <View style={styles.structureItemBody}>
                        <View style={styles.structureItemHeader}>
                          <Text style={styles.structureItemTitle}>{block?.name || `Bloc ${blockIndex + 1}`}</Text>
                        </View>

                        {Array.isArray(block?.sets) && block.sets.length > 0 ? (
                          block.sets.map((set, setIndex) => (
                            <Text key={`set-${blockIndex}-${setIndex}`} style={styles.structureItemSub}>
                              {`${set?.reps || "—"} x ${set?.distance || "—"} — ${set?.target_time || "—"} — récup ${set?.recovery || "—"} — ${set?.goal || "—"}`}
                            </Text>
                          ))
                        ) : (
                          <Text style={styles.structureItemSub}>Sets non définis</Text>
                        )}
                      </View>
                    </View>
                    {blockIndex < planBlocks.length - 1 ? <View style={styles.structureDivider} /> : null}
                  </View>
                ))
              ) : (
                <Text style={styles.detailPlaceholder}>Structure non définie</Text>
              )}

              {session?.intervals && Array.isArray(session.intervals) && session.intervals.length > 0 ? (
                <>
                  <View style={styles.structureDivider} />
                  <View style={styles.structureItem}>
                    <View style={[styles.structureLeftBar, styles.structureLeftBarWarm]} />
                    <View style={styles.structureItemBody}>
                      <View style={styles.structureItemHeader}>
                        <Text style={styles.structureItemTitle}>Intervalles (bonus)</Text>
                      </View>
                      {session.intervals.map((interval, idx) => (
                        <Text key={idx} style={styles.structureItemSub}>
                          {typeof interval === "string"
                            ? interval
                            : `${interval.reps || ""} x ${interval.distance || ""} - ${interval.pace || ""} (récup: ${interval.recovery || ""})`}
                        </Text>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>

        {(plan?.coachAdvice || plan?.explanation) && (
          <>
            <Text style={styles.detailSectionLabel}>CONSEIL DU COACH</Text>
            <View style={styles.detailCard}>
              <View style={styles.coachCardTitleRow}>
                <View style={styles.coachCardIcon}>
                  <Text style={styles.coachCardIconText}>✦</Text>
                </View>
                <Text style={styles.coachCardTitle}>CONSEIL DU COACH</Text>
              </View>
              <Text style={styles.detailPlaceholder}>{plan?.coachAdvice || "—"}</Text>
              {plan?.explanation ? <Text style={styles.structureItemSub}>{plan.explanation}</Text> : null}
            </View>
          </>
        )}

        <Text style={styles.detailSectionLabel}>FEEDBACK</Text>

        {showRecalc ? (
          <View style={styles.feedbackSavedBanner}>
            <View style={styles.feedbackSavedIcon}>
              <Text style={styles.feedbackSavedIconText}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackSavedTitle}>Feedback enregistré</Text>
              <Text style={styles.feedbackSavedSubtitle}>Ton retour aide à adapter tes prochaines séances</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.detailCard}>
          <Text style={styles.feedbackPrompt}>Comment tu t'es senti aujourd'hui ?</Text>

          <TextInput
            style={styles.feedbackInputDark}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="—"
            placeholderTextColor="rgba(226,232,240,0.55)"
            multiline
            autoCorrect={false}
            autoCapitalize="sentences"
            blurOnSubmit={false}
          />

          <Text style={styles.detailSectionLabelInline}>Difficulté</Text>
          <View style={styles.difficultyRowDark}>
            {[
              { key: "easy", label: "Trop facile" },
              { key: "ok", label: "Correct" },
              { key: "hard", label: "Trop dur" },
            ].map((item) => (
              <PressableScale
                key={item.key}
                style={difficulty === item.key ? styles.difficultyChipActiveDark : styles.difficultyChipDark}
                onPress={() => setDifficulty(item.key)}
              >
                <Text style={difficulty === item.key ? styles.difficultyChipTextActiveDark : styles.difficultyChipTextDark}>
                  {item.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          {showSplits ? (
            <View style={styles.splitBlock}>
              <Text style={styles.detailSectionLabelInline}>{`Temps ${derivedIntervals.reps}x${derivedIntervals.label}`}</Text>
              <View style={styles.splitGrid}>
                {splits.map((value, index) => (
                  <View key={`split-${index}`} style={styles.splitInputWrapper}>
                    <Text style={styles.splitLabelDark}>{index + 1}</Text>
                    <TextInput
                      style={styles.splitInputDark}
                      value={value}
                      onChangeText={(text) => setSplits((prev) => prev.map((item, idx) => (idx === index ? text : item)))}
                      placeholder="—"
                      placeholderTextColor="rgba(226,232,240,0.55)"
                      keyboardType="numeric"
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="done"
                      blurOnSubmit={false}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <PressableScale style={styles.primaryButtonBlue} onPress={handleValidate}>
            <Text style={styles.primaryButtonBlueText}>{isSubmitting ? "Enregistrement..." : "Valider le feedback"}</Text>
          </PressableScale>

          {isSubmitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={[styles.loadingText, { color: "rgba(226,232,240,0.85)" }]}>Validation en cours...</Text>
            </View>
          ) : null}
        </View>

        {showRecalc ? (
          <View style={styles.recalcCard}>
            <Text style={styles.recalcTitle}>Ajuster le plan ?</Text>
            <Text style={styles.recalcSubtitle}>Le plan peut s'ajuster selon ton ressenti et tes performances.</Text>

            <PressableScale style={styles.primaryButton} onPress={handleRecalculate}>
              <Text style={styles.primaryButtonText}>{isRecalculating ? "Ajustement..." : "Oui, ajuster le plan"}</Text>
            </PressableScale>

            {isRecalculating ? (
              <>
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#0B0D12" />
                  <Text style={styles.loadingText}>Recalcul des prochaines semaines...</Text>
                </View>
                <View style={styles.recalcBar}>
                  <Animated.View
                    style={[
                      styles.recalcFill,
                      {
                        width: recalcProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["5%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export { ScreenHeader, PressableScale };
