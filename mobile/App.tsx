import React, { useState, useEffect, useCallback } from "react";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashScreen from "./src/screens/SplashScreen";
import LandingScreen from "./src/screens/LandingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import CreateTaskScreen from "./src/screens/CreateTaskScreen";
import TaskDetailsScreen from "./src/screens/TaskDetailsScreen";
import ProfileScreen, { UserProfile } from "./src/screens/ProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import TaskSettingsScreen, {
  CleanupCycle,
} from "./src/screens/TaskSettingsScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import TermsOfUseScreen from "./src/screens/TermsOfUseScreen";
import RecordingTestScreen from "./src/screens/RecordingTestScreen";
import ReportScreen from "./src/screens/ReportScreen";
import ActionScreen from "./src/screens/ActionScreen";
import ImageStepScreen from "./src/screens/ImageStepScreen";
import ReportViewScreen from "./src/screens/ReportViewScreen";
import { mockProperties } from "./src/data/mockData";
import PropertyDetailScreen from "./src/screens/PropertyDetailScreen";
import DeviceInspectionScreen from "./src/screens/DeviceInspectionScreen";
import InspectionActionScreen from "./src/screens/InspectionActionScreen";
import InspectionImageScreen from "./src/screens/InspectionImageScreen";
import InspectionCompleteScreen from "./src/screens/InspectionCompleteScreen";
import { Property, Device, InspectionReport, Task, DeviceLocation } from "./src/types";
import type { ParsedDeviceData } from "./src/utils/audioParser";
import {
  CompletedReport,
  ActionResult,
  ReportPhotos,
  generateTaskPdf,
  buildHtmlDocument,
} from "./src/utils/generateReportPdf";
import {
  uploadReport,
  listReports,
  getReportUrl,
  type ReportDto,
} from "./src/api/reports";
import { Linking, Platform } from "react-native";
import { logoutApi } from "./src/api/auth";
import { fetchProfile, updateProfile } from "./src/api/profile";
import {
  fetchTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  type TaskDto,
} from "./src/api/tasks";

function formatCreationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function dtoToTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    taskId: dto.taskId,
    address: dto.address,
    stateProvince: dto.stateProvince,
    postalCode: dto.postalCode,
    status: dto.status,
    creationTime: formatCreationTime(dto.createdAt),
  };
}

type Screen =
  | "splash"
  | "landing"
  | "login"
  | "register"
  | "home"
  | "createTask"
  | "editTask"
  | "taskDetails"
  | "profile"
  | "editProfile"
  | "changePassword"
  | "taskSettings"
  | "privacyPolicy"
  | "termsOfUse"
  | "recordingTest"
  | "report"
  | "property"
  | "device"
  | "action"
  | "image"
  | "complete"
  | "reportView";

/** Convert a local file:// URI to a base64 data URL so it can be persisted on the server.
 *  On web the URI is already a data: URL from FileReader, so it passes through unchanged.
 *  Returns null if the input is null or conversion fails.
 */
