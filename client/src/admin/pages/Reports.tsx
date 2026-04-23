import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../AdminLayout";
import { getAdminToken } from "../lib/api";
import { useT } from "../lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  taskId: string;
  taskNumber: string;
  deviceCount: number;
  createdAt: string;
  taskTitle: string;
  taskAddress: string;
  userEmail: string;
  businessId: string;
};

export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const { t } = useT();

  const { data, isLoading } = useQuery<{ reports: Row[] }>({
    queryKey: ["/reports", { search, fromDate }],
  });

  function viewHtml(id: string) {
    const token = getAdminToken();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><title>Report</title><style>html,body,iframe{margin:0;padding:0;height:100%;width:100%;border:0}</style></head><body><p style="padding:1rem;font-family:sans-serif;color:#666">Loading…</p></body></html>`,
    );
    fetch(`/admin/api/reports/${id}/html`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.text())
      .then((html) => {
        const iframe = w.document.createElement("iframe");
        iframe.setAttribute("sandbox", "allow-popups allow-modals");
        iframe.srcdoc = html;
        w.document.body.innerHTML = "";
        w.document.body.appendChild(iframe);
      })
      .catch(() => {
        w.document.body.innerHTML =
          '<p style="padding:1rem;color:#a00">Failed to load report.</p>';
      });
  }

  return (
    <div>
      <PageHeader title={t("reports.title")} description={t("reports.desc")} />
      <Card className="border bg-white mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Input
            placeholder={t("reports.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-reports"
          />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="max-w-[180px]"
            data-testid="input-from-date"
          />
        </CardContent>
      </Card>
      <Card className="border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.col.task")}</TableHead>
              <TableHead>{t("reports.col.id")}</TableHead>
              <TableHead>{t("reports.col.devices")}</TableHead>
              <TableHead>{t("reports.col.address")}</TableHead>
              <TableHead>{t("reports.col.submitter")}</TableHead>
              <TableHead>{t("reports.col.business")}</TableHead>
              <TableHead>{t("reports.col.submittedAt")}</TableHead>
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
            ) : data?.reports.length ? (
              data.reports.map((r) => (
                <TableRow key={r.id} data-testid={`row-report-${r.id}`}>
                  <TableCell className="font-medium">{r.taskTitle}</TableCell>
                  <TableCell>{r.taskNumber || "-"}</TableCell>
                  <TableCell>{r.deviceCount}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.taskAddress}</TableCell>
                  <TableCell className="text-xs">{r.userEmail}</TableCell>
                  <TableCell>{r.businessId}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewHtml(r.id)}
                      data-testid={`button-view-report-${r.id}`}
                    >
                      {t("reports.viewHtml")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-10">
                  {t("reports.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
