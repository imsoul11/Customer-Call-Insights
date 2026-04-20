import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import axios from "axios";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useExport } from "@/context/ExportContext";
import PageLoading from "../components/PageLoading";
import { fetchUsers } from "../firebaseapi";
import { Activity, BarChart3, Crown, Star, Trophy, Users } from "lucide-react";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const scoreChartPalette = ["#0f766e", "#0ea5e9", "#f59e0b", "#f97316", "#14b8a6", "#eab308", "#2563eb", "#84cc16"];
const callsChartPalette = ["#1d4ed8", "#0f766e", "#7c3aed", "#ea580c", "#0891b2", "#4f46e5", "#16a34a", "#b45309"];

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

function getRankTone(rank) {
  if (rank === 1) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  if (rank === 2) {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
  }

  if (rank === 3) {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200";
  }

  return "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200";
}

function getScoreTone(percentage) {
  if (percentage >= 75) {
    return "bg-emerald-500";
  }

  if (percentage >= 50) {
    return "bg-amber-500";
  }

  return "bg-rose-500";
}

export default function Leaderboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { setExportConfig } = useExport();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [employeeDirectory, setEmployeeDirectory] = useState({});
  const [error, setError] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const getEmployeeName = (employeeId) => {
    const employee = employeeDirectory[employeeId];
    return employee?.name || employee?.employee_name || employeeId;
  };

  const getEmployeeLabel = (employeeId) => {
    const employeeName = getEmployeeName(employeeId);
    return employeeName === employeeId ? employeeId : `${employeeName} (${employeeId})`;
  };

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const [response, users] = await Promise.all([
          axios.get("http://localhost:3000/api/data/all"),
          fetchUsers(),
        ]);

        if (response.data.success) {
          const callData = response.data.data;

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

          const averageScores = {};

          callData.forEach(({ eid, satisfaction_score }) => {
            if (!averageScores[eid]) {
              averageScores[eid] = { totalScore: 0, count: 0 };
            }

            averageScores[eid].totalScore += satisfaction_score;
            averageScores[eid].count += 1;
          });

          const leaderboard = Object.entries(averageScores).map(([eid, { totalScore, count }]) => ({
            employeeId: eid,
            satisfactionScore: totalScore / count,
            satisfactionPercentage: ((totalScore / count) / 4) * 100,
            analyzedCalls: count,
          }));

          setLeaderboardData(leaderboard);
        } else {
          setError("Failed to fetch leaderboard data.");
          console.error("Failed to fetch data: ", response.data.message);
        }
      } catch (fetchError) {
        setError("Error fetching leaderboard data.");
        console.error("Error fetching leaderboard data:", fetchError);
      } finally {
        setPageLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const sortedLeaderboardData = [...leaderboardData]
    .sort((a, b) => b.satisfactionPercentage - a.satisfactionPercentage)
    .map((employee, index) => ({ ...employee, rank: index + 1 }));

  const topPerformer = sortedLeaderboardData[0];
  const currentUserEntry = sortedLeaderboardData.find((employee) => employee.employeeId === user?.eid);
  const totalAnalyzedCalls = leaderboardData.reduce((sum, employee) => sum + employee.analyzedCalls, 0);
  const weightedAverageScore = totalAnalyzedCalls
    ? leaderboardData.reduce((sum, employee) => sum + employee.satisfactionScore * employee.analyzedCalls, 0) / totalAnalyzedCalls
    : 0;
  const averageCallsPerEmployee = leaderboardData.length ? totalAnalyzedCalls / leaderboardData.length : 0;

  const heroMetrics = [
    {
      icon: Trophy,
      label: "Top Performer",
      value: topPerformer ? getEmployeeName(topPerformer.employeeId) : "N/A",
      subtitle: topPerformer
        ? `${topPerformer.satisfactionPercentage.toFixed(0)}% satisfaction equivalent`
        : "No ranking data available",
    },
    {
      icon: Star,
      label: "Org Average",
      value: `${weightedAverageScore.toFixed(2)}/4`,
      subtitle: `${((weightedAverageScore / 4) * 100).toFixed(0)}% weighted average satisfaction`,
    },
    {
      icon: Activity,
      label: "Analyzed Calls",
      value: totalAnalyzedCalls,
      subtitle: `${leaderboardData.length} employees represented in the leaderboard`,
    },
    {
      icon: Users,
      label: "Your Rank",
      value: currentUserEntry ? `#${currentUserEntry.rank}` : "N/A",
      subtitle: currentUserEntry
        ? `${currentUserEntry.satisfactionScore.toFixed(2)}/4 average score`
        : "Current user not present in the leaderboard",
    },
  ];

  const topSatisfactionComparisonData = {
    labels: sortedLeaderboardData.slice(0, 8).map((employee) => getEmployeeName(employee.employeeId)),
    datasets: [
      {
        label: "Average Satisfaction (%)",
        data: sortedLeaderboardData.slice(0, 8).map((employee) => employee.satisfactionPercentage),
        backgroundColor: scoreChartPalette,
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  const analyzedCallsByEmployeeData = {
    labels: [...leaderboardData]
      .sort((a, b) => b.analyzedCalls - a.analyzedCalls)
      .slice(0, 8)
      .map((employee) => getEmployeeName(employee.employeeId)),
    datasets: [
      {
        label: "Analyzed Calls",
        data: [...leaderboardData]
          .sort((a, b) => b.analyzedCalls - a.analyzedCalls)
          .slice(0, 8)
          .map((employee) => employee.analyzedCalls),
        backgroundColor: callsChartPalette,
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
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
        beginAtZero: true,
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

  useEffect(() => {
    setExportConfig({
      filename: "leaderboard.csv",
      headers: [
        "Rank",
        "Employee",
        "Employee ID",
        "Average Satisfaction Score",
        "Average Satisfaction Percentage",
        "Analyzed Calls",
      ],
      rows: [...leaderboardData]
        .sort((a, b) => b.satisfactionPercentage - a.satisfactionPercentage)
        .map((employee, index) => [
          index + 1,
          getEmployeeName(employee.employeeId),
          employee.employeeId,
          employee.satisfactionScore.toFixed(2),
          employee.satisfactionPercentage.toFixed(2),
          employee.analyzedCalls,
        ]),
    });

    return () => setExportConfig(null);
  }, [leaderboardData, employeeDirectory, setExportConfig]);

  if (loading || (isAuthenticated && pageLoading)) {
    return <PageLoading variant="leaderboard" />;
  }

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-sky-900 to-teal-800 text-white shadow-2xl shadow-slate-300/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
              Performance Rankings
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
              <p className="max-w-2xl text-sm text-white/75">
                Compare employee satisfaction performance, spot the strongest performers, and understand how
                call volume and score quality move together across the team.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                {leaderboardData.length} ranked employees
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                Avg calls per employee: {averageCallsPerEmployee.toFixed(1)}
              </Badge>
              {currentUserEntry ? (
                <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                  Your standing: #{currentUserEntry.rank}
                </Badge>
              ) : (
                <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                  Current user not ranked
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

      {error ? (
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20">
          <CardContent className="p-6 text-sm text-rose-700 dark:text-rose-200">{error}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Employee Satisfaction Leaderboard</CardTitle>
                  <CardDescription>
                    Ranked by weighted satisfaction performance, with visibility into score quality and analysis volume.
                  </CardDescription>
                </div>

                {topPerformer && (
                  <div className="flex flex-wrap gap-2">
                    <Badge className="cursor-default select-none border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/40 dark:hover:text-amber-200">
                      <Crown className="mr-1 h-3.5 w-3.5" />
                      Leader: {getEmployeeName(topPerformer.employeeId)}
                    </Badge>
                    <Badge className="cursor-default select-none border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-200">
                      {topPerformer.analyzedCalls} analyzed calls
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {sortedLeaderboardData.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-slate-900 dark:text-slate-100">No leaderboard data available</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Ranking data will appear here once analyzed calls are available.
                    </p>
                  </div>
                </div>
              ) : (
                <Table className="table-fixed">
                  <TableHeader className="bg-slate-950/[0.03] dark:bg-slate-50/[0.02]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Rank</TableHead>
                      <TableHead className="w-[34%] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Employee</TableHead>
                      <TableHead className="w-[32%] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Average Score</TableHead>
                      <TableHead className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">Analyzed Calls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLeaderboardData.map((employee) => {
                      const isCurrentUser = employee.employeeId === user?.eid;

                      return (
                        <TableRow
                          key={employee.employeeId}
                          className={cn(
                            "border-slate-100 hover:bg-amber-50/40 dark:border-slate-800 dark:hover:bg-slate-900/40",
                            isCurrentUser && "bg-amber-50/80 dark:bg-amber-950/20"
                          )}
                        >
                          <TableCell className="text-left">
                            <Badge variant="outline" className={cn("w-[82px] justify-center font-medium", getRankTone(employee.rank))}>
                              #{employee.rank}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-left">
                            <div className="flex flex-col pr-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("font-medium text-slate-900 dark:text-slate-100", isCurrentUser && "text-amber-700 dark:text-amber-300")}>
                                  {getEmployeeName(employee.employeeId)}
                                </span>
                                {isCurrentUser && (
                                  <Badge className="cursor-default select-none border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/40 dark:hover:text-amber-200">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{employee.employeeId}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-left align-middle">
                            <div className="mx-auto flex min-h-[64px] w-full max-w-[220px] flex-col justify-center space-y-2">
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div
                                  className={cn("h-full rounded-full transition-all", getScoreTone(employee.satisfactionPercentage))}
                                  style={{ width: `${employee.satisfactionPercentage}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                  {employee.satisfactionScore.toFixed(2)} / 4
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {employee.satisfactionPercentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-left">
                            <Badge className="cursor-default select-none border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-200">
                              {employee.analyzedCalls} calls
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Top Satisfaction Comparison</CardTitle>
                    <CardDescription>
                      The highest-scoring employees by satisfaction percentage.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[360px]">
                {sortedLeaderboardData.length > 0 ? (
                  <Bar data={topSatisfactionComparisonData} options={comparisonChartOptions} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-400">
                    No comparison data available.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
              <CardHeader className="border-b border-slate-100/80 bg-white/20 dark:border-slate-700/70 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Analyzed Calls by Employee</CardTitle>
                    <CardDescription>
                      Volume comparison across the most heavily analyzed employees.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[360px] p-4">
                {leaderboardData.length > 0 ? (
                  <div className="h-full rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700/70 dark:bg-slate-900/65">
                    <Bar data={analyzedCallsByEmployeeData} options={comparisonChartOptions} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-400">
                    No call volume data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
