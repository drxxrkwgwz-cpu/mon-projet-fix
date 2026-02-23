import { StyleSheet } from "react-native";

export const FULL_DAY_LABELS = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

export function getDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "mon";
  const day = date.getDay();
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[day] || "mon";
}

export function buildIntervals(session) {
  const intervals = Array.isArray(session?.intervals) ? session.intervals : [];
  if (intervals.length > 0) {
    const first = intervals[0] || {};
    return {
      reps: Number(first?.reps || 0),
      label: String(first?.distance || ""),
    };
  }

  const planBlocks = Array.isArray(session?.plan?.blocks) ? session.plan.blocks : [];
  for (const block of planBlocks) {
    if (!Array.isArray(block?.sets)) continue;
    const first = block.sets[0];
    if (first) {
      return {
        reps: Number(first?.reps || 0),
        label: String(first?.distance || ""),
      };
    }
  }

  return { reps: 0, label: "" };
}

export const styles = StyleSheet.create({
  sessionDetailSafeArea: { flex: 1, backgroundColor: "#070B14" },
  sessionDetailContainer: { flex: 1 },
  sessionDetailContent: { padding: 16, paddingBottom: 40 },
  sessionDetailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sessionDetailBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(148,163,184,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionDetailBackText: { color: "#E2E8F0", fontSize: 24, marginTop: -3 },
  sessionDetailHeaderMid: { flex: 1, marginHorizontal: 12 },
  sessionDetailHeaderDate: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  sessionDetailStatusPill: { backgroundColor: "rgba(59,130,246,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  sessionDetailStatusText: { color: "#93C5FD", fontSize: 11, fontWeight: "700" },
  sessionDetailTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12 },
  sessionDetailChipsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  detailChip: { backgroundColor: "rgba(148,163,184,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  detailChipWarm: { backgroundColor: "rgba(251,191,36,0.2)" },
  detailChipText: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  detailChipTextWarm: { color: "#FDE68A" },
  detailSectionLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 8 },
  detailSectionLabelInline: { color: "#94A3B8", fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 12 },
  detailCard: { backgroundColor: "#0F172A", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(148,163,184,0.2)", marginBottom: 12 },
  detailPlaceholder: { color: "#E2E8F0", fontSize: 14, lineHeight: 20 },
  structureItem: { flexDirection: "row" },
  structureLeftBar: { width: 3, borderRadius: 2, marginRight: 10, backgroundColor: "#3B82F6" },
  structureLeftBarWarm: { backgroundColor: "#F59E0B" },
  structureLeftBarCool: { backgroundColor: "#22D3EE" },
  structureItemBody: { flex: 1 },
  structureItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  structureItemTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  structureItemDuration: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  structureItemSub: { color: "#CBD5E1", fontSize: 13, lineHeight: 18, marginTop: 2 },
  structureDivider: { height: 1, backgroundColor: "rgba(148,163,184,0.2)", marginVertical: 10 },
  coachCardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  coachCardIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(251,191,36,0.2)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  coachCardIconText: { color: "#FDE68A", fontWeight: "800" },
  coachCardTitle: { color: "#F8FAFC", fontSize: 12, fontWeight: "800" },
  feedbackSavedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(34,197,94,0.18)", borderRadius: 14, padding: 12, marginBottom: 10 },
  feedbackSavedIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(34,197,94,0.35)", alignItems: "center", justifyContent: "center", marginRight: 10 },
  feedbackSavedIconText: { color: "#BBF7D0", fontWeight: "900" },
  feedbackSavedTitle: { color: "#DCFCE7", fontWeight: "800", marginBottom: 2 },
  feedbackSavedSubtitle: { color: "#BBF7D0", fontSize: 12 },
  feedbackPrompt: { color: "#E2E8F0", fontSize: 13, marginBottom: 10 },
  feedbackInputDark: { minHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", padding: 10, color: "#E2E8F0", textAlignVertical: "top", marginBottom: 10 },
  difficultyRowDark: { flexDirection: "row", gap: 8, marginBottom: 10 },
  difficultyChipDark: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", paddingVertical: 8, paddingHorizontal: 10 },
  difficultyChipActiveDark: { borderRadius: 999, backgroundColor: "#2563EB", paddingVertical: 8, paddingHorizontal: 10 },
  difficultyChipTextDark: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  difficultyChipTextActiveDark: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  splitBlock: { marginBottom: 10 },
  splitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  splitInputWrapper: { width: "23%" },
  splitLabelDark: { color: "#94A3B8", fontSize: 11, marginBottom: 4 },
  splitInputDark: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", color: "#E2E8F0", paddingHorizontal: 8, paddingVertical: 8 },
  primaryButtonBlue: { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  primaryButtonBlueText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  loadingText: { color: "#94A3B8", fontSize: 12 },
  recalcCard: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 14, marginTop: 12 },
  recalcTitle: { color: "#0F172A", fontWeight: "800", fontSize: 16 },
  recalcSubtitle: { color: "#475569", fontSize: 12, marginTop: 4, marginBottom: 10 },
  primaryButton: { backgroundColor: "#0F172A", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  recalcBar: { height: 8, borderRadius: 999, backgroundColor: "rgba(37,99,235,0.15)", marginTop: 10, overflow: "hidden" },
  recalcFill: { height: "100%", backgroundColor: "#2563EB" },
  screenHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
  backButton: { backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  backButtonText: { color: "#E2E8F0", fontWeight: "700" },
  screenTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
});
