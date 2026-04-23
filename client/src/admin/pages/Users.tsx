import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "../AdminLayout";
import { adminApi } from "../lib/api";
import { adminQueryClient as queryClient } from "../lib/queryClient";
import { useAdminAuth } from "../lib/AuthContext";
import { useT } from "../lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  email: string;
  businessId: string;
  status: string;
  createdAt: string;
  employeeName: string | null;
  employeeId: string | null;
  telephoneNumber: string | null;
};

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { hasPerm } = useAdminAuth();
  const { t } = useT();

  const { data, isLoading } = useQuery<{ users: Row[] }>({
    queryKey: ["/users", { search, status: statusFilter }],
  });

  const toggleStatus = useMutation({
    mutationFn: async (u: Row) =>
      adminApi("PATCH", `/users/${u.id}`, {
        status: u.status === "active" ? "disabled" : "active",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/users"] }),
  });

  const [resetTarget, setResetTarget] = useState<Row | null>(null);

  return (
    <div>
      <PageHeader title={t("users.title")} description={t("users.desc")} />
      <Card className="border bg-white mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder={t("users.searchEmail")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-users"
          />
          <select
            className="border rounded px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="select-status-filter"
          >
            <option value="">{t("common.allStatuses")}</option>
            <option value="active">{t("common.enable")}</option>
            <option value="disabled">{t("common.disable")}</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.col.email")}</TableHead>
              <TableHead>{t("users.col.name")}</TableHead>
              <TableHead>{t("users.col.empId")}</TableHead>
              <TableHead>{t("users.col.business")}</TableHead>
              <TableHead>{t("users.col.phone")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("users.col.registered")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.users.length ? (
              data.users.map((u) => (
                <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.employeeName || "-"}</TableCell>
                  <TableCell>{u.employeeId || "-"}</TableCell>
                  <TableCell>{u.businessId}</TableCell>
                  <TableCell>{u.telephoneNumber || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "active" ? "default" : "secondary"}
                      className={u.status === "active" ? "bg-green-600" : ""}
                    >
                      {u.status === "active" ? t("common.enabled") : t("common.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {hasPerm("users.write") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus.mutate(u)}
                          data-testid={`button-toggle-${u.id}`}
                        >
                          {u.status === "active" ? t("common.disable") : t("common.enable")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetTarget(u)}
                          data-testid={`button-reset-${u.id}`}
                        >
                          {t("users.resetPwBtn")}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-10">
                  {t("users.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </div>
  );
}

function ResetPasswordDialog({
  target,
  onClose,
}: {
  target: Row | null;
  onClose: () => void;
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();
  async function submit() {
    if (!target) return;
    if (pw.length < 6) {
      toast({ title: t("users.resetMin"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await adminApi("POST", `/users/${target.id}/reset-password`, {
        newPassword: pw,
      });
      toast({ title: t("users.resetOk", { email: target.email }) });
      setPw("");
      onClose();
    } catch (e: any) {
      toast({ title: e.message || t("users.resetFailed"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target ? t("users.resetTitle", { email: target.email }) : ""}
          </DialogTitle>
        </DialogHeader>
        <div>
          <Label>{t("cp.new")}</Label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            data-testid="input-reset-password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy} data-testid="button-confirm-reset">
            {busy ? t("common.submitting") : t("users.resetConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
