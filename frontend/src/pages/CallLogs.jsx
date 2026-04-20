import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock3, Globe2, PhoneCall, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useExport } from "@/context/ExportContext";
import PageLoading from "../components/PageLoading";
import { fetchCallRecords, fetchUsers } from "../firebaseapi.js";
import { BarChartCom } from "@/components/barChart.jsx";

const ROWS_PER_PAGE = 15;

const tokenPalette = [
  "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200",
  "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-200",
  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
  "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200",
  "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200",
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
];

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatDisplayTime(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function parseDuration(duration = "") {
  const minutes = duration.match(/(\d+)\s*m/);
  const seconds = duration.match(/(\d+)\s*s/);
  return (minutes ? Number(minutes[1]) : 0) + (seconds ? Number(seconds[1]) : 0) / 60;
}

function formatDurationSummary(minutes) {
  if (!minutes) {
    return "0m";
  }

  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getTokenTone(value = "") {
  const index = value
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0) % tokenPalette.length;

  return tokenPalette[index];
}

function getStatusTone(status = "") {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "incoming") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (normalizedStatus === "outgoing") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";
  }

  if (normalizedStatus === "missed") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  }

  if (normalizedStatus === "escalated") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function getDurationTone(duration) {
  const totalMinutes = parseDuration(duration);

  if (totalMinutes >= 5) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  }

  if (totalMinutes >= 2) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
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

