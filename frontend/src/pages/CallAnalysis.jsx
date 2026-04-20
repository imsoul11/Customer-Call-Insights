import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useExport } from "../context/ExportContext";
import { useAuth } from "../context/AuthContext";
import PageLoading from "../components/PageLoading";
import { fetchUsers } from "../firebaseapi";
import { FileText, ListFilter, PhoneCall, Star, TrendingUp, Users } from "lucide-react";

const ROWS_PER_PAGE = 15;

function getScorePercentage(score) {
  return (Number(score || 0) / 4) * 100;
}

function getScoreTone(score) {
  const numericScore = Number(score || 0);

  if (numericScore >= 3) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (numericScore >= 2) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
}

function getScoreBarTone(score) {
  const numericScore = Number(score || 0);

  if (numericScore >= 3) {
    return "bg-emerald-500";
  }

  if (numericScore >= 2) {
    return "bg-amber-500";
  }

  return "bg-rose-500";
}

function getSentimentTone(sentiment = "") {
  const normalizedSentiment = sentiment.toLowerCase();

  if (normalizedSentiment === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (normalizedSentiment === "neutral") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  if (normalizedSentiment === "negative") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function MetricCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/75">{label}</span>
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm text-white/70">{subtitle}</div>
    </div>
  );
}