async function uriToDataUrl(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith("data:")) return uri;           // already a data URL (web)
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime =
      ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [currentReport, setCurrentReport] = useState<InspectionReport | null>(
    null,
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    employeeName: "",
    employeeId: "",
    businessId: "",
    telephoneNumber: "",
    emailAddress: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      const p = await fetchProfile();
      setProfile(p);
    } catch {
      // ignore — user not authenticated yet or transient error
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const list = await fetchTasks();
      setTasks(list.map(dtoToTask));
    } catch {
      // ignore — user not authenticated yet or transient error
    }
  }, []);

  useEffect(() => {
    if (screen === "home" || screen === "profile") {
      loadProfile();
    }
    if (screen === "home") {
      loadTasks();
    }
  }, [screen, loadProfile, loadTasks]);
  const [cleanupCycle, setCleanupCycle] = useState<CleanupCycle>("daily");
  const [completedReports, setCompletedReports] = useState<
    Record<string, CompletedReport[]>
  >({});
  const [taskReports, setTaskReports] = useState<Record<string, ReportDto[]>>(
    {},
  );
  const [loadingTaskReports, setLoadingTaskReports] = useState<
    Record<string, boolean>
  >({});

  const loadTaskReports = useCallback(async (taskId: string) => {
    setLoadingTaskReports((p) => ({ ...p, [taskId]: true }));
    try {
      const list = await listReports(taskId);
      setTaskReports((p) => ({ ...p, [taskId]: list }));
    } catch {
      // silent — UI shows empty state
    } finally {
      setLoadingTaskReports((p) => ({ ...p, [taskId]: false }));
    }
  }, []);

  useEffect(() => {
    if (screen === "taskDetails" && selectedTask) {
      loadTaskReports(selectedTask.id);
    }
  }, [screen, selectedTask, loadTaskReports]);

  const openSavedReport = useCallback(async (reportId: string) => {
    try {
      const url = await getReportUrl(reportId);
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.open(url, "_blank");
      } else {
        await Linking.openURL(url);
      }
    } catch (err: any) {
      const { Alert } = await import("react-native");
      Alert.alert("Open failed", err?.message || "Could not open report.");
    }
  }, []);
  const [pendingActions, setPendingActions] = useState<ActionResult[]>([]);
  const [pendingLocation, setPendingLocation] = useState<{
    roomType: string;
    roomNumber: string;
  } | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [pendingDeviceJson, setPendingDeviceJson] =
    useState<ParsedDeviceData | null>(null);
  const [viewingReport, setViewingReport] = useState<CompletedReport | null>(
    null,
  );
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Authentication is determined by the presence of a valid token
  // (persisted by the auth API). On successful login/register we just
  // navigate — no email/username is required as a "logged in" signal.
  const handleLogin = () => {
    setScreen("home");
  };

  const handleLogout = () => {
    logoutApi();
    setProfile({
      employeeName: "",
      employeeId: "",
      businessId: "",
      telephoneNumber: "",
      emailAddress: "",
    });
    setTasks([]);
    setScreen("landing");
  };

  const handleDeleteTaskApi = async (taskId: string) => {
    // Only mutate local state on confirmed server success so the UI cannot
    // show a stale "deleted" state while the backend still has the task.
    await apiDeleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleRecallTaskApi = async (taskId: string) => {
    const updated = await apiUpdateTask(taskId, { status: "pending" });
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? dtoToTask(updated) : t)),
    );
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setScreen("property");
  };

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    setScreen("device");
  };

  const handleReportNext = (report: InspectionReport) => {
    setCurrentReport(report);
    setScreen("action");
  };

  const handleActionNext = (report: InspectionReport) => {
    setCurrentReport(report);
    setScreen("image");
  };

  const handleImageComplete = (report: InspectionReport) => {
    setCurrentReport(report);
    setScreen("complete");
  };

  const handleDone = () => {
    setSelectedDevice(null);
    setCurrentReport(null);
    setScreen("home");
    setSelectedProperty(null);
  };

  const handleNewInspection = () => {
    setSelectedDevice(null);
    setCurrentReport(null);
    setScreen("property");
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === "splash" && (
        <SplashScreen
          onFinish={(authenticated) => {
            setScreen(authenticated ? "home" : "landing");
          }}
        />
      )}
      {screen === "landing" && (
        <LandingScreen
          onGoLogin={() => setScreen("login")}
          onGoRegister={() => setScreen("register")}
        />
      )}
      {screen === "login" && (
        <LoginScreen
          onLogin={handleLogin}
          onBack={() => setScreen("landing")}
        />
      )}
      {screen === "register" && (
        <RegisterScreen
          onRegister={handleLogin}
          onBack={() => setScreen("landing")}
        />
      )}
      {screen === "home" && (
        <HomeScreen
          username={profile.employeeName || profile.emailAddress}
          onSelectProperty={handleSelectProperty}
          onSelectTask={(task) => {
            setSelectedTask(task);
            setScreen("taskDetails");
          }}
          onEditTask={(task) => {
            setEditingTask(task);
            setScreen("editTask");
          }}
          onConfirmDeleteTask={handleDeleteTaskApi}
          onRecallTask={handleRecallTaskApi}
          onLogout={handleLogout}
          onOpenProfile={() => setScreen("profile")}
          onCreateTask={() => setScreen("createTask")}
          tasks={tasks}
        />
      )}
      {screen === "editTask" && editingTask && (
        <CreateTaskScreen
          mode="edit"
          initial={{
            title: editingTask.title,
            taskId: editingTask.taskId,
            address: editingTask.address,
            stateProvince: editingTask.stateProvince,
            postalCode: editingTask.postalCode,
          }}
          onBack={() => setScreen("home")}
          onSubmit={async (t) => {
            const updated = await apiUpdateTask(editingTask.id, t);
            setTasks((prev) =>
              prev.map((x) => (x.id === updated.id ? dtoToTask(updated) : x)),
            );
            setEditingTask(null);
            setScreen("home");
          }}
        />
      )}
      {screen === "profile" && (
        <ProfileScreen
          profile={profile}
          onBack={() => setScreen("home")}
          onEditProfile={() => setScreen("editProfile")}
          onAccountSettings={() => setScreen("changePassword")}
          onTaskSettings={() => setScreen("taskSettings")}
          onPrivacyPolicy={() => setScreen("privacyPolicy")}
          onTermsOfUse={() => setScreen("termsOfUse")}
          onLogout={handleLogout}
        />
      )}
      {screen === "editProfile" && (
        <EditProfileScreen
          profile={profile}
          onBack={() => setScreen("profile")}
          onSave={async (p) => {
            const saved = await updateProfile(p);
            setProfile(saved);
            setScreen("profile");
          }}
        />
      )}
      {screen === "changePassword" && (
        <ChangePasswordScreen
          onBack={() => setScreen("profile")}
          onSave={() => setScreen("profile")}
        />
      )}
      {screen === "taskSettings" && (
        <TaskSettingsScreen
          initial={cleanupCycle}
          onBack={() => setScreen("profile")}
          onSave={(c) => {
            setCleanupCycle(c);
            setScreen("profile");
          }}
        />
      )}
      {screen === "privacyPolicy" && (
        <PrivacyPolicyScreen onBack={() => setScreen("profile")} />
      )}
      {screen === "termsOfUse" && (
        <TermsOfUseScreen onBack={() => setScreen("profile")} />
      )}
      {screen === "recordingTest" && (
        <RecordingTestScreen
          onBack={() => setScreen("taskDetails")}
          onViewReport={(parsed) => {
            setPendingDeviceJson(parsed);
            const prop = selectedTask?.property || mockProperties[0];
            const baseDev = prop.devices[0] || mockProperties[0].devices[0];
            const dev: Device = parsed
              ? {
                  ...baseDev,
                  ...parsed,
                  id: baseDev.id,
                  location: baseDev.location,
                  // keep legacy aliases in sync for older screens
                  model: parsed.model_no,
                  serialNumber: parsed.sn,
                  dateCode: parsed.date,
                  batteryVoltage: parsed.battery,
                }
              : baseDev;
            setSelectedProperty(prop);
            setSelectedDevice(dev);
            setScreen("report");
          }}
        />
      )}
      {screen === "report" && selectedDevice && selectedProperty && (
        <ReportScreen
          device={selectedDevice}
          onBack={() => setScreen("taskDetails")}
          onNext={(locations) => {
            setPendingLocation(locations[0] || null);
            const report: InspectionReport = {
              id: `RPT-${Date.now()}`,
              propertyId: selectedProperty.id,
              deviceId: selectedDevice.id,
              technicianName:
                profile.employeeName || profile.emailAddress || "Technician",
              date: new Date().toISOString(),
              step: "action",
              completed: false,
              actions: [],
              images: [],
              notes: "",
              location: selectedDevice.location,
            };
            setCurrentReport(report);
            setScreen("action");
          }}
        />
      )}
      {screen === "taskDetails" && selectedTask && (
        <TaskDetailsScreen
          task={selectedTask}
          reports={taskReports[selectedTask.id] || []}
          loadingReports={loadingTaskReports[selectedTask.id] || false}
          isCompleted={selectedTask.status === "completed"}
          pdfGenerating={pdfGenerating}
          onReopenTask={async () => {
            await handleRecallTaskApi(selectedTask.id);
            setScreen("home");
          }}
          onSendPdf={async () => {
            if (pdfGenerating) return;
            const rawReports = taskReports[selectedTask.id] || [];
            if (rawReports.length === 0) return;
            setPdfGenerating(true);
            try {
              // Synthesize CompletedReport[] from stored deviceJson
              const baseDev = mockProperties[0].devices[0];
              const toShare: CompletedReport[] = rawReports
                .map((r) => {
                  const parsed = (r.deviceJson ?? null) as ParsedDeviceData | null;
                  if (!parsed) return null;
                  const dev: Device = {
                    ...baseDev, ...parsed, id: baseDev.id,
                    location: baseDev.location,
                    model: parsed.model_no,
                    serialNumber: parsed.sn,
                    dateCode: parsed.date,
                    batteryVoltage: parsed.battery,
                  };
                  const restoredPhotos: ReportPhotos =
                    (parsed as any)?._photos ?? { deviceCode: null, equipmentLocation: null };
                  const restoredActions: ActionResult[] = (parsed as any)?._actions ?? [];
                  const restoredLocation: DeviceLocation =
                    (parsed as any)?._location ?? baseDev.location;
                  return {
                    id: r.id, taskId: r.taskId, taskNumber: r.taskNumber,
                    employeeId: profile.employeeId,
                    inspectedAt: formatCreationTime(r.createdAt),
                    device: dev, location: restoredLocation,
                    actions: restoredActions, photos: restoredPhotos,
                    devicesInspected: r.deviceCount,
                  } as CompletedReport;
                })
                .filter(Boolean) as CompletedReport[];
              if (toShare.length === 0) {
                // Fallback for older reports without deviceJson
                const latest = rawReports[0];
                if (latest) openSavedReport(latest.id);
                return;
              }
              await generateTaskPdf(toShare, selectedTask.taskId);
            } finally {
              setPdfGenerating(false);
            }
          }}
          onOpenReport={(r) => {
            // Prefer the structured device JSON saved alongside the
            // report so the technician can review the parsed values
            // natively. Older reports saved before this column existed
            // fall back to opening the rendered HTML in a browser.
            const parsed = (r.deviceJson ?? null) as
              | ParsedDeviceData
              | null;
            if (parsed) {
              const baseDev = mockProperties[0].devices[0];
              const dev: Device = {
                ...baseDev,
                ...parsed,
                id: baseDev.id,
                location: baseDev.location,
                model: parsed.model_no,
                serialNumber: parsed.sn,
                dateCode: parsed.date,
                batteryVoltage: parsed.battery,
              };
              // Restore photos persisted in deviceJson._photos (base64 data URLs)
              const restoredPhotos: ReportPhotos =
                (parsed as any)?._photos ?? { deviceCode: null, equipmentLocation: null };
              // Restore actions and location persisted in deviceJson
              const restoredActions: ActionResult[] =
                (parsed as any)?._actions ?? [];
              const restoredLocation: DeviceLocation =
                (parsed as any)?._location ?? baseDev.location;
              const synthesized: CompletedReport = {
                id: r.id,
                taskId: r.taskId,
                taskNumber: r.taskNumber,
                employeeId: profile.employeeId,
                inspectedAt: formatCreationTime(r.createdAt),
                device: dev,
                location: restoredLocation,
                actions: restoredActions,
                photos: restoredPhotos,
                devicesInspected: r.deviceCount,
              };
              setViewingReport(synthesized);
              setScreen("reportView");
            } else {
              openSavedReport(r.id);
            }
          }}
          onBack={() => setScreen("home")}
          onCreateNewTest={() => setScreen("recordingTest")}
          onCompleteTask={async () => {
            // Don't navigate away if the API rejects — surface the failure
            // to the caller so it can show an error and keep the user here.
            const updated = await apiUpdateTask(selectedTask.id, {
              status: "completed",
            });
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? dtoToTask(updated) : t)),
            );
            setScreen("home");
          }}
        />
      )}
      {screen === "createTask" && (
        <CreateTaskScreen
          onBack={() => setScreen("home")}
          onSubmit={async (t) => {
            const created = await apiCreateTask(t);
            setTasks((prev) => [dtoToTask(created), ...prev]);
            setScreen("home");
          }}
        />
      )}
      {screen === "property" && selectedProperty && (
        <PropertyDetailScreen
          property={selectedProperty}
          onSelectDevice={handleSelectDevice}
          onBack={() => setScreen("home")}
        />
      )}
      {screen === "device" && selectedDevice && selectedProperty && (
        <DeviceInspectionScreen
          device={selectedDevice}
          propertyId={selectedProperty.id}
          onNext={handleReportNext}
          onBack={() => setScreen("property")}
        />
      )}
      {screen === "action" && selectedDevice && (
        <ActionScreen
          device={selectedDevice}
          onBack={() => setScreen("report")}
          onNext={(actions) => {
            setPendingActions(actions);
            setScreen("image");
          }}
        />
      )}
      {screen === "image" && selectedDevice && selectedTask && (
        <ImageStepScreen
          device={selectedDevice}
          onBack={() => setScreen("action")}
          onFinish={async (photos: ReportPhotos) => {
            const existing = completedReports[selectedTask.id] || [];
            const isEdit = !!editingReportId;

            // Convert local file:// URIs to base64 data URLs so photos are
            // embedded in the server HTML and can be restored on any device.
            const persistedPhotos: ReportPhotos = {
              deviceCode: await uriToDataUrl(photos.deviceCode),
              equipmentLocation: await uriToDataUrl(photos.equipmentLocation),
            };

            const report: CompletedReport = {
              id: editingReportId || `RPT-${Date.now()}`,
              taskId: selectedTask.id,
              taskNumber: selectedTask.taskId,
              employeeId: profile.employeeId,
              inspectedAt: new Date()
                .toISOString()
                .slice(0, 16)
                .replace("T", " "),
              device: selectedDevice,
              location: pendingLocation || selectedDevice.location,
              actions: pendingActions,
              photos: persistedPhotos,
              devicesInspected: isEdit ? existing.length : existing.length + 1,
            };
            const nextReports = isEdit
              ? existing.map((x) => (x.id === editingReportId ? report : x))
              : [...existing, report];

            // Build the PDF (HTML) document and persist it on the server
            // before mutating local state, so failures keep the user on
            // this step with a clear error.
            try {
              const html = buildHtmlDocument(nextReports, selectedTask.taskId);
              // Merge photos into deviceJson so native report view can restore them
              const deviceJsonWithPhotos = {
                ...(pendingDeviceJson ?? {}),
                _photos: persistedPhotos,
                _actions: pendingActions,
                _location: pendingLocation || selectedDevice.location,
              };
              await uploadReport(selectedTask.id, {
                html,
                taskNumber: selectedTask.taskId,
                deviceCount: nextReports.length,
                deviceJson: deviceJsonWithPhotos,
              });
            } catch (err: any) {
              const { Alert } = await import("react-native");
              Alert.alert(
                "Save failed",
                err?.message || "Could not save the report. Please try again.",
              );
              return;
            }

            setCompletedReports((prev) => ({
              ...prev,
              [selectedTask.id]: nextReports,
            }));
            setPendingActions([]);
            setPendingLocation(null);
            setEditingReportId(null);
            setPendingDeviceJson(null);
            setScreen("taskDetails");
          }}
        />
      )}
      {screen === "reportView" && viewingReport && (
        <ReportViewScreen
          report={viewingReport}
          onBack={() => {
            setViewingReport(null);
            setScreen("taskDetails");
          }}
          onEdit={() => {
            const r = viewingReport;
            setSelectedDevice(r.device);
            const prop =
              mockProperties.find((p) => p.id === (selectedTask?.id || "")) ||
              mockProperties[0];
            setSelectedProperty(prop);
            setPendingLocation(r.location);
            setPendingActions(r.actions);
            setEditingReportId(r.id);
            setViewingReport(null);
            setScreen("report");
          }}
        />
      )}
      {screen === "complete" && currentReport && selectedDevice && (
        <InspectionCompleteScreen
          report={currentReport}
          device={selectedDevice}
          onDone={handleDone}
          onNewInspection={handleNewInspection}
        />
      )}
    </SafeAreaProvider>
  );
}
