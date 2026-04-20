import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bar, Pie } from "react-chartjs-2";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";
import { useExport } from "../context/ExportContext";
import PageLoading from "../components/PageLoading";
import { fetchUsers } from "../firebaseapi";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Activity, BarChart3, PhoneCall, Star, TrendingUp, Users } from "lucide-react";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const sentimentPalette = ["#22c55e", "#f59e0b", "#ef4444"];
const scorePalette = ["#ef4444", "#f59e0b", "#38bdf8", "#22c55e"];

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

function getSentimentTone(sentiment = "") {
  const normalized = sentiment.toLowerCase();

  if (normalized === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (normalized === "neutral") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  if (normalized === "negative") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function getScoreTone(score) {
  if (score >= 3.25) {
    return "bg-emerald-500";
  }

  if (score >= 2.25) {
    return "bg-amber-500";
  }

  return "bg-rose-500";
}

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { setExportConfig } = useExport();
  const [AIdata, setAIdata] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const buildAllEmployeesSummary = (data) => {
    if (!data.length) {
      return null;
    }

    const totals = data.reduce((accumulator, employee) => {
      accumulator.totalScore += employee.satisfaction_scores.reduce((sum, score) => sum + score, 0);
      accumulator.totalCount += employee.satisfaction_scores.length;
      accumulator.sentiment_counts.positive += employee.sentiment_counts.positive;
      accumulator.sentiment_counts.neutral += employee.sentiment_counts.neutral;
      accumulator.sentiment_counts.negative += employee.sentiment_counts.negative;
      return accumulator;
    }, {
      totalScore: 0,
      totalCount: 0,
      sentiment_counts: { positive: 0, neutral: 0, negative: 0 },
      score_distribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
    });

    data.forEach((employee) => {
      employee.satisfaction_scores.forEach((score) => {
        const normalizedScore = Math.min(4, Math.max(1, Math.round(score)));
        totals.score_distribution[normalizedScore] += 1;
      });
    });

    return {
      eid: "ALL",
      name: "All Employees",
      displayName: "All Employees",
      satisfaction_scores: [],
      sentiment_counts: totals.sentiment_counts,
      score_distribution: totals.score_distribution,
      total_calls: totals.totalCount,
      average_satisfaction: totals.totalCount ? totals.totalScore / totals.totalCount : 0,
    };
  };

  const processAIdata = (data) => {
    const employeeData = data.reduce((accumulator, item) => {
      const { eid, satisfaction_score, sentiment_analysis } = item;

      if (!accumulator[eid]) {
        accumulator[eid] = {
          eid,
          satisfaction_scores: [],
          sentiment_counts: { positive: 0, neutral: 0, negative: 0 },
          score_distribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
        };
      }

      accumulator[eid].satisfaction_scores.push(satisfaction_score);
      const normalizedScore = Math.min(4, Math.max(1, Math.round(satisfaction_score)));
      accumulator[eid].score_distribution[normalizedScore] += 1;
      accumulator[eid].sentiment_counts[sentiment_analysis] += 1;

      return accumulator;
    }, {});

    Object.keys(employeeData).forEach((eid) => {
      const scores = employeeData[eid].satisfaction_scores;
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      employeeData[eid].average_satisfaction = averageScore;
      employeeData[eid].total_calls = scores.length;
    });

    return Object.values(employeeData);
  };

  const getEmployeeName = (employee) =>
    employee?.name || employee?.employee_name || employee?.displayName || employee?.eid;

  const getSatisfactionPercentage = (averageScore) => (averageScore / 4) * 100;

  const getDominantSentiment = (employee) => {
    const sentimentCounts = employee?.sentiment_counts || {};
    const entries = Object.entries(sentimentCounts);

    if (!entries.length) {
      return "N/A";
    }

    return entries
      .sort((a, b) => b[1] - a[1])[0][0]
      .replace(/^\w/, (char) => char.toUpperCase());
  };

  const getPositiveRate = (employee) => {
    const totalCalls = employee?.total_calls || 0;

    if (!totalCalls) {
      return 0;
    }

    return (employee.sentiment_counts.positive / totalCalls) * 100;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [response, users] = await Promise.all([
          fetch("http://localhost:3000/api/data/all"),
          fetchUsers(),
        ]);

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const directory = users.reduce((accumulator, entry) => {
          const eid = entry.eid || entry.id;

          if (eid) {
            accumulator[eid] = {
              name: entry.name || entry.employee_name,
              employee_name: entry.employee_name,
            };
          }

          return accumulator;
        }, {});

        const data = await response.json();
        const processedData = processAIdata(data.data).map((entry) => ({
          ...entry,
          ...directory[entry.eid],
          displayName: directory[entry.eid]?.name || directory[entry.eid]?.employee_name || entry.eid,
        }));

        setAIdata(processedData);
        const allEmployeesSummary = buildAllEmployeesSummary(processedData);

        if (user && user.role === "employee") {
          const currentEmployee = processedData.find((employee) => employee.eid === user.eid);
          setSelectedEmployee(currentEmployee);
        } else {
          setSelectedEmployee(allEmployeesSummary || processedData[0]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleEmployeeSelect = (eid) => {
    if (eid === "ALL") {
      setSelectedEmployee(buildAllEmployeesSummary(AIdata));
      return;
    }

    const employee = AIdata.find((entry) => entry.eid === eid);
    setSelectedEmployee(employee);
  };

  useEffect(() => {
    if (!selectedEmployee) {
      setExportConfig(null);
      return () => setExportConfig(null);
    }

    const employeeName =
      selectedEmployee.name ||
      selectedEmployee.employee_name ||
      selectedEmployee.displayName ||
      selectedEmployee.eid;
    const satisfactionPercentage = getSatisfactionPercentage(selectedEmployee.average_satisfaction);

    setExportConfig({
      filename: selectedEmployee.eid === "ALL"
        ? "dashboard-all-employees.csv"
        : `dashboard-${selectedEmployee.eid}.csv`,
      headers: [
        "Employee",
        "Employee ID",
        "Average Satisfaction Score",
        "Average Satisfaction Percentage",
        "Positive Sentiment Count",
        "Neutral Sentiment Count",
        "Negative Sentiment Count",
      ],
      rows: [[
        employeeName,
        selectedEmployee.eid,
        selectedEmployee.average_satisfaction.toFixed(2),
        satisfactionPercentage.toFixed(2),
        selectedEmployee.sentiment_counts.positive,
        selectedEmployee.sentiment_counts.neutral,
        selectedEmployee.sentiment_counts.negative,
      ]],
    });

    return () => setExportConfig(null);
  }, [selectedEmployee, setExportConfig]);

  if (loading || (isAuthenticated && user && pageLoading)) {
    return <PageLoading variant="dashboard" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const sentimentData = selectedEmployee
    ? {
        labels: ["Positive", "Neutral", "Negative"],
        datasets: [
          {
            label: "Sentiment Analysis",
            data: [
              selectedEmployee.sentiment_counts.positive,
              selectedEmployee.sentiment_counts.neutral,
              selectedEmployee.sentiment_counts.negative,
            ],
            backgroundColor: sentimentPalette,
            borderWidth: 0,
          },
        ],
      }
    : null;

  const satisfactionDistributionData = selectedEmployee
    ? {
        labels: ["1", "2", "3", "4"],
        datasets: [
          {
            label: "Call Count",
            data: [
              selectedEmployee.score_distribution?.[1] || 0,
              selectedEmployee.score_distribution?.[2] || 0,
              selectedEmployee.score_distribution?.[3] || 0,
              selectedEmployee.score_distribution?.[4] || 0,
            ],
            backgroundColor: scorePalette,
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      }
    : null;

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#64748b",
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        padding: 12,
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(148, 163, 184, 0.18)",
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
      y: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
    },
  };

  const activeSelectionLabel = selectedEmployee
    ? selectedEmployee.eid === "ALL"
      ? "All Employees"
      : `${getEmployeeName(selectedEmployee)} (${selectedEmployee.eid})`
    : "No employee selected";

  const heroMetrics = selectedEmployee
    ? [
        {
          icon: PhoneCall,
          label: "Analyzed Calls",
          value: selectedEmployee.total_calls || 0,
          subtitle: selectedEmployee.eid === "ALL" ? "Calls included in the org-wide view" : "Calls analyzed for this employee",
        },
        {
          icon: Star,
          label: "Average Score",
          value: `${selectedEmployee.average_satisfaction.toFixed(2)}/4`,
          subtitle: `${getSatisfactionPercentage(selectedEmployee.average_satisfaction).toFixed(0)}% satisfaction equivalent`,
        },
        {
          icon: TrendingUp,
          label: "Positive Rate",
          value: `${getPositiveRate(selectedEmployee).toFixed(1)}%`,
          subtitle: `${selectedEmployee.sentiment_counts.positive} positive outcomes in view`,
        },
        {
          icon: Activity,
          label: "Dominant Sentiment",
          value: getDominantSentiment(selectedEmployee),
          subtitle: "Most common tone across the visible call set",
        },
      ]
    : [];

  const scoreBreakdown = selectedEmployee
    ? [
        { label: "Score 1", count: selectedEmployee.score_distribution?.[1] || 0, tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200" },
        { label: "Score 2", count: selectedEmployee.score_distribution?.[2] || 0, tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" },
        { label: "Score 3", count: selectedEmployee.score_distribution?.[3] || 0, tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200" },
        { label: "Score 4", count: selectedEmployee.score_distribution?.[4] || 0, tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200" },
      ]
    : [];

  const sentimentBreakdown = selectedEmployee
    ? [
        {
          label: "Positive",
          count: selectedEmployee.sentiment_counts.positive,
          tone: "border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/25",
        },
        {
          label: "Neutral",
          count: selectedEmployee.sentiment_counts.neutral,
          tone: "border-amber-200 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/25",
        },
        {
          label: "Negative",
          count: selectedEmployee.sentiment_counts.negative,
          tone: "border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/25",
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-sky-900 to-teal-800 text-white shadow-2xl shadow-slate-300/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
              Performance Overview
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
              <p className="max-w-2xl text-sm text-white/75">
                Track satisfaction performance, monitor sentiment quality, and move between individual and team
                views from one cleaner dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                {user.role === "employee" ? "Employee View" : "Manager View"}
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                Active selection: {activeSelectionLabel}
              </Badge>
              {user.role === "employee" && user.phone ? (
                <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                  Phone: {user.phone}
                </Badge>
              ) : (
                <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                  Dataset employees: {AIdata.length}
                </Badge>
              )}
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-sm text-white/75">Signed in as</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {user.name || user.employee_name || user.eid} ({user.eid})
              </div>
              <div className="mt-1 text-sm text-white/70">{user.role}</div>
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

      {selectedEmployee ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="flex h-full flex-col border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
              <CardHeader className="px-5 pb-3 pt-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">View Selection</CardTitle>
                    <CardDescription>
                      Switch between employee-level and overall performance summaries.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4 px-5 pb-5 pt-0">
                {user.role === "manager" ? (
                  <Select
                    onValueChange={handleEmployeeSelect}
                    value={selectedEmployee ? selectedEmployee.eid : undefined}
                  >
                    <SelectTrigger className="h-11 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIdata.length > 0 ? (
                        <>
                          <SelectItem value="ALL">All Employees</SelectItem>
                          {AIdata.map((employee) => (
                            <SelectItem key={employee.eid} value={employee.eid}>
                              {getEmployeeName(employee)} ({employee.eid})
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <SelectItem disabled>No employees available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Selected Employee</div>
                    <div className="mt-2 font-medium text-slate-900 dark:text-slate-100">{activeSelectionLabel}</div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Current View</div>
                    <div className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                      {selectedEmployee.eid === "ALL" ? "Organization Summary" : "Employee Spotlight"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Employee Count</div>
                    <div className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                      {selectedEmployee.eid === "ALL" ? AIdata.length : 1}
                    </div>
                  </div>
                </div>

                <div className="mt-auto overflow-hidden rounded-3xl border border-sky-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_42%),linear-gradient(135deg,_rgba(240,249,255,0.96),_rgba(236,253,245,0.96))] p-4 dark:border-sky-900/40 dark:bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_42%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(8,47,73,0.92))]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/80 dark:text-sky-300/80">
                      Focus View
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {selectedEmployee.eid === "ALL"
                        ? "Use the selector to move from organization-wide trends to one employee view"
                        : `Review ${getEmployeeName(selectedEmployee)} with score and sentiment context in one place`}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      The dashboard summary and both charts update together so you can compare satisfaction quality,
                      call volume, and sentiment mix without switching pages.
                    </p>
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
                    <CardTitle className="text-xl">Satisfaction Spotlight</CardTitle>
                    <CardDescription>
                      A concise view of score quality and sentiment balance for the active selection.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 dark:border-slate-700/70 dark:bg-slate-900/65">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Satisfaction</div>
                      <div className="flex flex-wrap items-end gap-3">
                        <span className="text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                          {getSatisfactionPercentage(selectedEmployee.average_satisfaction).toFixed(0)}%
                        </span>
                        <span className="pb-1 text-base font-medium text-slate-600 dark:text-slate-300">
                          {selectedEmployee.average_satisfaction.toFixed(2)} / 4
                        </span>
                      </div>
                      <div className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Based on {selectedEmployee.total_calls} analyzed calls in the current dashboard view.
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:w-[240px] lg:grid-cols-1">
                      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-900/85 dark:shadow-none">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Dominant Sentiment
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-3 w-full justify-center py-2 font-medium",
                            getSentimentTone(getDominantSentiment(selectedEmployee))
                          )}
                        >
                          {getDominantSentiment(selectedEmployee)}
                        </Badge>
                      </div>

                      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-900/85 dark:shadow-none">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Positive Rate
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                          {getPositiveRate(selectedEmployee).toFixed(1)}%
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          share of positive outcomes
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={cn("h-full rounded-full transition-all", getScoreTone(selectedEmployee.average_satisfaction))}
                      style={{ width: `${getSatisfactionPercentage(selectedEmployee.average_satisfaction)}%` }}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="overflow-hidden border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
              <CardHeader className="border-b border-slate-100/80 bg-slate-50/80 dark:border-slate-700/70 dark:bg-slate-900/40">
                <div>
                  <CardTitle className="text-xl">Sentiment Balance</CardTitle>
                  <CardDescription>
                    Positive, neutral, and negative call counts for the active dashboard selection.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  {sentimentBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex min-h-[122px] flex-col items-center justify-center rounded-2xl border p-5 text-center",
                        item.tone
                      )}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {item.label}
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                        {item.count}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        calls
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
              <CardHeader className="border-b border-slate-100/80 bg-slate-50/80 dark:border-slate-700/70 dark:bg-slate-900/40">
                <div>
                  <CardTitle className="text-xl">Score Mix</CardTitle>
                  <CardDescription>
                    Distribution of analyzed calls across the 4-point satisfaction scale.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid gap-4">
                  {scoreBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex min-h-[108px] flex-col items-center justify-center rounded-2xl border px-4 py-4 text-center",
                        item.tone
                      )}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                        {item.label}
                      </div>
                      <div className="mt-2 text-2xl font-semibold">
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="min-w-0 w-full h-full overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
              <CardHeader className="border-b border-slate-100/80 bg-white/20 dark:border-slate-700/70 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Sentiment Analysis Distribution</CardTitle>
                    <CardDescription>
                      Positive, neutral, and negative mix for the current dashboard selection.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[340px] p-4">
                {sentimentData ? (
                  <div className="h-full rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700/70 dark:bg-slate-900/65">
                    <Pie data={sentimentData} options={pieOptions} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-400">
                    No sentiment data available.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 w-full h-full overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
              <CardHeader className="border-b border-slate-100/80 bg-white/20 dark:border-slate-700/70 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Satisfaction Score Distribution</CardTitle>
                    <CardDescription>
                      Call counts grouped by score band on the 4-point satisfaction scale.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[340px] p-4">
                {satisfactionDistributionData ? (
                  <div className="h-full rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700/70 dark:bg-slate-900/65">
                    <Bar data={satisfactionDistributionData} options={barOptions} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-400">
                    No score distribution data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-slate-900 dark:text-slate-100">No dashboard data available</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Once analyzed call records are available, the dashboard overview will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