export function CallLogs() {
  const { isAuthenticated, loading, user } = useAuth();
  const { setExportConfig } = useExport();

  const [callLogs, setCallLogs] = useState([]);
  const [selectedEid, setSelectedEid] = useState("E");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeDirectory, setEmployeeDirectory] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const getEmployeeName = (eid) => {
    const employee = employeeDirectory[eid];
    return employee?.name || employee?.employee_name || eid;
  };

  const getEmployeeLabel = (eid) => {
    const employeeName = getEmployeeName(eid);
    return employeeName === eid ? eid : `${employeeName} (${eid})`;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [data, users] = await Promise.all([fetchCallRecords(), fetchUsers()]);

        if (data) {
          setCallLogs(data);
        }

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
      } catch (fetchError) {
        setError("Failed to fetch call logs. Please try again later.");
        console.error("Error fetching call records:", fetchError);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredLogs = user
    ? callLogs.filter((log) => {
        const logDate = formatDate(log.timestamp);
        const matchesDate = selectedDate ? logDate === selectedDate : true;
        const matchesRegion = selectedRegion === "All" ? true : log.region === selectedRegion;
        const matchesStatus = selectedStatus === "All" ? true : log.status === selectedStatus;
        const matchesDepartment = selectedDepartment === "All" ? true : log.department === selectedDepartment;

        if (user.role === "employee") {
          return log.eid === user.eid && matchesDate && matchesRegion && matchesStatus;
        }

        const matchesEid = selectedEid === "E" ? true : log.eid === selectedEid;
        return matchesEid && matchesDate && matchesRegion && matchesStatus && matchesDepartment;
      })
    : [];

  const uniqueEids = [...new Set(callLogs.map((log) => log.eid).filter(Boolean))].sort();
  const uniqueRegions = [...new Set(callLogs.map((log) => log.region).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(callLogs.map((log) => log.status).filter(Boolean))].sort();
  const uniqueDepartments = [...new Set(callLogs.map((log) => log.department).filter(Boolean))].sort();

  const visibleEmployeeCount = new Set(filteredLogs.map((log) => log.eid)).size;
  const visibleRegionCount = new Set(filteredLogs.map((log) => log.region)).size;
  const totalDurationMinutes = filteredLogs.reduce((total, log) => total + parseDuration(log.duration), 0);
  const incomingCount = filteredLogs.filter((log) => log.status?.toLowerCase() === "incoming").length;
  const outgoingCount = filteredLogs.filter((log) => log.status?.toLowerCase() === "outgoing").length;
  const longestCall = filteredLogs.reduce((longest, log) => {
    const minutes = parseDuration(log.duration);
    return minutes > longest ? minutes : longest;
  }, 0);

  const activeFilters = [
    user?.role !== "employee" && selectedEid !== "E" ? `Employee: ${getEmployeeLabel(selectedEid)}` : null,
    selectedDate ? `Date: ${selectedDate}` : null,
    selectedRegion !== "All" ? `Region: ${selectedRegion}` : null,
    selectedStatus !== "All" ? `Status: ${selectedStatus}` : null,
    user?.role !== "employee" && selectedDepartment !== "All" ? `Department: ${selectedDepartment}` : null,
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
      label: "Visible Calls",
      value: filteredLogs.length,
      subtitle: user?.role === "employee" ? "Your current call view" : "Records matching active filters",
    },
    {
      icon: Clock3,
      label: "Talk Time",
      value: formatDurationSummary(totalDurationMinutes),
      subtitle: longestCall ? `Longest visible call: ${formatDurationSummary(longestCall)}` : "No call duration available",
    },
    {
      icon: Users,
      label: "Employees",
      value: visibleEmployeeCount,
      subtitle: user?.role === "employee" ? "You are the only visible employee" : "Employees represented in the table",
    },
    {
      icon: Globe2,
      label: "Regions",
      value: visibleRegionCount,
      subtitle: filteredLogs.length ? "Geographies covered by the current view" : "No regions in the current slice",
    },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEid, selectedDate, selectedRegion, selectedStatus, selectedDepartment, user?.eid, user?.role]);

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
      filename: "call-logs.csv",
      headers: [
        "Call ID",
        "Employee",
        "Customer Phone",
        "Department",
        "Region",
        "Status",
        "Timestamp",
        "Duration",
      ],
      rows: paginatedLogs.map((log) => [
        log.cid,
        getEmployeeLabel(log.eid),
        log.customer_phone,
        log.department,
        log.region,
        log.status,
        `${formatDisplayDate(log.timestamp)} ${formatDisplayTime(log.timestamp)}`,
        log.duration,
      ]),
    });

    return () => setExportConfig(null);
  }, [
    paginatedLogs,
    setExportConfig,
    user,
    employeeDirectory,
  ]);

  if (loading || (isAuthenticated && user && isLoading)) {
    return <PageLoading variant="table" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-sky-900 to-teal-800 text-white shadow-2xl shadow-slate-300/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
              Call Intelligence
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Call Logs</h1>
              <p className="max-w-2xl text-sm text-white/75">
                Review customer conversations, scan operational load, and spot shifts in activity across teams,
                regions, and call directions from one cleaner workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                {user.role === "employee" ? "Employee View" : "Manager View"}
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
                  All available records
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-xl">Filter Call Activity</CardTitle>
              <CardDescription>
                Narrow the visible records
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {user.role !== "employee" && (
                <Select value={selectedEid} onValueChange={setSelectedEid}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E">All Employees</SelectItem>
                    {uniqueEids.map((eid) => (
                      <SelectItem key={eid} value={eid}>
                        {getEmployeeLabel(eid)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                type="date"
                className="h-11 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                placeholder="Select Date"
              />

              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="h-11 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none">
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Regions</SelectItem>
                  {uniqueRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-11 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {user.role !== "employee" && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white/90 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none sm:col-span-2">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Departments</SelectItem>
                    {uniqueDepartments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                  Showing the full visible dataset
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Call Duration Trend</CardTitle>
                <CardDescription>
                  Monthly total duration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredLogs.length > 0 ? (
              <BarChartCom chartData={filteredLogs} />
            ) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-400">
                No call duration data matches the current filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-xl">Visible Call Records</CardTitle>
              <CardDescription>
                {filteredLogs.length} calls
                {filteredLogs.length > 0 ? ` • Showing ${visibleStart}-${visibleEnd}` : ""}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="cursor-default select-none border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200">
                Incoming: {incomingCount}
              </Badge>
              <Badge className="cursor-default select-none border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-950/40 dark:hover:text-sky-200">
                Outgoing: {outgoingCount}
              </Badge>
              <Badge className="cursor-default select-none border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-200">
                Unique Employees: {visibleEmployeeCount}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">No calls match these filters</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Clear one or more filters to bring records back into view.
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table className="table-fixed">
                <TableHeader className="bg-slate-950/[0.03] dark:bg-slate-50/[0.02]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Call ID</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Employee</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Customer Phone</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Department</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Region</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Status</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Timestamp</TableHead>
                    <TableHead className="w-[110px] text-left text-xs uppercase tracking-[0.14em] text-slate-500">Duration</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedLogs.map((log, index) => (
                    <TableRow
                      key={`${log.cid}-${log.timestamp}-${index}`}
                      className="border-slate-100 hover:bg-sky-50/50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                    >
                      <TableCell className="text-left">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {log.cid}
                        </span>
                      </TableCell>

                      <TableCell className="text-left">
                        <div className="flex max-w-[145px] flex-col">
                          <span className="truncate font-medium text-slate-900 dark:text-slate-100">{getEmployeeName(log.eid)}</span>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{log.eid}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-left">
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-200">{log.customer_phone}</span>
                      </TableCell>

                      <TableCell className="text-left">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-[86px] justify-center overflow-hidden text-ellipsis font-medium",
                            getTokenTone(log.department || "")
                          )}
                        >
                          {log.department || "Unknown"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-left">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-[112px] justify-center whitespace-nowrap font-medium",
                            getTokenTone(log.region || "")
                          )}
                        >
                          {log.region || "Unknown"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-left">
                        <Badge
                          variant="outline"
                          className={cn("w-[96px] justify-center font-medium capitalize", getStatusTone(log.status || ""))}
                        >
                          {log.status || "Unknown"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-left">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatDisplayDate(log.timestamp)}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDisplayTime(log.timestamp)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-left">
                        <Badge
                          variant="outline"
                          className={cn(
                            "w-[84px] justify-center font-medium",
                            getDurationTone(log.duration)
                          )}
                        >
                          {log.duration || "0 m 0 s"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {visibleStart}-{visibleEnd} of {filteredLogs.length} calls
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
