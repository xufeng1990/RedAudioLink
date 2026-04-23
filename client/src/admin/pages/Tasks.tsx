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
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  userId: string;
  title: string;
  taskId: string;
  address: string;
  stateProvince: string;
  postalCode: string;
  client: string;
  status: string;
  createdAt: string;
  userEmail: string;
  businessId: string;
};

export function TasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { hasPerm } = useAdminAuth();
  const { toast } = useToast();
  const { t } = useT();

  const { data, isLoading } = useQuery<{ tasks: Row[] }>({
    queryKey: ["/tasks", { search, status: statusFilter }],
  });

  const toggleStatus = useMutation({
    mutationFn: async (tk: Row) =>
      adminApi("PATCH", `/tasks/${tk.id}`, {
        status: tk.status === "completed" ? "pending" : "completed",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (tk: Row) => adminApi("DELETE", `/tasks/${tk.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/tasks"] });
      toast({ title: t("tasks.deleted") });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div>
      <PageHeader title={t("tasks.title")} description={t("tasks.desc")} />
      <Card className="border bg-white mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder={t("tasks.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-tasks"
          />
          <select
            className="border rounded px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="select-task-status"
          >
            <option value="">{t("common.allStatuses")}</option>
            <option value="pending">{t("tasks.statusPending")}</option>
            <option value="completed">{t("tasks.statusCompleted")}</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tasks.col.title")}</TableHead>
              <TableHead>{t("tasks.col.id")}</TableHead>
              <TableHead>{t("tasks.col.address")}</TableHead>
              <TableHead>{t("tasks.col.client")}</TableHead>
              <TableHead>{t("tasks.col.owner")}</TableHead>
              <TableHead>{t("tasks.col.business")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.created")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.tasks.length ? (
              data.tasks.map((tk) => (
                <TableRow key={tk.id} data-testid={`row-task-${tk.id}`}>
                  <TableCell className="font-medium">{tk.title}</TableCell>
                  <TableCell>{tk.taskId}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={tk.address}>
                    {tk.address}
                  </TableCell>
                  <TableCell>{tk.client || "-"}</TableCell>
                  <TableCell className="text-xs">{tk.userEmail}</TableCell>
                  <TableCell>{tk.businessId}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        tk.status === "completed" ? "bg-green-600" : "bg-amber-500"
                      }
                    >
                      {tk.status === "completed"
                        ? t("tasks.statusCompleted")
                        : t("tasks.statusPending")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(tk.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {hasPerm("tasks.write") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus.mutate(tk)}
                          data-testid={`button-toggle-task-${tk.id}`}
                        >
                          {tk.status === "completed"
                            ? t("tasks.markPending")
                            : t("tasks.markDone")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm(t("tasks.deleteConfirm", { title: tk.title }))) {
                              remove.mutate(tk);
                            }
                          }}
                          data-testid={`button-delete-task-${tk.id}`}
                        >
                          {t("common.delete")}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-slate-500 py-10">
                  {t("tasks.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
