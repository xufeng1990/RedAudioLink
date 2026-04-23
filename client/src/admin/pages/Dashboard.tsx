import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../AdminLayout";
import { useT } from "../lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  ClipboardList,
  FileText,
  Building2,
  Clock,
  CalendarCheck,
} from "lucide-react";

type Granularity = "day" | "week" | "month";

type Stats = {
  users: number;
  tasks: number;
  pendingTasks: number;
  reports: number;
  reportsToday: number;
  businesses: number;
  granularity: Granularity;
  trend: { day: string; count: number }[];
};

export function Dashboard() {
  const { t } = useT();
  const [granularity, setGranularity] = useState<Granularity>("week");

  const { data, isLoading, isFetching } = useQuery<Stats>({
    queryKey: ["/dashboard/stats", granularity],
  });

  const cards = [
    {
      key: "users",
      label: t("dash.users"),
      value: data?.users,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      key: "tasks",
      label: t("dash.tasks"),
      value: data?.tasks,
      icon: ClipboardList,
      color: "text-amber-600 bg-amber-50",
    },
    {
      key: "pending",
      label: t("dash.pending"),
      value: data?.pendingTasks,
      icon: Clock,
      color: "text-orange-600 bg-orange-50",
    },
    {
      key: "reports",
      label: t("dash.reports"),
      value: data?.reports,
      icon: FileText,
      color: "text-green-600 bg-green-50",
    },
    {
      key: "reportsToday",
      label: t("dash.reportsToday"),
      value: data?.reportsToday,
      icon: CalendarCheck,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      key: "businesses",
      label: t("dash.businesses"),
      value: data?.businesses,
      icon: Building2,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  const tabs: { value: Granularity; label: string }[] = [
    { value: "day", label: t("dash.granularity.day") },
    { value: "week", label: t("dash.granularity.week") },
    { value: "month", label: t("dash.granularity.month") },
  ];

  return (
    <div>
      <PageHeader title={t("dash.title")} description={t("dash.desc")} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.key} className="border bg-white">
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${c.color}`}
              >
                <c.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm text-slate-500">{c.label}</div>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <div
                    className="text-2xl font-semibold"
                    data-testid={`stat-${c.key}`}
                  >
                    {c.value ?? 0}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{t("dash.trend")}</CardTitle>
            <div className="text-xs text-slate-500 mt-1">
              {t(`dash.range.${granularity}`)}
            </div>
          </div>
          <div
            className="inline-flex rounded-md border bg-slate-50 p-0.5"
            role="tablist"
          >
            {tabs.map((tab) => {
              const active = granularity === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGranularity(tab.value)}
                  data-testid={`tab-granularity-${tab.value}`}
                  className={
                    "px-3 py-1.5 text-sm rounded transition-colors " +
                    (active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700")
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || isFetching ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <TrendChart
              trend={data?.trend ?? []}
              granularity={granularity}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatLabel(key: string, granularity: Granularity): string {
  // key format: 'YYYY-MM-DD'
  if (granularity === "day") return key.slice(5); // MM-DD
  if (granularity === "week") return key.slice(5); // week starts MM-DD
  // month
  return key.slice(0, 7); // YYYY-MM
}

function TrendChart({
  trend,
  granularity,
}: {
  trend: { day: string; count: number }[];
  granularity: Granularity;
}) {
  const max = Math.max(1, ...trend.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-48">
      {trend.map((d) => {
        const h = Math.round((d.count / max) * 100);
        return (
          <div
            key={d.day}
            className="flex-1 flex flex-col items-center justify-end gap-1"
            data-testid={`bar-${d.day}`}
          >
            <div className="text-[11px] text-slate-500">{d.count}</div>
            <div
              className="w-full bg-blue-500/80 rounded-t"
              style={{ height: `${Math.max(2, h)}%` }}
              title={`${d.day}: ${d.count}`}
            />
            <div className="text-[10px] text-slate-400 mt-1">
              {formatLabel(d.day, granularity)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
