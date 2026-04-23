import { Link, useLocation } from "wouter";
import { useAdminAuth } from "./lib/AuthContext";
import { useT } from "./lib/i18n";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Building2,
  ShieldCheck,
  History,
  LogOut,
  KeyRound,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "./lib/api";

const NAV = [
  { href: "/admin/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, perm: "dashboard.read" },
  { href: "/admin/users", labelKey: "nav.users", icon: Users, perm: "users.read" },
  { href: "/admin/tasks", labelKey: "nav.tasks", icon: ClipboardList, perm: "tasks.read" },
  { href: "/admin/reports", labelKey: "nav.reports", icon: FileText, perm: "reports.read" },
  { href: "/admin/businesses", labelKey: "nav.businesses", icon: Building2, perm: "businesses.read" },
  { href: "/admin/admins", labelKey: "nav.admins", icon: ShieldCheck, perm: "admins.read" },
  { href: "/admin/audit", labelKey: "nav.audit", icon: History, perm: "audit.read" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, logout, hasPerm } = useAdminAuth();
  const [location] = useLocation();
  const { t, lang, setLang } = useT();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">{t("app.title")}</div>
            <div className="text-xs text-slate-400 mt-1">{t("app.subtitle")}</div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
            title={t("lang.label")}
            data-testid="button-lang-toggle"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "zh" ? "EN" : "中"}
          </button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV.filter((n) => hasPerm(n.perm)).map((n) => {
            const active = location === n.href || location.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
                data-testid={`nav-${n.href.replace("/admin/", "")}`}
              >
                <Icon className="w-4 h-4" />
                {t(n.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 text-sm">
          <div className="px-2 pb-2 text-slate-300" data-testid="text-admin-username">
            {admin?.displayName || admin?.username}
          </div>
          <div className="px-2 pb-3 text-xs text-slate-500">
            {admin?.roles.map((r) => r.name).join(", ")}
          </div>
          <div className="flex gap-2">
            <ChangePasswordButton />
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-slate-200 hover:text-white hover:bg-slate-800"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-1" /> {t("layout.logout")}
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}

function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();
  async function submit() {
    if (newPw.length < 6) {
      toast({ title: t("cp.minLen"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await adminApi("POST", "/auth/change-password", {
        oldPassword: oldPw,
        newPassword: newPw,
      });
      toast({ title: t("cp.success") });
      setOpen(false);
      setOldPw("");
      setNewPw("");
    } catch (e: any) {
      toast({ title: e.message || t("cp.failed"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-slate-200 hover:text-white hover:bg-slate-800"
          data-testid="button-change-password"
        >
          <KeyRound className="w-4 h-4 mr-1" /> {t("layout.changePassword")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cp.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("cp.current")}</Label>
            <Input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              data-testid="input-old-password"
            />
          </div>
          <div>
            <Label>{t("cp.new")}</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy} data-testid="button-submit-password">
            {busy ? t("common.submitting") : t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-page-title">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
