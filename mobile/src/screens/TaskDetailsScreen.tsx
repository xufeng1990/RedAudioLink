import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Task } from '../types';

export interface ReportListItem {
  id: string;
  taskNumber: string;
  deviceCount: number;
  createdAt: string;
}

interface Props {
  task: Task;
  reports?: ReportListItem[];
  loadingReports?: boolean;
  isCompleted?: boolean;
  onSendPdf?: () => void;
  onOpenReport?: (r: ReportListItem) => void;
  onBack: () => void;
  onCreateNewTest: () => void;
  onCompleteTask: () => void;
  onReopenTask?: () => void;
}

function formatReportTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PencilIcon = ({ color }: { color: string }) => (
  <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', width: 12, height: 3, backgroundColor: color, transform: [{ rotate: '-45deg' }], top: 6, left: 2, borderRadius: 1 }} />
    <View style={{ position: 'absolute', width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color, top: 11, left: 1, transform: [{ rotate: '-45deg' }] }} />
  </View>
);

const ReportClipIcon = () => (
  <View style={{ width: 22, height: 26, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ position: 'absolute', top: 0, width: 8, height: 4, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderWidth: 1.4, borderColor: '#3FB984', backgroundColor: '#fff', zIndex: 2 }} />
    <View style={{ position: 'absolute', top: 3, width: 18, height: 22, borderRadius: 3, borderWidth: 1.4, borderColor: '#3FB984', backgroundColor: '#fff', alignItems: 'center', paddingTop: 6 }}>
      <View style={{ width: 10, height: 1.4, backgroundColor: '#3FB984', marginBottom: 2 }} />
      <View style={{ width: 10, height: 1.4, backgroundColor: '#3FB984', marginBottom: 2 }} />
      <View style={{ width: 6, height: 1.4, backgroundColor: '#3FB984' }} />
    </View>
  </View>
);

const ShareIcon = ({ color }: { color: string }) => (
  <View style={{ width: 20, height: 22, alignItems: 'center' }}>
    {/* U-shaped tray – no top border */}
    <View style={{
      position: 'absolute', bottom: 0,
      width: 16, height: 10,
      borderWidth: 1.8, borderTopWidth: 0,
      borderColor: color, borderRadius: 2,
    }} />
    {/* Vertical stem */}
    <View style={{
      position: 'absolute', top: 4,
      width: 1.8, height: 11,
      backgroundColor: color,
    }} />
    {/* Upward arrowhead */}
    <View style={{
      position: 'absolute', top: 0,
      width: 0, height: 0,
      borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 6,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderBottomColor: color,
    }} />
  </View>
);

const ClipboardEmptyIcon = () => (
  <View style={{ alignItems: 'center', marginBottom: 14, width: 44, height: 52 }}>
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 12,
        width: 20,
        height: 8,
        borderRadius: 2,
        borderWidth: 1.5,
        borderColor: '#BBB',
        backgroundColor: '#F2F2F2',
        zIndex: 2,
      }}
    />
    <View
      style={{
        position: 'absolute',
        top: 4,
        left: 0,
        width: 44,
        height: 48,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: '#BBB',
        backgroundColor: '#F2F2F2',
      }}
    />
    <View style={{ position: 'absolute', top: 22, left: 8, width: 28, height: 1.5, backgroundColor: '#CCC' }} />
    <View style={{ position: 'absolute', top: 30, left: 8, width: 28, height: 1.5, backgroundColor: '#CCC' }} />
    <View style={{ position: 'absolute', top: 38, left: 8, width: 18, height: 1.5, backgroundColor: '#CCC' }} />
  </View>
);

const PlusCircleSmall = ({ color }: { color: string }) => (
  <View
    style={{
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    }}
  >
    <Text style={{ fontSize: 12, color, marginTop: -1 }}>+</Text>
  </View>
);

const CheckCircleSmall = ({ color }: { color: string }) => (
  <View
    style={{
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    }}
  >
    <Text style={{ fontSize: 10, color, fontWeight: '700', marginTop: -1 }}>✓</Text>
  </View>
);

