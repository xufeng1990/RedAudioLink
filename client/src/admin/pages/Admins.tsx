import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "../AdminLayout";
import { adminApi } from "../lib/api";
import { adminQueryClient as queryClient } from "../lib/queryClient";
import { useAdminAuth } from "../lib/AuthContext";
import { useT } from "../lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdminRow = {
  id: string;
  username: string;
  displayName: string;
  status: string;
  createdAt: string;
  roles: { id: string; name: string }[];
};
type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: string;
};

export function AdminsPage() {
  const { t } = useT();
  return (
    <div>
      <PageHeader title={t("admins.title")} description={t("admins.desc")} />
      <Tabs defaultValue="admins" className="w-full">
        <TabsList>
          <TabsTrigger value="admins" data-testid="tab-admins">{t("admins.tabAdmins")}</TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">{t("admins.tabRoles")}</TabsTrigger>
        </TabsList>
        <TabsContent value="admins" className="mt-4">
          <AdminListTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminListTab() {
  const { hasPerm, admin: me } = useAdminAuth();
  const { t } = useT();
  const { data } = useQuery<{ admins: AdminRow[] }>({ queryKey: ["/admins"] });
  const { data: rolesData } = useQuery<{ roles: Role[]; allPermissions: string[] }>(
    { queryKey: ["/roles"] },
  );
  const { toast } = useToast();

  const remove = useMutation({
    mutationFn: async (id: string) => adminApi("DELETE", `/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admins"] });
      toast({ title: t("admins.deleted") });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });
  const toggle = useMutation({
    mutationFn: async (a: AdminRow) =>
      adminApi("PATCH", `/admins/${a.id}`, {
        status: a.status === "active" ? "disabled" : "active",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/admins"] }),
  });

  const [editing, setEditing] = useState<AdminRow | null>(null);

  return (
    <Card className="border bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t("admins.allAdmins")}</CardTitle>
        {hasPerm("admins.write") && (
          <CreateAdminButton roles={rolesData?.roles ?? []} />
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admins.col.username")}</TableHead>
              <TableHead>{t("admins.col.displayName")}</TableHead>
              <TableHead>{t("admins.col.roles")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.created")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.username}</TableCell>
                <TableCell>{a.displayName || "-"}</TableCell>
                <TableCell className="space-x-1">
                  {a.roles.map((r) => (
                    <Badge key={r.id} variant="secondary">
                      {r.name}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell>
                  <Badge
                    className={a.status === "active" ? "bg-green-600" : ""}
                    variant={a.status === "active" ? "default" : "secondary"}
                  >
                    {a.status === "active" ? t("common.enabled") : t("common.disabled")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(a.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {hasPerm("admins.write") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(a)}
                      >
                        {t("common.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggle.mutate(a)}
                      >
                        {a.status === "active" ? t("common.disable") : t("common.enable")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={a.id === me?.id}
                        onClick={() => {
                          if (confirm(t("admins.deleteConfirm", { name: a.username }))) {
                            remove.mutate(a.id);
                          }
                        }}
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
        <EditAdminDialog
          admin={editing}
          onClose={() => setEditing(null)}
          roles={rolesData?.roles ?? []}
        />
      </CardContent>
    </Card>
  );
}

function CreateAdminButton({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [d, setD] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();

  async function submit() {
    if (!u || p.length < 6) {
      toast({ title: t("admins.userPwReq"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await adminApi("POST", "/admins", {
        username: u,
        password: p,
        displayName: d,
        roleIds,
      });
      queryClient.invalidateQueries({ queryKey: ["/admins"] });
      setOpen(false);
      setU(""); setP(""); setD(""); setRoleIds([]);
      toast({ title: t("admins.created") });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-admin">{t("admins.add")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admins.add").replace(/^\+\s*/, "")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("admins.col.username")}</Label>
            <Input value={u} onChange={(e) => setU(e.target.value)} data-testid="input-new-admin-username" />
          </div>
          <div>
            <Label>{t("admins.password")}</Label>
            <Input type="password" value={p} onChange={(e) => setP(e.target.value)} data-testid="input-new-admin-password" />
          </div>
          <div>
            <Label>{t("admins.col.displayName")}</Label>
            <Input value={d} onChange={(e) => setD(e.target.value)} />
          </div>
          <div>
            <Label>{t("admins.col.roles")}</Label>
            <div className="space-y-1 mt-2">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={roleIds.includes(r.id)}
                    onCheckedChange={(c) => {
                      setRoleIds((prev) =>
                        c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                      );
                    }}
                  />
                  <span>{r.name}</span>
                  <span className="text-xs text-slate-500">{r.description}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy} data-testid="button-create-admin">
            {busy ? t("common.submitting") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAdminDialog({
  admin,
  onClose,
  roles,
}: {
  admin: AdminRow | null;
  onClose: () => void;
  roles: Role[];
}) {
  const [d, setD] = useState("");
  const [pw, setPw] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();

  async function submit() {
    if (!admin) return;
    setBusy(true);
    try {
      const body: any = { displayName: d, roleIds };
      if (pw) {
        if (pw.length < 6) {
          toast({ title: t("users.resetMin"), variant: "destructive" });
          setBusy(false);
          return;
        }
        body.password = pw;
      }
      await adminApi("PATCH", `/admins/${admin.id}`, body);
      queryClient.invalidateQueries({ queryKey: ["/admins"] });
      toast({ title: t("common.saved") });
      setPw("");
      onClose();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!admin}
      onOpenChange={(o) => {
        if (!o) onClose();
        else if (admin) {
          setD(admin.displayName);
          setRoleIds(admin.roles.map((r) => r.id));
          setPw("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {admin ? t("admins.editTitle", { name: admin.username }) : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("admins.col.displayName")}</Label>
            <Input value={d} onChange={(e) => setD(e.target.value)} />
          </div>
          <div>
            <Label>{t("admins.newPwBlank")}</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <Label>{t("admins.col.roles")}</Label>
            <div className="space-y-1 mt-2">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={roleIds.includes(r.id)}
                    onCheckedChange={(c) => {
                      setRoleIds((prev) =>
                        c ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                      );
                    }}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? t("common.submitting") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesTab() {
  const { hasPerm } = useAdminAuth();
  const { t } = useT();
  const { data } = useQuery<{ roles: Role[]; allPermissions: string[] }>({
    queryKey: ["/roles"],
  });
  const { toast } = useToast();
  const remove = useMutation({
    mutationFn: async (id: string) => adminApi("DELETE", `/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/roles"] });
      toast({ title: t("roles.deleted") });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });
  const [editing, setEditing] = useState<Role | null>(null);

  return (
    <Card className="border bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t("roles.allRoles")}</CardTitle>
        {hasPerm("admins.write") && (
          <CreateRoleButton allPerms={data?.allPermissions ?? []} />
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("roles.col.name")}</TableHead>
              <TableHead>{t("roles.col.desc")}</TableHead>
              <TableHead>{t("roles.col.perms")}</TableHead>
              <TableHead>{t("roles.col.system")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {r.description}
                </TableCell>
                <TableCell className="text-xs">
                  {(r.permissions ?? []).join(", ")}
                </TableCell>
                <TableCell>
                  {r.isSystem === "true" ? (
                    <Badge variant="secondary">{t("roles.systemBadge")}</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {hasPerm("admins.write") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                        {t("common.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={r.isSystem === "true"}
                        onClick={() => {
                          if (confirm(t("roles.deleteConfirm", { name: r.name }))) remove.mutate(r.id);
                        }}
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
        <EditRoleDialog
          role={editing}
          onClose={() => setEditing(null)}
          allPerms={data?.allPermissions ?? []}
        />
      </CardContent>
    </Card>
  );
}

function CreateRoleButton({ allPerms }: { allPerms: string[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();
  async function submit() {
    if (!name.trim()) return toast({ title: t("roles.nameRequired"), variant: "destructive" });
    setBusy(true);
    try {
      await adminApi("POST", "/roles", {
        name: name.trim(),
        description: desc.trim(),
        permissions: perms,
      });
      queryClient.invalidateQueries({ queryKey: ["/roles"] });
      setOpen(false); setName(""); setDesc(""); setPerms([]);
      toast({ title: t("roles.created") });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-role">{t("roles.add")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("roles.add").replace(/^\+\s*/, "")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("roles.col.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("roles.col.desc")}</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <Label>{t("roles.col.perms")}</Label>
            <PermissionMatrix all={allPerms} value={perms} onChange={setPerms} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={busy}>{busy ? t("common.submitting") : t("common.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({
  role,
  onClose,
  allPerms,
}: {
  role: Role | null;
  onClose: () => void;
  allPerms: string[];
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { t } = useT();
  async function submit() {
    if (!role) return;
    setBusy(true);
    try {
      await adminApi("PATCH", `/roles/${role.id}`, {
        name, description: desc, permissions: perms,
      });
      queryClient.invalidateQueries({ queryKey: ["/roles"] });
      toast({ title: t("common.saved") });
      onClose();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!role}
      onOpenChange={(o) => {
        if (!o) onClose();
        else if (role) {
          setName(role.name);
          setDesc(role.description);
          setPerms(role.permissions ?? []);
        }
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {role ? t("roles.editTitle", { name: role.name }) : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("roles.col.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={role?.isSystem === "true"} />
          </div>
          <div>
            <Label>{t("roles.col.desc")}</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <Label>{t("roles.col.perms")}</Label>
            <PermissionMatrix all={allPerms} value={perms} onChange={setPerms} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={busy}>{busy ? t("common.submitting") : t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionMatrix({
  all,
  value,
  onChange,
}: {
  all: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const groups: Record<string, string[]> = {};
  for (const p of all) {
    const [g] = p.split(".");
    (groups[g] ||= []).push(p);
  }
  return (
    <div className="space-y-2 mt-2 border rounded p-3 bg-slate-50">
      {Object.entries(groups).map(([g, perms]) => (
        <div key={g}>
          <div className="text-xs font-medium text-slate-600 mb-1">{g}</div>
          <div className="flex flex-wrap gap-3">
            {perms.map((p) => (
              <label key={p} className="flex items-center gap-1 text-sm">
                <Checkbox
                  checked={value.includes(p)}
                  onCheckedChange={(c) =>
                    onChange(c ? [...value, p] : value.filter((x) => x !== p))
                  }
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
