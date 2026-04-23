import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Colors } from "../theme/colors";

export interface UserProfile {
  employeeName: string;
  employeeId: string;
  businessId: string;
  telephoneNumber: string;
  emailAddress: string;
}

interface Props {
  profile: UserProfile;
  appVersion?: string;
  onBack: () => void;
  onEditProfile: () => void;
  onAccountSettings: () => void;
  onTaskSettings: () => void;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
  onLogout: () => void;
}

const PersonSilhouette = () => (
  <View style={styles.avatarInner}>
    <View style={styles.avatarHead} />
    <View style={styles.avatarBody} />
  </View>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
);

const Row = ({
  title,
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
}) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    activeOpacity={0.7}
    testID={testID}
  >
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

export default function ProfileScreen({
  profile,
  appVersion = "v1.0.0",
  onBack,
  onEditProfile,
  onAccountSettings,
  onTaskSettings,
  onPrivacyPolicy,
  onTermsOfUse,
  onLogout,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          testID="button-back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={onEditProfile}
          activeOpacity={0.85}
          testID="button-avatar-edit"
        >
          <View style={styles.avatar}>
            <PersonSilhouette />
          </View>
        </TouchableOpacity>

        <View style={styles.gridCard}>
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridCellRight]}>
              <Field label="Employee Name" value={profile.employeeName || "-"} />
            </View>
            <View style={styles.gridCell}>
              <Field label="Employee ID" value={profile.employeeId} />
            </View>
          </View>
          <View style={styles.gridDivider} />
          <View style={styles.gridRow}>
            <View style={[styles.gridCell, styles.gridCellRight]}>
              <Field label="Business ID" value={profile.businessId} />
            </View>
            <View style={styles.gridCell}>
              <Field label="Telephone Number" value={profile.telephoneNumber || "-"} />
            </View>
          </View>
          <View style={styles.gridDivider} />
          <View style={[styles.gridRow]}>
            <View style={[styles.gridCell, { flex: 1 }]}>
              <Field label="Email Address" value={profile.emailAddress} />
            </View>
          </View>
        </View>

        <View style={styles.listCard}>
          <Row
            title="Account Settings"
            subtitle="Setting passwords, etc."
            onPress={onAccountSettings}
            testID="row-account-settings"
          />
          <View style={styles.rowDivider} />
          <Row
            title="Task Settings"
            onPress={onTaskSettings}
            testID="row-task-settings"
          />
          <View style={styles.rowDivider} />
          <Row
            title="Privacy Policy"
            onPress={onPrivacyPolicy}
            testID="row-privacy-policy"
          />
          <View style={styles.rowDivider} />
          <Row
            title="Terms of Use"
            onPress={onTermsOfUse}
            testID="row-terms-of-use"
          />
        </View>

        <View style={styles.versionWrap}>
          <Text style={styles.versionLabel}>APPVersion Information</Text>
          <Text style={styles.versionValue}>{appVersion}</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          activeOpacity={0.85}
          testID="button-logout"
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", paddingTop: 50 },
  header: {
    height: 52,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 28, color: "#222", marginTop: -2 },
  headerTitle: { fontSize: 17, color: "#222", fontWeight: "500" },
  headerRight: { width: 36 },
  scroll: { paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginTop: 18, marginBottom: 18 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: { alignItems: "center", justifyContent: "center" },
  avatarHead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 2,
  },
  avatarBody: {
    width: 30,
    height: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderColor: "#fff",
    borderBottomWidth: 0,
  },
  gridCard: {
    marginHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 4,
  },
  gridRow: { flexDirection: "row" },
  gridCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  gridCellRight: { borderRightWidth: 1, borderRightColor: "#F0F0F0" },
  gridDivider: { height: 1, backgroundColor: "#F0F0F0" },
  field: {},
  fieldLabel: { fontSize: 12, color: "#9A9A9A", marginBottom: 4 },
  fieldValue: { fontSize: 14, color: "#222", fontWeight: "500" },
  listCard: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowTitle: { fontSize: 14, color: "#222", fontWeight: "500" },
  rowSubtitle: { fontSize: 12, color: "#9A9A9A", marginTop: 3 },
  rowDivider: { height: 1, backgroundColor: "#F0F0F0" },
  chevron: { fontSize: 22, color: "#CCC", marginLeft: 8 },
  versionWrap: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  versionLabel: { fontSize: 12, color: "#9A9A9A" },
  versionValue: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
    marginTop: 3,
  },
  logoutBtn: {
    marginHorizontal: 14,
    marginTop: 24,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
