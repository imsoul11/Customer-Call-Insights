import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2, CircleAlert, FileText, MapPin, Phone, PhoneCall, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { fetchBackendCallDetail } from "@/lib/backendData";
import { cn } from "@/lib/utils";
import PageLoading from "../components/PageLoading";

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp || "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function sentimentTone(sentiment = "") {
  const value = sentiment.toLowerCase();

  if (value === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  if (value === "negative") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
}

function statusTone(status = "") {
  const value = status.toLowerCase();

  if (value === "escalated") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  if (value === "missed") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 break-words font-medium text-slate-900 dark:text-slate-100">{value || "Not recorded"}</div>
    </div>
  );
}

export default function CallDetail() {
  const { cid } = useParams();
  const { isAuthenticated, loading, user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      try {
        const response = await fetchBackendCallDetail(cid || "");
        if (isMounted) setDetail(response);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.response?.data?.message || loadError.message || "Unable to load this call.");
        }
      } finally {
        if (isMounted) setPageLoading(false);
      }
    }

    if (cid) loadDetail();
    else setPageLoading(false);

    return () => {
      isMounted = false;
    };
  }, [cid]);

  if (loading || (isAuthenticated && pageLoading)) return <PageLoading variant="table" />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (error || !detail?.call) {
    return (
      <div className="space-y-5 p-6">
        <Button asChild variant="outline"><Link to="/dashboard/calllogs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Call Logs</Link></Button>
        <Card className="border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20">
          <CardContent className="p-6 text-rose-700 dark:text-rose-200">{error || "Call not found."}</CardContent>
        </Card>
      </div>
    );
  }

  const { call, analysis } = detail;
  const followUpNeeded = analysis?.follow_up === "Yes";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline"><Link to="/dashboard/calllogs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Call Logs</Link></Button>
        <Badge variant="outline" className="font-mono">Call {call.cid}</Badge>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-sky-900 to-teal-800 text-white shadow-2xl shadow-slate-300/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">Call Review Workspace</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">One conversation, in full context.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Review the original conversation alongside its AI assessment, then use the follow-up signal to decide what happens next.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10 text-white/90 capitalize hover:bg-white/10">{call.status || "Unknown"}</Badge>
              {analysis && <Badge className="border-white/15 bg-white/10 text-white/90 capitalize hover:bg-white/10">{analysis.sentiment_analysis} sentiment</Badge>}
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">{call.duration || "Duration unavailable"}</Badge>
            </div>
          </div>

          <div className={cn("rounded-3xl border p-5 backdrop-blur-sm", followUpNeeded ? "border-amber-300/35 bg-amber-300/10" : "border-emerald-300/30 bg-emerald-300/10")}>
            <div className="flex items-center gap-3">
              {followUpNeeded ? <CircleAlert className="h-6 w-6 text-amber-200" /> : <CheckCircle2 className="h-6 w-6 text-emerald-200" />}
              <div>
                <div className="text-sm font-medium text-white/80">Follow-up signal</div>
                <div className="text-xl font-semibold">{analysis ? (followUpNeeded ? "Follow-up recommended" : "No follow-up indicated") : "Analysis pending"}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {analysis ? "This signal is generated from the call transcript and should be reviewed by the responsible team." : "This call has been saved but does not yet have an AI analysis."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><PhoneCall className="h-5 w-5 text-sky-600 dark:text-sky-300" />Call context</CardTitle>
            <CardDescription>The source details recorded with this conversation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <DetailItem icon={UserRound} label="Employee ID" value={call.eid} />
            <DetailItem icon={Phone} label="Customer phone" value={call.customer_phone} />
            <DetailItem icon={MapPin} label="Region" value={call.region} />
            <DetailItem icon={CalendarClock} label="Timestamp" value={formatTimestamp(call.timestamp)} />
            <DetailItem icon={PhoneCall} label="Duration" value={call.duration} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-sm text-slate-500 dark:text-slate-400">Call status</div>
              <Badge variant="outline" className={cn("mt-2 capitalize", statusTone(call.status))}>{call.status || "Unknown"}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-300" />AI assessment</CardTitle>
              <CardDescription>{analysis ? "Structured analysis generated from the submitted transcript." : "No AI result is available for this call yet."}</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <DetailItem icon={ShieldCheck} label="Satisfaction score" value={`${Number(analysis.satisfaction_score).toFixed(1)} / 4`} />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="text-sm text-slate-500 dark:text-slate-400">Sentiment</div>
                      <Badge variant="outline" className={cn("mt-2 capitalize", sentimentTone(analysis.sentiment_analysis))}>{analysis.sentiment_analysis}</Badge>
                    </div>
                    <DetailItem icon={followUpNeeded ? CircleAlert : CheckCircle2} label="Follow-up" value={analysis.follow_up || "No"} />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100">
                    <div className="mb-2 font-medium text-slate-900 dark:text-slate-100">Summary</div>
                    {analysis.call_summary}
                  </div>
                </div>
              ) : <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Generate an analysis to see satisfaction, sentiment, summary, and follow-up guidance here.</div>}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><FileText className="h-5 w-5 text-violet-600 dark:text-violet-300" />Transcript</CardTitle>
              <CardDescription>The original text submitted for this call.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100">
                {call.conversation_text || "No transcript was saved for this call."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