export default function TaskDetailsScreen({
  task,
  reports = [],
  loadingReports = false,
  isCompleted = false,
  onSendPdf,
  onOpenReport,
  onBack,
  onCreateNewTest,
  onCompleteTask,
  onReopenTask,
}: Props) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reopenVisible, setReopenVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="button-back">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        {reports.length > 0 ? (
          <TouchableOpacity
            style={styles.headerRight}
            onPress={onSendPdf}
            activeOpacity={0.7}
            testID="button-send-pdf"
          >
            <ShareIcon color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.taskCard}>
          <Text style={styles.taskTitle}>{task.title}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Creation Time</Text>
              <Text style={styles.infoValue}>{task.creationTime}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Task ID</Text>
              <Text style={styles.infoValue}>{task.taskId}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>postal code:</Text>
              <Text style={styles.infoValue}>{task.postalCode}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>State/Province:</Text>
              <Text style={styles.infoValue}>{task.stateProvince}</Text>
            </View>
          </View>

          <View style={styles.infoFullRow}>
            <Text style={styles.infoLabel}>address:</Text>
            <Text style={styles.infoValue}>{task.address}</Text>
          </View>
        </View>

        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>Alarm Report List</Text>
          {loadingReports && reports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Loading reports…</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyBox}>
              <ClipboardEmptyIcon />
              <Text style={styles.emptyText}>No alarm reports available.</Text>
              <Text style={styles.emptySubText}>
                A report will be generated once the test is complete.
              </Text>
              <Text style={styles.emptySubText}>
                Please click below:
                <Text style={styles.linkText} onPress={onCreateNewTest}> "Create New Test"</Text>
              </Text>
            </View>
          ) : (
            reports.map((r, idx) => {
              const title = `Inspection Report #${reports.length - idx}`;
              const sub = `${r.deviceCount} device${r.deviceCount === 1 ? '' : 's'} · ${formatReportTime(r.createdAt)}`;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.reportRow}
                  onPress={() => onOpenReport && onOpenReport(r)}
                  activeOpacity={0.7}
                  testID={`button-view-report-${r.id}`}
                >
                  <View style={styles.reportIconWrap}>
                    <ReportClipIcon />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportTitle}>{title}</Text>
                    <Text style={styles.reportSub}>{sub}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isCompleted ? (
          <TouchableOpacity
            style={styles.reopenBtn}
            onPress={() => setReopenVisible(true)}
            activeOpacity={0.85}
            testID="button-reopen-task"
          >
            <Text style={styles.btnText}>Move Back to Pending</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onCreateNewTest}
              activeOpacity={0.85}
              testID="button-create-new-test"
            >
              <PlusCircleSmall color="#fff" />
              <Text style={styles.btnText}>Create New Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setConfirmVisible(true)}
              activeOpacity={0.85}
              testID="button-complete-task"
            >
              <CheckCircleSmall color="#fff" />
              <Text style={styles.btnText}>Complete the task</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInner}>
                <Text style={styles.modalHeaderIcon}>ⓘ</Text>
                <Text style={styles.modalHeaderTitle}>Please confirm</Text>
              </View>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Are you sure you want to complete this task?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmVisible(false)}
                  testID="button-cancel-complete"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => {
                    setConfirmVisible(false);
                    onCompleteTask();
                  }}
                  testID="button-confirm-complete"
                >
                  <Text style={styles.modalConfirmText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reopenVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReopenVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInner}>
                <Text style={styles.modalHeaderIcon}>ⓘ</Text>
                <Text style={styles.modalHeaderTitle}>Please confirm</Text>
              </View>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Do you want to move the completed task back to the pending tasks list?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setReopenVisible(false)}
                  testID="button-cancel-reopen"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => {
                    setReopenVisible(false);
                    onReopenTask && onReopenTask();
                  }}
                  testID="button-confirm-reopen"
                >
                  <Text style={styles.modalConfirmText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '300',
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    width: 32,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 24,
  },
  taskCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoFullRow: {
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  reportSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  reportIconWrap: { marginRight: 12 },
  chevron: { fontSize: 22, color: '#BBB', marginLeft: 8 },
  reportTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4, textTransform: 'capitalize' },
  reportSub: { fontSize: 12, color: '#9A9A9A' },
  footer: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 14,
  },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 14,
  },
  btnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalHeaderInner: { flexDirection: 'row', alignItems: 'center' },
  modalHeaderIcon: { color: '#fff', fontSize: 16, marginRight: 8 },
  modalHeaderTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBody: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  modalMessage: { fontSize: 14, color: '#333', textAlign: 'center', marginBottom: 22, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#FDE7E9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