export function CallAnalysis() {
  const { user, isAuthenticated, loading } = useAuth();
  const { setExportConfig } = useExport();
  const [callAnalysis, setCallAnalysis] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [employeeDirectory, setEmployeeDirectory] = useState({});
  const [selectedEid, setSelectedEid] = useState("E");
  const [selectedCall, setSelectedCall] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);

  const getEmployeeName = (eid) => {
    const employee = employeeDirectory[eid];
    return employee?.name || employee?.employee_name || `Employee ${eid}`;
  };

  const getEmployeeLabel = (eid) => {
    const employeeName = getEmployeeName(eid);
    return employeeName === `Employee ${eid}` ? employeeName : `${employeeName} (${eid})`;
  };

  useEffect(() => {
    const fetchCallData = async () => {
      try {
        const [response, users] = await Promise.all([
          axios.get("http://localhost:3000/api/data/all"),
          fetchUsers(),
        ]);

        if (response.data.success) {
          const uniqueEids = [...new Set(response.data.data.map((item) => item.eid))].sort();
          setCallAnalysis(response.data.data);
          setEmployeeIds(uniqueEids);
          setEmployeeDirectory(
            users.reduce((accumulator, entry) => {
              const eid = entry.eid || entry.id;

              if (eid) {
                accumulator[eid] = {
                  name: entry.name,
                  employee_name: entry.employee_name,
                };
              }

              return accumulator;
            }, {})
          );
        } else {
          setError("Failed to fetch call analysis data.");
          console.error("Failed to fetch data: ", response.data.message);
        }
      } catch (fetchError) {
        setError("Failed to fetch call analysis data.");
        console.error("Error fetching call analysis data:", fetchError);
      } finally {
        setPageLoading(false);
      }
    };

    fetchCallData();
  }, []);

  const isEmployee = user?.role === "employee";

  const filteredLogs = callAnalysis.filter((log) => {
    const matchesEid = isEmployee
      ? log.eid === user?.eid
      : selectedEid === "E"
        ? true
        : log.eid === selectedEid;

    const matchesCall = selectedCall
      ? log.cid.toLowerCase().includes(selectedCall.toLowerCase())
      : true;

    return matchesEid && matchesCall;
  });

  const sentimentCounts = filteredLogs.reduce(
    (accumulator, log) => {
      const key = log.sentiment_analysis?.toLowerCase();
      if (accumulator[key] !== undefined) {
        accumulator[key] += 1;
      }
      return accumulator;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  const visibleEmployeeCount = new Set(filteredLogs.map((log) => log.eid)).size;
  const averageScore = filteredLogs.length
    ? filteredLogs.reduce((sum, log) => sum + Number(log.satisfaction_score || 0), 0) / filteredLogs.length
    : 0;
  const strongCallCount = filteredLogs.filter((log) => Number(log.satisfaction_score || 0) >= 3).length;
  const positiveRate = filteredLogs.length ? (sentimentCounts.positive / filteredLogs.length) * 100 : 0;
  const dominantSentiment = Object.entries(sentimentCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const activeFilters = [
    !isEmployee && selectedEid !== "E" ? `Employee: ${getEmployeeLabel(selectedEid)}` : null,
    selectedCall ? `Call Search: ${selectedCall}` : null,
  ].filter(Boolean);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ROWS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );
  const visibleStart = filteredLogs.length ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0;
  const visibleEnd = filteredLogs.length
    ? Math.min(currentPage * ROWS_PER_PAGE, filteredLogs.length)
    : 0;

  const heroMetrics = [
    {
      icon: PhoneCall,
      label: "Visible Analyses",
      value: filteredLogs.length,
      subtitle: isEmployee ? "Your analyzed calls" : "Calls matching the current filters",
    },
    {
      icon: Star,
      label: "Average Score",
      value: `${averageScore.toFixed(2)}/4`,
      subtitle: `${getScorePercentage(averageScore).toFixed(0)}% satisfaction equivalent`,
    },
    {
      icon: TrendingUp,
      label: "Positive Rate",
      value: `${positiveRate.toFixed(0)}%`,
      subtitle: `${sentimentCounts.positive} positive calls in the current view`,
    },
    {
      icon: Users,
      label: "Employees",
      value: visibleEmployeeCount,
      subtitle: isEmployee ? "Single-employee view" : "Employees represented in analysis",
    },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEid, selectedCall, user?.eid, user?.role]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!user) {
      setExportConfig(null);
      return () => setExportConfig(null);
    }

    setExportConfig({
      filename: "call-analysis.csv",
      headers: [
        "Call ID",
        "Employee ID",
        "Satisfaction Score",
        "Sentiment Analysis",
        "Call Summary",
      ],
      rows: paginatedLogs.map((log) => [
        log.cid,
        log.eid,
        log.satisfaction_score,
        log.sentiment_analysis,
        log.call_summary,
      ]),
    });

    return () => setExportConfig(null);
  }, [paginatedLogs, user, setExportConfig]);

  if (loading || (isAuthenticated && user && pageLoading)) {
    return <PageLoading variant="table" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20">
          <CardContent className="p-6 text-sm text-rose-700 dark:text-rose-200">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-sky-900 to-teal-800 text-white shadow-2xl shadow-slate-300/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
              AI Analysis Workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Call Analysis</h1>
              <p className="max-w-2xl text-sm text-white/75">
                Review AI-generated call scoring, sentiment signals
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                {isEmployee ? "Employee View" : "Manager View"}
              </Badge>
              {activeFilters.length > 0 ? (
                activeFilters.map((filterLabel) => (
                  <Badge
                    key={filterLabel}
                    className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10"
                  >
                    {filterLabel}
                  </Badge>
                ))
              ) : (
                <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                  All visible analysis records
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroMetrics.map((metric) => (
              <MetricCard
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                subtitle={metric.subtitle}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="flex h-full flex-col border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
          <CardHeader className="px-5 pb-3 pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                <ListFilter className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Filter Analysis Results</CardTitle>
                <CardDescription>
                  Narrow the visible AI analysis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-3 px-5 pb-5 pt-0">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {!isEmployee && (
                <Select value={selectedEid} onValueChange={setSelectedEid}>
                  <SelectTrigger className="h-10 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E">All Employees</SelectItem>
                    {employeeIds.map((eid) => (
                      <SelectItem key={eid} value={eid}>
                        {getEmployeeLabel(eid)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="relative">
                <Input
                  type="search"
                  className={cn(
                    "h-10 border-slate-200 bg-white/90 pl-4 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none",
                    isEmployee ? "sm:col-span-2" : ""
                  )}
                  value={selectedCall}
                  onChange={(event) => setSelectedCall(event.target.value)}
                  placeholder="Search Call ID"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilters.length > 0 ? (
                activeFilters.map((filterLabel) => (
                  <Badge
                    key={filterLabel}
                    variant="outline"
                    className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {filterLabel}
                  </Badge>
                ))
              ) : (
                <Badge
                  variant="outline"
                  className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  Showing the full visible analysis dataset
                </Badge>
              )}
            </div>

            <div className="mt-auto overflow-hidden rounded-3xl border border-cyan-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(6,182,212,0.2),_transparent_42%),linear-gradient(135deg,_rgba(240,249,255,0.96),_rgba(236,253,245,0.96))] p-4 dark:border-cyan-900/40 dark:bg-[radial-gradient(circle_at_top_right,_rgba(6,182,212,0.18),_transparent_42%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(8,47,73,0.92))]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700/80 dark:text-cyan-300/80">
                    Quick Focus
                  </p>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Jump from broad analysis to one exact conversation
                    </h3>
                    <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Combine employee and call search filters to move quickly from team-wide review
                      into a single AI-analyzed interaction.
                    </p>
                  </div>
                </div>

                <div className="relative hidden h-24 w-24 shrink-0 sm:block">
                  <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl dark:bg-cyan-400/10" />
                  <div className="absolute right-2 top-0 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/85 text-cyan-700 shadow-lg shadow-cyan-200/40 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-cyan-300 dark:shadow-none">
                    <ListFilter className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/65 p-3 text-center dark:border-slate-700/60 dark:bg-slate-900/55">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Employee
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    Narrow by teammate
                  </div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/65 p-3 text-center dark:border-slate-700/60 dark:bg-slate-900/55">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Call ID
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    Jump to one record
                  </div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/65 p-3 text-center dark:border-slate-700/60 dark:bg-slate-900/55">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Summary
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    Open the AI recap
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Sentiment Snapshot</CardTitle>
                <CardDescription>
                  A quick pulse of the sentiment mix inside the current filtered view.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Positive", count: sentimentCounts.positive, tone: "bg-emerald-500" },
              { label: "Neutral", count: sentimentCounts.neutral, tone: "bg-amber-500" },
              { label: "Negative", count: sentimentCounts.negative, tone: "bg-rose-500" },
            ].map((item) => {
              const width = filteredLogs.length ? (item.count / filteredLogs.length) * 100 : 0;

              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.count} calls
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={cn("h-full rounded-full transition-all", item.tone)} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                <div className="text-sm text-slate-500 dark:text-slate-400">Strong Scores</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{strongCallCount}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Calls scoring 3 or above</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                <div className="text-sm text-slate-500 dark:text-slate-400">Dominant Sentiment</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 capitalize dark:text-slate-100">
                  {dominantSentiment || "N/A"}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Based on the visible records</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-xl">Visible Analysis Records</CardTitle>
              <CardDescription>
                Review the current call score, sentiment classification, and AI summary for each visible call.
                {filteredLogs.length > 0 ? ` Showing ${visibleStart}-${visibleEnd} of ${filteredLogs.length}.` : ""}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="cursor-default select-none border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200">
                Positive: {sentimentCounts.positive}
              </Badge>
              <Badge className="cursor-default select-none border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/40 dark:hover:text-amber-200">
                Neutral: {sentimentCounts.neutral}
              </Badge>
              <Badge className="cursor-default select-none border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-200">
                Negative: {sentimentCounts.negative}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">No analysis results match these filters</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Adjust the employee or call search filter to bring analysis records back into view.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table className="table-fixed">
                <TableHeader className="bg-slate-950/[0.03] dark:bg-slate-50/[0.02]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-1/5 text-left text-xs uppercase tracking-[0.14em] text-slate-500">Call ID</TableHead>
                    <TableHead className="w-1/5 text-left text-xs uppercase tracking-[0.14em] text-slate-500">Employee</TableHead>
                    <TableHead className="w-1/5 text-left text-xs uppercase tracking-[0.14em] text-slate-500">Satisfaction</TableHead>
                    <TableHead className="w-1/5 text-left text-xs uppercase tracking-[0.14em] text-slate-500">Sentiment</TableHead>
                    <TableHead className="w-1/5 text-left text-xs uppercase tracking-[0.14em] text-slate-500">Call Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((analysis) => (
                    <TableRow
                      key={analysis._id}
                      className="border-slate-100 hover:bg-cyan-50/50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                    >
                      <TableCell className="text-left">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {analysis.cid}
                        </span>
                      </TableCell>

                      <TableCell className="text-left">
                        <div className="flex w-full max-w-full flex-col pr-3">
                          <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {getEmployeeName(analysis.eid)}
                          </span>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{analysis.eid}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-left align-middle">
                        <div className="mx-auto flex min-h-[64px] w-full max-w-[180px] flex-col justify-center space-y-2">
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={cn("h-full rounded-full transition-all", getScoreBarTone(analysis.satisfaction_score))}
                              style={{ width: `${getScorePercentage(analysis.satisfaction_score)}%` }}
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("mx-auto w-[96px] justify-center font-medium", getScoreTone(analysis.satisfaction_score))}
                          >
                            {Number(analysis.satisfaction_score).toFixed(1)} / 4
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-left">
                        <Badge variant="outline" className={cn("w-[96px] justify-center capitalize font-medium", getSentimentTone(analysis.sentiment_analysis))}>
                          {analysis.sentiment_analysis}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-left">
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button variant="outline" className="border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                              View Summary
                            </Button>
                          </DrawerTrigger>
                          <DrawerContent className="mx-auto w-full max-w-6xl rounded-t-[24px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                            <DrawerHeader className="px-6 pt-6">
                              <div className="flex flex-wrap gap-2">
                                <Badge className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-900">
                                  Call {analysis.cid}
                                </Badge>
                                <Badge variant="outline" className={cn("font-medium", getSentimentTone(analysis.sentiment_analysis))}>
                                  {analysis.sentiment_analysis}
                                </Badge>
                              </div>
                              <DrawerTitle className="pt-2 text-2xl">AI Call Summary</DrawerTitle>
                              <DrawerDescription>
                                Review the generated summary and score for {getEmployeeLabel(analysis.eid)}.
                              </DrawerDescription>
                            </DrawerHeader>

                            <div className="grid gap-4 px-6 pb-6 md:grid-cols-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="text-sm text-slate-500 dark:text-slate-400">Employee</div>
                                <div className="mt-2 font-medium text-slate-900 dark:text-slate-100">{getEmployeeLabel(analysis.eid)}</div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="text-sm text-slate-500 dark:text-slate-400">Satisfaction Score</div>
                                <div className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                                  {Number(analysis.satisfaction_score).toFixed(1)} / 4
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="text-sm text-slate-500 dark:text-slate-400">Sentiment</div>
                                <div className="mt-2 font-medium capitalize text-slate-900 dark:text-slate-100">
                                  {analysis.sentiment_analysis}
                                </div>
                              </div>
                            </div>

                            <div className="px-6 pb-8">
                              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100">
                                {analysis.call_summary || "No summary available."}
                              </div>
                            </div>
                          </DrawerContent>
                        </Drawer>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {visibleStart}-{visibleEnd} of {filteredLogs.length} analysis records
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    Previous
                  </Button>
                  <span className="min-w-[84px] text-center text-sm text-slate-600 dark:text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
