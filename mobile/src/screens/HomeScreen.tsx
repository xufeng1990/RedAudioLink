import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Modal,
  Animated,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Property, Task } from '../types';

interface Props {
  username: string;
  onSelectProperty: (property: Property) => void;
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onConfirmDeleteTask: (taskId: string) => Promise<void> | void;
  onRecallTask: (taskId: string) => Promise<void> | void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onCreateTask: () => void;
  tasks: Task[];
}

type TabType = 'pending' | 'completed';

const PersonIcon = () => (
  <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#fff', marginBottom: 1 }} />
    <View style={{ width: 14, height: 7, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 1.5, borderColor: '#fff', borderBottomWidth: 0 }} />
  </View>
);

const ClockIcon = () => (
  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 1.5, height: 4, backgroundColor: '#fff', position: 'absolute', top: 2 }} />
    <View style={{ width: 3, height: 1.5, backgroundColor: '#fff', position: 'absolute', top: 5, left: 6 }} />
  </View>
);

const CheckCircleIcon = ({ color }: { color: string }) => (
  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 8, color: color, fontWeight: '700', marginTop: -1 }}>✓</Text>
  </View>
);

const PlusCircleIcon = () => (
  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 12, color: '#fff', fontWeight: '400', marginTop: -1 }}>+</Text>
  </View>
);

const ICON_SOURCE = require('../../assets/edit-delete-icons.png');

const EditIcon = () => (
  <View style={{ width: 22, height: 22, overflow: 'hidden' }}>
    <Image
      source={ICON_SOURCE}
      style={{ width: 52, height: 22, marginLeft: 0 }}
      resizeMode="contain"
    />
  </View>
);

const DeleteIcon = () => (
  <View style={{ width: 22, height: 22, overflow: 'hidden' }}>
    <Image
      source={ICON_SOURCE}
      style={{ width: 52, height: 22, marginLeft: -30 }}
      resizeMode="contain"
    />
  </View>
);

const ClipboardIcon = () => (
  <View style={{ alignItems: 'center', marginBottom: 12 }}>
    <View style={{ width: 50, height: 56, borderRadius: 4, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', paddingTop: 10 }}>
      <View style={{ width: 18, height: 3, backgroundColor: '#ccc', borderRadius: 1, marginBottom: 5 }} />
      <View style={{ width: 18, height: 3, backgroundColor: '#ccc', borderRadius: 1, marginBottom: 5 }} />
      <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: '#ccc' }} />
      </View>
    </View>
    <View style={{ width: 20, height: 6, borderRadius: 3, backgroundColor: '#ccc', marginTop: -58, marginBottom: 52 }} />
  </View>
);

type ToastType = 'success' | 'error';

