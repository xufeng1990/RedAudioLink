import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

const STORAGE_KEY = "admin_lang";

const dict: Record<string, { zh: string; en: string }> = {
  // common
  "common.cancel": { zh: "取消", en: "Cancel" },
  "common.confirm": { zh: "确认", en: "Confirm" },
  "common.save": { zh: "保存", en: "Save" },
  "common.create": { zh: "创建", en: "Create" },
  "common.delete": { zh: "删除", en: "Delete" },
  "common.edit": { zh: "编辑", en: "Edit" },
  "common.enable": { zh: "启用", en: "Enable" },
  "common.disable": { zh: "禁用", en: "Disable" },
  "common.enabled": { zh: "启用", en: "Active" },
  "common.disabled": { zh: "禁用", en: "Disabled" },
  "common.submitting": { zh: "提交中...", en: "Submitting…" },
  "common.loading": { zh: "加载中...", en: "Loading…" },
  "common.actions": { zh: "操作", en: "Actions" },
  "common.created": { zh: "创建", en: "Created" },
  "common.createdAt": { zh: "创建时间", en: "Created at" },
  "common.status": { zh: "状态", en: "Status" },
  "common.allStatuses": { zh: "全部状态", en: "All statuses" },
  "common.empty": { zh: "暂无数据", en: "No data" },
  "common.previous": { zh: "上一页", en: "Previous" },
  "common.next": { zh: "下一页", en: "Next" },
  "common.collapse": { zh: "收起", en: "Collapse" },
  "common.details": { zh: "详情", en: "Details" },
  "common.failed": { zh: "操作失败", en: "Operation failed" },
  "common.saved": { zh: "已保存", en: "Saved" },
  "common.created_ok": { zh: "已创建", en: "Created" },

  // language
  "lang.label": { zh: "语言", en: "Language" },
  "lang.zh": { zh: "中文", en: "Chinese" },
  "lang.en": { zh: "English", en: "English" },

  // layout / nav
  "app.title": { zh: "(Red) 管理后台", en: "(Red) Admin Console" },
  "app.subtitle": { zh: "Inspection Admin", en: "Inspection Admin" },
  "nav.dashboard": { zh: "仪表盘", en: "Dashboard" },
  "nav.users": { zh: "用户管理", en: "Users" },
  "nav.tasks": { zh: "任务管理", en: "Tasks" },
  "nav.reports": { zh: "报告管理", en: "Reports" },
  "nav.businesses": { zh: "商户管理", en: "Businesses" },
  "nav.admins": { zh: "管理员/角色", en: "Admins / Roles" },
  "nav.audit": { zh: "操作日志", en: "Audit log" },
  "layout.logout": { zh: "退出", en: "Log out" },
  "layout.changePassword": { zh: "改密", en: "Password" },

  // change password dialog
  "cp.title": { zh: "修改密码", en: "Change password" },
  "cp.current": { zh: "当前密码", en: "Current password" },
  "cp.new": { zh: "新密码", en: "New password" },
  "cp.minLen": { zh: "新密码至少 6 位", en: "New password must be at least 6 chars" },
  "cp.success": { zh: "密码已修改", en: "Password changed" },
  "cp.failed": { zh: "修改失败", en: "Change failed" },

  // login
  "login.title": { zh: "(Red) 管理后台登录", en: "(Red) Admin Sign-in" },
  "login.hint": { zh: "默认账号 admin / admin123", en: "Default account: admin / admin123" },
  "login.username": { zh: "用户名", en: "Username" },
  "login.password": { zh: "密码", en: "Password" },
  "login.submit": { zh: "登录", en: "Sign in" },
  "login.submitting": { zh: "登录中...", en: "Signing in…" },
  "login.failed": { zh: "登录失败", en: "Sign-in failed" },
  "login.failedDesc": { zh: "请检查账号密码", en: "Please check your credentials" },

  // dashboard
  "dash.title": { zh: "仪表盘", en: "Dashboard" },
  "dash.desc": { zh: "平台运营概览", en: "Platform overview" },
  "dash.users": { zh: "技术员账号", en: "Technicians" },
  "dash.tasks": { zh: "任务总数", en: "Tasks total" },
  "dash.pending": { zh: "待处理任务", en: "Pending tasks" },
  "dash.reports": { zh: "报告总数", en: "Reports total" },
  "dash.reportsToday": { zh: "今日新增报告", en: "Reports today" },
  "dash.businesses": { zh: "已注册商户", en: "Businesses" },
  "dash.trend": { zh: "报告生成趋势", en: "Report trend" },
  "dash.granularity.day": { zh: "日", en: "Day" },
  "dash.granularity.week": { zh: "周", en: "Week" },
  "dash.granularity.month": { zh: "月", en: "Month" },
  "dash.range.day": { zh: "近 14 天", en: "Last 14 days" },
  "dash.range.week": { zh: "近 12 周", en: "Last 12 weeks" },
  "dash.range.month": { zh: "近 12 个月", en: "Last 12 months" },

  // users
  "users.title": { zh: "用户管理", en: "Users" },
  "users.desc": { zh: "管理移动端注册的技术员账号", en: "Technicians registered through the mobile app" },
  "users.searchEmail": { zh: "搜索邮箱", en: "Search by email" },
  "users.col.email": { zh: "邮箱", en: "Email" },
  "users.col.name": { zh: "姓名", en: "Name" },
  "users.col.empId": { zh: "员工号", en: "Employee #" },
  "users.col.business": { zh: "商户", en: "Business" },
  "users.col.phone": { zh: "电话", en: "Phone" },
  "users.col.registered": { zh: "注册时间", en: "Registered" },
  "users.empty": { zh: "暂无用户", en: "No users" },
  "users.resetPwBtn": { zh: "重置密码", en: "Reset password" },
  "users.resetTitle": { zh: "重置 {email} 的密码", en: "Reset password for {email}" },
  "users.resetMin": { zh: "密码至少 6 位", en: "Password must be at least 6 chars" },
  "users.resetOk": { zh: "已重置 {email} 的密码", en: "Password reset for {email}" },
  "users.resetConfirm": { zh: "确认重置", en: "Confirm reset" },
  "users.resetFailed": { zh: "重置失败", en: "Reset failed" },

  // tasks
  "tasks.title": { zh: "任务管理", en: "Tasks" },
  "tasks.desc": { zh: "跨用户查看与管理所有巡检任务", en: "View and manage inspection tasks across all users" },
  "tasks.search": { zh: "搜索任务名/编号/地址", en: "Search title / ID / address" },
  "tasks.statusPending": { zh: "待处理", en: "Pending" },
  "tasks.statusCompleted": { zh: "已完成", en: "Completed" },
  "tasks.col.title": { zh: "任务名", en: "Title" },
  "tasks.col.id": { zh: "任务编号", en: "Task #" },
  "tasks.col.address": { zh: "地址", en: "Address" },
  "tasks.col.client": { zh: "客户", en: "Client" },
  "tasks.col.owner": { zh: "负责人", en: "Owner" },
  "tasks.col.business": { zh: "商户", en: "Business" },
  "tasks.markPending": { zh: "标为待处理", en: "Mark pending" },
  "tasks.markDone": { zh: "标为完成", en: "Mark done" },
  "tasks.deleteConfirm": { zh: "确定删除任务 “{title}” 吗？", en: "Delete task “{title}”?" },
  "tasks.deleted": { zh: "已删除任务", en: "Task deleted" },
  "tasks.empty": { zh: "暂无任务", en: "No tasks" },

  // reports
  "reports.title": { zh: "报告管理", en: "Reports" },
  "reports.desc": { zh: "查看所有用户提交的巡检报告", en: "View all inspection reports submitted by users" },
  "reports.search": { zh: "搜索报告/任务名", en: "Search report / task" },
  "reports.col.task": { zh: "任务", en: "Task" },
  "reports.col.id": { zh: "报告编号", en: "Report #" },
  "reports.col.devices": { zh: "设备数", en: "Devices" },
  "reports.col.address": { zh: "地址", en: "Address" },
  "reports.col.submitter": { zh: "提交人", en: "Submitter" },
  "reports.col.business": { zh: "商户", en: "Business" },
  "reports.col.submittedAt": { zh: "提交时间", en: "Submitted" },
  "reports.viewHtml": { zh: "查看 HTML", en: "View HTML" },
  "reports.empty": { zh: "暂无报告", en: "No reports" },

  // businesses
  "biz.title": { zh: "商户管理", en: "Businesses" },
  "biz.desc": { zh: "维护可用的商户编号 (Business ID)", en: "Manage available Business IDs" },
  "biz.add": { zh: "+ 新增商户", en: "+ Add business" },
  "biz.col.code": { zh: "编号", en: "Code" },
  "biz.col.name": { zh: "名称", en: "Name" },
  "biz.codeRequired": { zh: "请填写商户编号", en: "Please enter a business code" },
  "biz.deleteConfirm": { zh: "删除商户 {code} 吗？", en: "Delete business {code}?" },
  "biz.deleted": { zh: "已删除商户", en: "Business deleted" },
  "biz.codeExample": { zh: "例如 BUS-12345", en: "e.g. BUS-12345" },

  // admins / roles
  "admins.title": { zh: "管理员 / 角色", en: "Admins / Roles" },
  "admins.desc": { zh: "管理后台账号与权限角色", en: "Manage admin accounts and permission roles" },
  "admins.tabAdmins": { zh: "管理员", en: "Admins" },
  "admins.tabRoles": { zh: "角色", en: "Roles" },
  "admins.allAdmins": { zh: "所有管理员", en: "All admins" },
  "admins.add": { zh: "+ 新增管理员", en: "+ Add admin" },
  "admins.editTitle": { zh: "编辑管理员 {name}", en: "Edit admin {name}" },
  "admins.col.username": { zh: "用户名", en: "Username" },
  "admins.col.displayName": { zh: "显示名", en: "Display name" },
  "admins.col.roles": { zh: "角色", en: "Roles" },
  "admins.deleted": { zh: "已删除管理员", en: "Admin deleted" },
  "admins.created": { zh: "已创建管理员", en: "Admin created" },
  "admins.deleteConfirm": { zh: "删除管理员 {name}？", en: "Delete admin {name}?" },
  "admins.userPwReq": { zh: "用户名必填，密码至少 6 位", en: "Username required and password ≥ 6 chars" },
  "admins.password": { zh: "密码", en: "Password" },
  "admins.newPwBlank": { zh: "新密码（不改请留空）", en: "New password (leave blank to keep)" },

  "roles.allRoles": { zh: "所有角色", en: "All roles" },
  "roles.add": { zh: "+ 新增角色", en: "+ Add role" },
  "roles.created": { zh: "已创建角色", en: "Role created" },
  "roles.deleted": { zh: "已删除角色", en: "Role deleted" },
  "roles.deleteConfirm": { zh: "删除角色 {name}？", en: "Delete role {name}?" },
  "roles.editTitle": { zh: "编辑角色 {name}", en: "Edit role {name}" },
  "roles.nameRequired": { zh: "请填角色名", en: "Please enter a role name" },
  "roles.col.name": { zh: "名称", en: "Name" },
  "roles.col.desc": { zh: "描述", en: "Description" },
  "roles.col.perms": { zh: "权限", en: "Permissions" },
  "roles.col.system": { zh: "系统", en: "System" },
  "roles.systemBadge": { zh: "系统", en: "System" },

  // audit
  "audit.title": { zh: "操作日志", en: "Audit log" },
  "audit.desc": { zh: "管理员操作审计追踪", en: "Admin action audit trail" },
  "audit.col.time": { zh: "时间", en: "Time" },
  "audit.col.actor": { zh: "操作员", en: "Actor" },
  "audit.col.action": { zh: "动作", en: "Action" },
  "audit.col.resource": { zh: "资源", en: "Resource" },
  "audit.col.resourceId": { zh: "资源 ID", en: "Resource ID" },
  "audit.col.ip": { zh: "IP", en: "IP" },
  "audit.empty": { zh: "暂无日志", en: "No logs" },
  "audit.page": { zh: "第 {n} 页", en: "Page {n}" },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Lang | null;
    return saved === "en" ? "en" : "zh";
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);
  function t(key: string, vars?: Record<string, string | number>) {
    const entry = dict[key];
    let raw = entry ? entry[lang] : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return raw;
  }
  return (
    <LangCtx.Provider value={{ lang, setLang: setLangState, t }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useT() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useT must be used inside <LangProvider>");
  return ctx;
}
