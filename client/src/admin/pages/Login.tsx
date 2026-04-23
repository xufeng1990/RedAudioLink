import { useState } from "react";
import { useAdminAuth } from "../lib/AuthContext";
import { useT } from "../lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Languages } from "lucide-react";

export function AdminLogin() {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t, lang, setLang } = useT();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      toast({
        title: t("login.failed"),
        description: err.message || t("login.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      <button
        type="button"
        onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        className="absolute top-4 right-4 flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200"
        data-testid="button-lang-toggle-login"
      >
        <Languages className="w-3.5 h-3.5" />
        {lang === "zh" ? "EN" : "中"}
      </button>
      <Card className="w-full max-w-sm border bg-white shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">{t("login.title")}</CardTitle>
          <p className="text-xs text-slate-500 mt-1">{t("login.hint")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>{t("login.username")}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                data-testid="input-username"
              />
            </div>
            <div>
              <Label>{t("login.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-2"
              disabled={busy}
              data-testid="button-login"
            >
              {busy ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
