import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const tableRows = Array.from({ length: 6 });
const stats = Array.from({ length: 4 });

function TableShell({ showFilters = true }) {
  return (
    <div className="p-6 space-y-6">
      {showFilters && (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-[210px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-56" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            {tableRows.map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 rounded-lg border p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardShell() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-32" />
      </div>

      <Skeleton className="h-10 w-full" />

      <Card className="border-0 bg-slate-900 text-white shadow-lg">
        <CardHeader className="space-y-3">
          <Skeleton className="h-8 w-80 bg-slate-700" />
          <Skeleton className="h-4 w-72 bg-slate-700" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full bg-slate-700" />
          <Skeleton className="h-4 w-24 bg-slate-700 ml-auto" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((_, index) => (
          <Card key={index} className="shadow-sm">
            <CardHeader className="space-y-3">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item} className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="h-[320px]">
              <Skeleton className="h-full w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LeaderboardShell() {
  return (
    <div className="m-8 space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            {tableRows.map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 rounded-lg border p-4">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item} className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="h-[360px]">
              <Skeleton className="h-full w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ManagementShell() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-24" />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PageLoading({ variant = "table" }) {
  if (variant === "dashboard") {
    return <DashboardShell />;
  }

  if (variant === "leaderboard") {
    return <LeaderboardShell />;
  }

  if (variant === "management") {
    return <ManagementShell />;
  }

  return <TableShell />;
}