export default function HomeScreen({ username, onSelectProperty, onSelectTask, onEditTask, onConfirmDeleteTask, onRecallTask, onLogout, onOpenProfile, onCreateTask, tasks }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [recallTaskId, setRecallTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(toastOpacity, {
      toValue: toast.visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [toast.visible, toastOpacity]);

  const showToast = (type: ToastType, message: string) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800);
  };

  const filteredTasks = tasks.filter((t) => t.status === activeTab);

  const handleDeleteTask = (taskId: string) => {
    setDeleteTaskId(taskId);
  };

  const confirmDelete = async () => {
    if (!deleteTaskId || actionInFlight) return;
    const id = deleteTaskId;
    setActionInFlight(true);
    try {
      await onConfirmDeleteTask(id);
      setDeleteTaskId(null);
      showToast('success', 'Task deleted!');
    } catch (e: any) {
      showToast('error', e?.message || 'Delete failed');
    } finally {
      setActionInFlight(false);
    }
  };

  const cancelDelete = () => setDeleteTaskId(null);

  const handleAddTask = () => {
    onCreateTask();
  };

  const handleTaskPress = (task: Task) => {
    onSelectTask(task);
  };

  const handleRevertTask = (taskId: string) => {
    setRecallTaskId(taskId);
  };

  const confirmRecall = async () => {
    if (!recallTaskId || actionInFlight) return;
    const id = recallTaskId;
    setActionInFlight(true);
    try {
      await onRecallTask(id);
      setRecallTaskId(null);
      setActiveTab('pending');
      showToast('success', 'Recall successful!');
    } catch (e: any) {
      showToast('error', e?.message || 'Recall failed');
    } finally {
      setActionInFlight(false);
    }
  };

  const cancelRecall = () => setRecallTaskId(null);

  const renderTaskCard = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => handleTaskPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.taskCardHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View style={styles.taskActions}>
          {item.status === 'pending' ? (
            <>
              <TouchableOpacity style={styles.taskActionBtn} onPress={() => onEditTask(item)}>
                <EditIcon />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
                <DeleteIcon />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => handleRevertTask(item.id)}>
              <Text style={styles.revertIcon}>↺</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.taskInfoRow}>
        <View style={styles.taskInfoCol}>
          <Text style={styles.taskInfoLabel}>Creation Time</Text>
          <Text style={styles.taskInfoValue}>{item.creationTime}</Text>
        </View>
        <View style={styles.taskInfoCol}>
          <Text style={styles.taskInfoLabel}>Task ID</Text>
          <Text style={styles.taskInfoValue}>{item.taskId}</Text>
        </View>
      </View>

      <View style={styles.taskInfoRow}>
        <View style={styles.taskInfoCol}>
          <Text style={styles.taskInfoLabel}>Postal Code</Text>
          <Text style={styles.taskInfoValue}>{item.postalCode}</Text>
        </View>
        <View style={styles.taskInfoCol}>
          <Text style={styles.taskInfoLabel}>State/Province</Text>
          <Text style={styles.taskInfoValue}>{item.stateProvince}</Text>
        </View>
      </View>

      <View style={styles.taskInfoFullRow}>
        <Text style={styles.taskInfoLabel}>Address</Text>
        <Text style={styles.taskInfoValue}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ClipboardIcon />
      <Text style={styles.emptyText}>No tasks available.</Text>
      <Text style={styles.emptySubText}>
        Click the plus sign above to add one.<Text style={styles.createTaskLink} onPress={handleAddTask}>"Create Task"</Text>
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (filteredTasks.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>There is nothing more.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>(RED) Inspection Checklist</Text>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={onOpenProfile}
          testID="button-profile"
        >
          <PersonIcon />
        </TouchableOpacity>
      </View>

      <View style={styles.welcomeBar}>
        <Text style={styles.welcomeText}>Welcome to (RED) Inspection Checklist !</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabPending, activeTab === 'pending' ? styles.tabPendingActive : styles.tabPendingInactive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.8}
        >
          <ClockIcon />
          <Text style={[styles.tabPendingText, activeTab !== 'pending' && { color: Colors.primary }]}>Pending Tasks</Text>
          <Text style={[styles.tabDropdown, activeTab !== 'pending' && { color: Colors.primary }]}>▾</Text>
          <TouchableOpacity onPress={handleAddTask} style={styles.addBtnWrap}>
            <PlusCircleIcon />
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabCompleted, activeTab === 'completed' ? styles.tabCompletedActive : styles.tabCompletedInactive]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.8}
        >
          <CheckCircleIcon color={activeTab === 'completed' ? '#fff' : '#22C55E'} />
          <Text style={[styles.tabCompletedText, activeTab === 'completed' && { color: '#fff' }]}>Completed Tasks</Text>
          <Text style={[styles.tabDropdownCompleted, activeTab === 'completed' && { color: '#fff' }]}>▾</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderTaskCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      <Modal visible={deleteTaskId !== null} transparent animationType="fade" onRequestClose={cancelDelete}>
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
                Are you sure you want to delete this task?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={cancelDelete}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmDelete}>
                  <Text style={styles.modalConfirmText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={recallTaskId !== null} transparent animationType="fade" onRequestClose={cancelRecall}>
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
                <TouchableOpacity style={styles.modalCancelBtn} onPress={cancelRecall}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmRecall}>
                  <Text style={styles.modalConfirmText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {toast.visible && (
        <View style={styles.toastWrap} pointerEvents="none">
          <Animated.View
            style={[
              styles.toast,
              toast.type === 'success' ? styles.toastSuccess : styles.toastError,
              { opacity: toastOpacity },
            ]}
          >
            <View
              style={[
                styles.toastIconCircle,
                { borderColor: toast.type === 'success' ? '#1E8449' : '#C0392B' },
              ]}
            >
              <Text
                style={[
                  styles.toastIcon,
                  { color: toast.type === 'success' ? '#1E8449' : '#C0392B' },
                ]}
              >
                {toast.type === 'success' ? '✓' : '✕'}
              </Text>
            </View>
            <Text
              style={[
                styles.toastText,
                { color: toast.type === 'success' ? '#1E8449' : '#C0392B' },
              ]}
            >
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMenu: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: 140,
  },
  profileMenuUser: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileMenuItem: {
    paddingVertical: 10,
  },
  profileMenuLogout: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  welcomeBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.primary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 0,
  },
  tabPending: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  tabPendingActive: {
    backgroundColor: Colors.primary,
  },
  tabPendingInactive: {
    backgroundColor: 'rgba(237, 28, 41, 0.1)',
  },
  tabPendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tabDropdown: {
    fontSize: 11,
    color: '#fff',
    marginLeft: -2,
  },
  addBtnWrap: {
    marginLeft: 4,
  },
  tabCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 8,
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  tabCompletedActive: {
    backgroundColor: '#22C55E',
  },
  tabCompletedInactive: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
  },
  tabCompletedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  tabDropdownCompleted: {
    fontSize: 11,
    color: '#22C55E',
    marginLeft: -2,
  },
  listContent: {
    paddingBottom: 32,
  },
  taskCard: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taskActionBtn: {},
  revertIcon: {
    fontSize: 20,
    color: Colors.primary,
    transform: [{ scaleX: -1 }],
  },
  taskInfoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  taskInfoCol: {
    flex: 1,
  },
  taskInfoFullRow: {
    marginBottom: 4,
  },
  taskInfoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  taskInfoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 40,
    backgroundColor: '#F5F5F5',
    paddingBottom: 50,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  createTaskLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#CCC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalHeaderIcon: {
    fontSize: 16,
    color: Colors.white,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  modalClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#FCEAEC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  toastWrap: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '85%',
    gap: 8,
  },
  toastSuccess: {
    backgroundColor: '#D4EFDF',
    borderColor: '#7DCEA0',
  },
  toastError: {
    backgroundColor: '#F8D7DA',
    borderColor: '#E89BA1',
  },
  toastIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
