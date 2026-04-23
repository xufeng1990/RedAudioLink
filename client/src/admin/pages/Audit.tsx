import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../AdminLayout";
import { useT } from "../lib/i18n";
import { Card } from "@/components/ui/card";
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

type Log = {
  id: string;
  adminId: string | null;
  adminUsername: string;
  action: string;
  resource: string;
  resourceId: string;
  detail: any;
  ip: string;
  status: number;
  createdAt: string;
};

const PAGE_SIZE = 50;

export function AuditPage() {
  const [offset, setOffset] = useState(0);
  const { t } = useT();
  const { data, isLoading } = useQuery<{ logs: Log[] }>({
    queryKey: ["/audit", { limit: String(PAGE_SIZE), offset: String(offset) }],
  });
  const logs = data?.logs ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title={t("audit.title")} description={t("audit.desc")} />
      <Card className="border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("audit.col.time")}</TableHead>
              <TableHead>{t("audit.col.actor")}</TableHead>
              <TableHead>{t("audit.col.action")}</TableHead>
              <TableHead>{t("audit.col.resource")}</TableHead>
              <TableHead>{t("audit.col.resourceId")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("audit.col.ip")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : logs.length ? (
              logs.map((l) => (
                <Fragment key={l.id}>
                  <TableRow>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{l.adminUsername || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{l.action}</TableCell>
                    <TableCell>{l.resource}</TableCell>
                    <TableCell className="text-xs">{l.resourceId || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          l.status >= 500
                            ? "bg-red-600"
                            : l.status >= 400
                              ? "bg-amber-500"
                              : "bg-green-600"
                        }
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.ip}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpanded((p) => (p === l.id ? null : l.id))}
                      >
                        {expanded === l.id ? t("common.collapse") : t("common.details")}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded === l.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-slate-50">
                        <pre className="text-xs whitespace-pre-wrap break-all">
                          {JSON.stringify(l.detail, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                  {t("audit.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            {t("common.previous")}
          </Button>
          <span className="text-xs text-slate-500">
            {t("audit.page", { n: Math.floor(offset / PAGE_SIZE) + 1 })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={logs.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            {t("common.next")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
