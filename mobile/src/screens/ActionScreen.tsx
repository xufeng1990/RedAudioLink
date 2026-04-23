import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Device } from '../types';
import { ActionResult } from '../utils/generateReportPdf';

interface Props {
  device: Device;
  onBack: () => void;
  onNext: (actions: ActionResult[]) => void;
}

const STEPS = ['Report', 'Action', 'Image'];

const StepIndicator = ({ active }: { active: number }) => (
  <View style={styles.stepRow}>
    {STEPS.map((label, i) => {
      const isActive = i === active;
      const isDone = i < active;
      const filled = isActive || isDone;
      return (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, filled && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, filled && styles.stepNumActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, filled && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[styles.stepDash, isDone && { borderTopColor: Colors.primary }]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

const Caret = ({ open }: { open: boolean }) => (
  <Text style={[styles.caret, { transform: [{ rotate: open ? '180deg' : '0deg' }] }]}>⌃</Text>
);

const Bell = () => (
  <View style={styles.bell}>
    <View style={styles.bellTop} />
    <View style={styles.bellBody} />
    <View style={styles.bellDot} />
  </View>
);

const Check = () => (
  <Text style={styles.checkMark}>✓</Text>
);

interface Issue {
  title: string;
  actions: { id: string; alertCount: number }[];
}

const buildIssues = (device: Device): Issue[] => {
  const issues: Issue[] = [];

  if ((device.batteryVoltage ?? device.battery ?? 0) < 3.0) {
    issues.push({
      title: 'Low Battery',
      actions: [
        { id: 'lb-1', alertCount: 3 },
        { id: 'lb-2', alertCount: 3 },
      ],
    });
  } else {
    issues.push({
      title: 'Low Battery',
      actions: [
        { id: 'lb-1', alertCount: 3 },
        { id: 'lb-2', alertCount: 3 },
      ],
    });
  }

  issues.push({ title: 'Dust', actions: [{ id: 'dust-1', alertCount: 2 }] });

  const triggered = (device.alarmTriggers ?? []).find((t) => t.count > 0);
  if (triggered || (device.alarmOffCount ?? 0) > 0) {
    issues.push({ title: 'Issue', actions: [{ id: 'iss-1', alertCount: (device.alarmOffCount ?? 0) || 1 }] });
  } else {
    issues.push({ title: 'Issue', actions: [{ id: 'iss-1', alertCount: 1 }] });
  }

  return issues;
};

const RESULT_OPTIONS: { key: string; label: string }[] = [
  { key: 'checked', label: 'Checked' },
  { key: 'repaired', label: 'Repaired' },
  { key: 'replaced', label: 'Replaced' },
];

export default function ActionScreen({ device, onBack, onNext }: Props) {
  const issues = useMemo(() => buildIssues(device), [device]);

  const [openIssues, setOpenIssues] = useState<Record<string, boolean>>({
    [issues[0]?.title]: true,
  });
  const [openActions, setOpenActions] = useState<Record<string, boolean>>(
    issues[0]?.actions.reduce((acc, a) => ({ ...acc, [a.id]: true }), {} as Record<string, boolean>) || {}
  );
  const [selections, setSelections] = useState<Record<string, string>>({
    'lb-1': 'repaired',
    'lb-2': 'repaired',
  });

  // All action items must have a selection before proceeding
  const allActionIds = useMemo(
    () => issues.flatMap((issue) => issue.actions.map((a) => a.id)),
    [issues],
  );
  const allSelected = allActionIds.every((id) => !!selections[id]);

  const toggleIssue = (t: string) => setOpenIssues((p) => ({ ...p, [t]: !p[t] }));
  const toggleAction = (id: string) => setOpenActions((p) => ({ ...p, [id]: !p[id] }));
  const setSelection = (id: string, key: string) =>
    setSelections((p) => ({ ...p, [id]: p[id] === key ? '' : key }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>MODEL:</Text>
              <Text style={styles.metaValue}>{device.model}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SN:</Text>
              <Text style={styles.metaValue}>{device.serialNumber}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Replacement Date:</Text>
              <Text style={styles.metaValue}>{device.replacementDate}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date Code:</Text>
              <Text style={styles.metaValue}>{device.dateCode}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Days Remaining:</Text>
              <Text style={styles.metaValue}>{device.daysRemaining}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE:</Text>
              <Text style={styles.metaValue}>{device.lastInspectionDate}</Text>
            </View>
          </View>
        </View>

        <StepIndicator active={1} />

        {issues.map((issue, idx) => {
          const open = !!openIssues[issue.title];
          return (
            <View key={issue.title} style={styles.issueBlock}>
              <TouchableOpacity
                style={styles.issueHeader}
                onPress={() => toggleIssue(issue.title)}
                activeOpacity={0.7}
                testID={`issue-${idx}`}
              >
                <Text style={styles.issueTitle}>
                  Issue {idx + 1} : {issue.title}
                </Text>
                <Caret open={open} />
              </TouchableOpacity>

              {open &&
                issue.actions.map((action, ai) => {
                  const aOpen = openActions[action.id] !== false;
                  return (
                    <View key={action.id} style={styles.actionBlock}>
                      <TouchableOpacity
                        style={styles.actionHeader}
                        onPress={() => toggleAction(action.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionTitle}>Action {ai + 1}</Text>
                        <Caret open={aOpen} />
                      </TouchableOpacity>

                      {aOpen && (
                        <View style={styles.actionBody}>
                          <View style={styles.tipBox}>
                            <View style={{ marginRight: 8, marginTop: 1 }}>
                              <Bell />
                            </View>
                            <Text style={styles.tipText}>
                              {action.alertCount === 1
                                ? 'One alert was'
                                : `${action.alertCount === 3 ? 'Three' : action.alertCount === 2 ? 'Two' : action.alertCount} alerts were`}{' '}
                              triggered today {'→'} You need to fill in the handling result for each alert.
                            </Text>
                          </View>

                          <View style={styles.optionsRow}>
                            {RESULT_OPTIONS.map((opt) => {
                              const selected = selections[action.id] === opt.key;
                              return (
                                <TouchableOpacity
                                  key={opt.key}
                                  style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                                  onPress={() => setSelection(action.id, opt.key)}
                                  activeOpacity={0.85}
                                  testID={`option-${action.id}-${opt.key}`}
                                >
                                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                    {selected && <Check />}
                                  </View>
                                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                                    {opt.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          );
        })}

        <View style={styles.footerBtns}>
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={onBack}
            activeOpacity={0.85}
            testID="button-previous-step"
          >
            <Text style={styles.prevBtnText}>Previous Step</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, !allSelected && styles.nextBtnDisabled]}
            onPress={() => {
              if (!allSelected) return;
              const out: ActionResult[] = [];
              issues.forEach((issue) => {
                issue.actions.forEach((a, idx) => {
                  const sel = selections[a.id];
                  if (sel) {
                    out.push({
                      issueTitle: issue.title,
                      actionLabel: `Action ${idx + 1}`,
                      result: sel.charAt(0).toUpperCase() + sel.slice(1),
                    });
                  }
                });
              });
              onNext(out);
            }}
            activeOpacity={allSelected ? 0.85 : 1}
            testID="button-next-step"
          >
            <Text style={styles.nextBtnText}>Next step</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const TIP_BG = '#FAF6D9';
const TIP_BELL = '#E0B43E';
const PINK_BG = '#FDE7E9';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 50 },
  header: {
    height: 52,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#222', marginTop: -2 },
  headerTitle: { fontSize: 17, color: '#222', fontWeight: '600' },
  headerRight: { width: 36 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  metaCard: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14 },
  metaRow: { flexDirection: 'row', marginBottom: 8 },
  metaCol: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  metaValue: { fontSize: 13, color: '#222', fontWeight: '600' },

  stepRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  stepItem: { alignItems: 'center', flexDirection: 'row' },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 11, color: '#999', fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 12, color: '#999', marginLeft: 6, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },
  stepDash: { width: 50, height: 1, borderTopWidth: 1, borderTopColor: '#DDD', borderStyle: 'dashed', marginHorizontal: 6 },

  issueBlock: { backgroundColor: '#fff', marginBottom: 10 },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  issueTitle: { fontSize: 14, color: '#222', fontWeight: '600' },
  caret: { fontSize: 18, color: '#999', marginTop: -2 },

  actionBlock: { paddingHorizontal: 16, paddingTop: 14 },
  actionHeader: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
  },
  actionTitle: { fontSize: 13, color: '#222', fontWeight: '600' },
  actionBody: { paddingTop: 12, paddingBottom: 14 },

  tipBox: {
    flexDirection: 'row',
    backgroundColor: TIP_BG,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 4,
    marginBottom: 14,
  },
  tipText: { flex: 1, fontSize: 12, color: '#7A6B2E', lineHeight: 18 },

  bell: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  bellTop: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: TIP_BELL,
  },
  bellBody: {
    position: 'absolute',
    top: 3,
    width: 12,
    height: 9,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: TIP_BELL,
  },
  bellDot: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: TIP_BELL,
  },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 11,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  optionBtnSelected: { backgroundColor: PINK_BG },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.2,
    borderColor: '#BBB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: '#fff',
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '900', marginTop: -2 },
  optionLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  optionLabelSelected: { color: Colors.primary, fontWeight: '700' },

  footerBtns: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginTop: 8,
    gap: 10,
  },
  prevBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: PINK_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: { backgroundColor: '#F5A5AB', opacity: 0.7 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
