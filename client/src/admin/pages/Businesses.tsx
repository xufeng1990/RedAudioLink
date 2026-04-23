import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "../AdminLayout";
import { adminApi } from "../lib/api";
import { adminQueryClient as queryClient } from "../lib/queryClient";
import { useAdminAuth } from "../lib/AuthContext";
import { useT } from "../lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Biz = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
};

export function BusinessesPage() {
  const { hasPerm } = useAdminAuth();
  const { t } = useT();
  const { data } = useQuery<{ businesses: Biz[] }>({
    queryKey: ["/businesses"],
  });
  const { toast } = useToast();

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi("DELETE", `/businesses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/businesses"] });
      toast({ title: t("biz.deleted") });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async (b: Biz) =>
      adminApi("PATCH", `/businesses/${b.id}`, {
        status: b.status === "active" ? "disabled" : "active",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/businesses"] }),
  });

  return (
    <div>
      <PageHeader
        title={t("biz.title")}
        description={t("biz.desc")}
        actions={hasPerm("businesses.write") && <CreateBusinessButton />}
      />
      <Card className="border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("biz.col.code")}</TableHead>
              <TableHead>{t("biz.col.name")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.created")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.businesses.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.code}</TableCell>
                <TableCell>{b.name || "-"}</TableCell>
                <TableCell>
                  <Badge
                    className={b.status === "active" ? "bg-green-600" : ""}
                    variant={b.status === "active" ? "default" : "secondary"}
                  >
                    {b.status === "active" ? t("common.enabled") : t("common.disabled")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(b.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {hasPerm("businesses.write") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggle.mutate(b)}
                        data-testid={`button-toggle-biz-${b.id}`}
                      >
                        {b.status === "active" ? t("common.disable") : t("common.enable")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(t("biz.deleteConfirm", { code: b.code }))) {
                            remove.mutate(b.id);
                          }
                        }}
                        data-testid={`button-delete-biz-${b.id}`}
                      >
                        {t("common.delete")}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CreateBusinessButton() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();
  async function submit() {
    if (!code.trim()) {
      toast({ title: t("biz.codeRequired"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await adminApi("POST", "/businesses", { code: code.trim(), name: name.trim() });
      queryClient.invalidateQueries({ queryKey: ["/businesses"] });
      setOpen(false);
      setCode("");
      setName("");
      toast({ title: t("common.created_ok") });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-business">{t("biz.add")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("biz.add").replace(/^\+\s*/, "")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("biz.col.code")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("biz.codeExample")}
              data-testid="input-biz-code"
            />
          </div>
          <div>
            <Label>{t("biz.col.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-biz-name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy} data-testid="button-create-biz">
            {busy ? t("common.submitting") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
