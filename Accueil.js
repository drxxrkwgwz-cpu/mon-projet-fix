import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { styles, FULL_DAY_LABELS } from "./backend";
import { PressableScale } from "./SessionDetail";

/* ================= HEADER ================= */

function DashboardHeader({ title, subtitle, isLoggedIn, onLogout }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
        <Text style={styles.headerState}>
          {isLoggedIn ? "Connecté" : "Non connecté"}
        </Text>
      </View>
      {isLoggedIn ? (
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ================= PROFILE ================= */

function ProfileCard({ coachProfile, profileSummary, expanded, onToggle, onProfileChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftProfile, setDraftProfile] = useState(coachProfile || {});

  useEffect(() => {
    setDraftProfile(coachProfile || {});
  }, [coachProfile]);

  const updateField = useCallback(
    (path, value) => {
      setDraftProfile((prev) => {
        const next = { ...prev };
        if (path.startsWith("goal.")) {
          const goalKey = path.split(".")[1];
          next.goal = { ...(prev.goal || {}), [goalKey]: value };
        } else {
          next[path] = value;
        }
        if (onProfileChange) {
          onProfileChange(next);
        }
        return next;
      });
    },
    [onProfileChange]
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Profil</Text>
        <View style={styles.row}>
          <PressableScale
            onPress={() => setIsEditing((prev) => !prev)}
            style={styles.primaryButtonBlue}
          >
            <Text style={styles.primaryButtonBlueText}>
              {isEditing ? "Terminer" : "Modifier mon profil"}
            </Text>
          </PressableScale>
          <View style={styles.accentBadge}>
            <Text style={styles.accentBadgeText}>{profileSummary.levelLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.profileTopRow}>
        <View style={styles.profileIdentity}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                value={draftProfile.coachCallsYou || ""}
                onChangeText={(text) => updateField("coachCallsYou", text)}
                placeholder="Prénom"
              />
              <TextInput
                style={styles.input}
                value={draftProfile.appellation || ""}
                onChangeText={(text) => updateField("appellation", text)}
                placeholder="Profil sportif"
              />
            </>
          ) : (
            <>
              <Text style={styles.profileName}>
                {draftProfile.coachCallsYou || "Athlète"}
              </Text>
              <Text style={styles.profileSubtitle}>
                {draftProfile.appellation || "Profil sportif"}
              </Text>
            </>
          )}
        </View>
        <View style={styles.profileMetaCardLight}>
          <Text style={styles.profileMetaLabel}>Objectif</Text>
          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                value={draftProfile.goal?.title || ""}
                onChangeText={(text) => updateField("goal.title", text)}
                placeholder="Titre de l'objectif"
              />
              <TextInput
                style={styles.input}
                value={draftProfile.goal?.dateText || ""}
                onChangeText={(text) => updateField("goal.dateText", text)}
                placeholder="Date objectif"
              />
            </>
          ) : (
            <Text style={styles.profileMetaValue}>
              {draftProfile.goal?.title || "À définir"}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.profileQuickInfoRow}>
        <InfoPill label="Fréquence" value={profileSummary.frequencyLabel} />
        <InfoPill label="Durée" value={profileSummary.durationLabel} />
        <InfoPill label="Préférence" value={profileSummary.trainingLabel} />
      </View>

      {expanded ? (
        <View style={styles.expandedBlock}>
          <View style={styles.sectionDivider} />
          <InfoLine
            label="Disciplines"
            value={profileSummary.disciplines.join(" · ")}
          />
          <View style={styles.row}>
            <InfoLine label="Fatigue" value={profileSummary.fatigueLabel} />
            <InfoLine label="Niveau" value={profileSummary.levelLabel} />
          </View>
          <InfoLine
            label="Jours d'entraînement"
            value={profileSummary.trainingDays}
          />
          <InfoLine label="Matériel" value={profileSummary.equipmentList} />
          <InfoLine
            label="Contraintes santé"
            value={draftProfile.healthConstraints || "Aucune précisée"}
          />
          <InfoLine
            label="Autres préférences"
            value={draftProfile.otherPrefs || "Aucune précisée"}
          />

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeader}>PRs clés</Text>
          <View style={styles.chipRow}>
            {profileSummary.profilePRs.length === 0 ? (
              <Text style={styles.cardSubtitle}>
                Aucun record renseigné.
              </Text>
            ) : (
              profileSummary.profilePRs.map(([discipline, value]) => (
                <View key={discipline} style={styles.chipDark}>
                  <Text style={styles.chipDarkText}>
                    {`${discipline} · ${value}`}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      ) : null}

      <PressableScale onPress={onToggle} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>
          {expanded ? "Réduire le profil" : "Voir le profil complet"}
        </Text>
      </PressableScale>
    </View>
  );
}

/* ================= TRAINING SECTION ================= */

function WeekOverview({
  sessions,
  onOpenPlanning,
  onOpenCurrentWeek,
  onOpenSession,
  onGenerateWeek,
  isGeneratingWeek,
  isLoggedIn,
}) {
  const today = useMemo(() => new Date(), []);
  const monthShort = useMemo(
    () => [
      "janv.",
      "févr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "août",
      "sept.",
      "oct.",
      "nov.",
      "déc.",
    ],
    []
  );

  const parseMinutes = useCallback((durationText) => {
    const match = String(durationText || "").match(/(\d+)\s*min/i);
    return match ? Number(match[1]) : 0;
  }, []);

  const getIntensityLabel = useCallback((session) => {
    const all = (session?.focus || []).join(" ").toLowerCase();
    if (all.includes("dur")) return "Dur";
    if (all.includes("facile")) return "Facile";
    if (all.includes("modéré") || all.includes("modere")) return "Modéré";
    return "—";
  }, []);

  const getTypeLabel = useCallback((session) => {
    const all = (session?.focus || []).join(" ").toLowerCase();
    if (all.includes("running")) return "Running";
    if (all.includes("muscu") || all.includes("force")) return "Muscu";
    if (all.includes("vitesse")) return "Vitesse";
    if (session?.type && session.type !== "À définir") return session.type;
    return "—";
  }, []);

  const isRecoverySession = useCallback((session) => {
    const all = `${session?.title || ""} ${(session?.focus || []).join(
      " "
    )}`.toLowerCase();
    return (
      all.includes("récup") ||
      all.includes("recup") ||
      all.includes("récupération") ||
      all.includes("recuperation")
    );
  }, []);

  const isKeySession = useCallback((session) => {
    const all = `${session?.title || ""} ${(session?.focus || []).join(
      " "
    )}`.toLowerCase();
    return (
      all.includes("clé") ||
      all.includes("cle") ||
      all.includes("key") ||
      all.includes("spécifique") ||
      all.includes("specifique")
    );
  }, []);

  const formatTopDate = useCallback(
    (session) => {
      const iso = session?.dateKey || session?.date;
      if (!iso) return "—";
      const d = new Date(iso);
      const label =
        session?.isToday
          ? "Aujourd'hui"
          : FULL_DAY_LABELS[session?.dayKey] ||
            session?.dayLabel ||
            "—";
      const dayNum = d.getDate();
      const month = monthShort[d.getMonth()];
      return `${label} · ${dayNum} ${month}`;
    },
    [monthShort]
  );

  const trainingSessions = useMemo(
    () => (sessions || []).filter((s) => s?.hasSession && !s?.isRest),
    [sessions]
  );

  const stats = useMemo(() => {
    const seances = trainingSessions.length;
    const minutes = trainingSessions.reduce(
      (sum, s) => sum + parseMinutes(s.duration),
      0
    );
    return { seances, minutes };
  }, [parseMinutes, trainingSessions]);

  const nextSessions = useMemo(() => {
    const sorted = [...trainingSessions].sort((a, b) => {
      const aKey = a?.dateKey || a?.date || "";
      const bKey = b?.dateKey || b?.date || "";
      return aKey.localeCompare(bKey);
    });
    return sorted.slice(0, 3);
  }, [trainingSessions]);

  return (
    <View style={styles.trainingSection}>
      <Text style={styles.trainingSectionTitle}>Entraînement</Text>

      <View style={styles.trainingStatsRow}>
        <View style={styles.trainingStatItem}>
          <Text style={styles.trainingStatValue}>{stats.seances}</Text>
          <Text style={styles.trainingStatLabel}>séances</Text>
        </View>
        <View style={styles.trainingStatItem}>
          <Text style={styles.trainingStatValue}>{stats.minutes}</Text>
          <Text style={styles.trainingStatLabel}>minutes</Text>
        </View>
      </View>

      {nextSessions.map((session) => (
        <PressableScale
          key={session.id}
          style={styles.trainingSessionCard}
          onPress={() => onOpenSession(session)}
        >
          <Text style={styles.trainingSessionDate}>
            {formatTopDate(session)}
          </Text>
          <Text style={styles.trainingSessionTitle}>
            {session.title}
          </Text>
        </PressableScale>
      ))}

      <PressableScale
        style={styles.primaryButtonBlue}
        onPress={() => {
          if (!isLoggedIn) {
            Alert.alert(
              "Connexion requise",
              "Connecte-toi pour générer une semaine."
            );
            return;
          }
          onGenerateWeek();
        }}
      >
        <Text style={styles.primaryButtonBlueText}>
          {isGeneratingWeek ? "Génération..." : "Générer ma semaine"}
        </Text>
      </PressableScale>

      <PressableScale
        style={styles.primaryButton}
        onPress={onOpenPlanning}
      >
        <Text style={styles.primaryButtonText}>
          Voir le planning
        </Text>
      </PressableScale>

      <PressableScale
        style={styles.primaryButtonBlue}
        onPress={onOpenCurrentWeek}
      >
        <Text style={styles.primaryButtonBlueText}>
          Voir ma semaine actuelle
        </Text>
      </PressableScale>
    </View>
  );
}



/* ================= PROGRESSION BLOCK ================= */

function ProgressBlock({ onOpenProgress }) {
  return (
    <View style={styles.progressCard}>
      <View>
        <Text style={styles.progressTitle}>Progression</Text>
        <Text style={styles.progressSubtitle}>
          Visualise tes performances.
        </Text>
      </View>
      <PressableScale
        style={styles.progressButton}
        onPress={onOpenProgress}
      >
        <Text style={styles.progressButtonText}>
          Voir ma progression
        </Text>
      </PressableScale>
    </View>
  );
}

function PrimaryCTA({ label, onPress }) {
  return (
    <PressableScale style={styles.primaryButtonLarge} onPress={onPress}>
      <Text style={styles.primaryButtonLargeText}>{label}</Text>
    </PressableScale>
  );
}

/* ================= HELPERS ================= */

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

export {
  DashboardHeader,
  ProfileCard,
  WeekOverview,
  ProgressBlock,
  PrimaryCTA,
  InfoLine,
  InfoPill,
};
