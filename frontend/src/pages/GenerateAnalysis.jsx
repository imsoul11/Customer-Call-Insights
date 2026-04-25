import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildApiUrl } from "@/lib/api";
import { notifyCallsUpdated } from "@/lib/callSync";
import { useAuth } from "@/context/AuthContext";
import PageLoading from "../components/PageLoading";
import { FileText, ShieldAlert, ShieldCheck, Sparkles, Star } from "lucide-react";

const defaultQuotaStatus = {
  limit: 100,
  used: 0,
  remaining: 100,
  exhausted: false,
};

const statusOptions = ["incoming", "outgoing", "missed", "escalated"];

function buildInitialFormData(user) {
  return {
    status: "incoming",
    timestamp: new Date().toISOString().slice(0, 16),
    duration: "",
    region: "",
    customer_phone: "",
    transcript: "",
  };
}

function parseDurationToSeconds(duration = "") {
  const normalizedDuration = String(duration || "");
  const minutesMatch = normalizedDuration.match(/(\d+)\s*m/i);
  const secondsMatch = normalizedDuration.match(/(\d+)\s*s/i);

  return (minutesMatch ? Number(minutesMatch[1]) * 60 : 0) +
    (secondsMatch ? Number(secondsMatch[1]) : 0);
}

function getQuotaTone(quotaStatus) {
  if (quotaStatus.exhausted) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  }

  if (quotaStatus.remaining <= 5) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
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

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
      <div className="text-sm font-medium text-white/75">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-sm text-white/70">{subtitle}</div>
    </div>
  );
}

export function GenerateAnalysis() {
  const { user, isAuthenticated, loading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [quotaStatus, setQuotaStatus] = useState(defaultQuotaStatus);
  const [fetchWarning, setFetchWarning] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [formData, setFormData] = useState(() => buildInitialFormData(user));
  const canGenerateAnalysis = user?.role === "manager" || user?.role === "employee";
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User";

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const [quotaResponse] = await Promise.allSettled([
          axios.get(buildApiUrl("/api/ai/quota-status")),
        ]);

        if (quotaResponse.status === "fulfilled") {
          setQuotaStatus(quotaResponse.value.data?.data || defaultQuotaStatus);
        } else {
          setFetchWarning((previous) =>
            previous || "Quota status could not be loaded. The form still works, but the usage badge may be stale."
          );
        }
      } finally {
        setPageLoading(false);
      }
    };

    fetchPageData();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
    }));
  }, [user]);

  if (loading || (isAuthenticated && pageLoading)) {
    return <PageLoading variant="table" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!canGenerateAnalysis) {
    return <Navigate to="/dashboard/callanalysis" replace />;
  }

  const handleInputChange = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    setIsSubmitting(true);

    const trimmedCustomerPhone = formData.customer_phone.trim();
    const durationInSeconds = parseDurationToSeconds(formData.duration);

    if (!trimmedCustomerPhone) {
      setSubmitError("Customer phone is required.");
      setIsSubmitting(false);
      return;
    }

    if (durationInSeconds <= 0) {
      setSubmitError("Duration must be greater than 0 seconds.");
      setIsSubmitting(false);
      return;
    }

    const requestPayload = {
      eid: user.eid || "",
      status: formData.status,
      timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : "",
      duration: formData.duration.trim(),
      region: formData.region.trim(),
      customer_phone: trimmedCustomerPhone,
      employee_phone: user.phone || user.employee_phone || "",
      transcript: formData.transcript.trim(),
    };

    let response;

    try {
      // console.info("[GenerateAnalysis] submitting analysis request", {
      //   cid: "auto",
      //   eid: requestPayload.eid,
      // });
      response = await axios.post(buildApiUrl("/api/ai/analyze-call"), requestPayload);
    } catch (error) {
      console.error("[GenerateAnalysis] submission failed", {
        cid: error.response?.data?.data?.cid || error.response?.data?.call?.cid || "auto",
        eid: requestPayload.eid,
        message: error.message,
        response: error.response?.data,
      });

      if (error.response?.data?.quota) {
        setQuotaStatus(error.response.data.quota);
      }

      if (error.response?.data?.call) {
        notifyCallsUpdated({
          cid: error.response.data.call.cid,
          eid: error.response.data.call.eid,
        });
      }

      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Failed to generate AI analysis. Please review the form and try again."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const savedCallId = response.data?.data?.cid || response.data?.call?.cid || "";
      // console.info("[GenerateAnalysis] submission succeeded", response.data);
      setAnalysisResult(response.data?.data || null);
      setQuotaStatus(response.data?.quota || quotaStatus);
      notifyCallsUpdated({
        cid: savedCallId,
        eid: requestPayload.eid,
      });
      setSubmitSuccess(
        response.data?.cached
          ? `Analysis for ${savedCallId} already existed and has been loaded. The raw call record is synced to Call Logs.`
          : `AI analysis for ${savedCallId} has been generated and saved. The raw call record is now available in Call Logs.`
      );
      setFormData(buildInitialFormData(user));
    } catch (postSuccessError) {
      console.error("[GenerateAnalysis] post-success UI update failed", {
        cid: response.data?.data?.cid || response.data?.call?.cid || "unknown",
        message: postSuccessError.message,
        stack: postSuccessError.stack,
      });

      const savedCallId = response.data?.data?.cid || response.data?.call?.cid || "";
      setAnalysisResult(response.data?.data || null);
      setQuotaStatus(response.data?.quota || quotaStatus);
      setSubmitSuccess(
        `AI analysis for ${savedCallId} was saved successfully, but the page hit a local UI update issue. Please reload the page if the latest result does not appear immediately.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-sky-900 to-teal-800 text-white shadow-2xl shadow-slate-300/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit border-white/20 bg-white/10 text-white hover:bg-white/10">
              AI Workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Generate AI Analysis</h1>
              <p className="max-w-2xl text-sm text-white/75">
                Enter a call transcript and its metadata here, generate the AI result through the backend, and keep the
                existing analysis dashboard read-only and untouched. Employees and managers both submit using their
                own signed-in IDs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                Saved results appear in Call Analysis
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                Backend-only Gemini key
              </Badge>
              <Badge className="border-white/15 bg-white/10 text-white/90 hover:bg-white/10">
                Signed-in EID only
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Quota Used" value={quotaStatus.used} subtitle={`Out of ${quotaStatus.limit} total AI requests`} />
            <MetricCard label="Remaining" value={quotaStatus.remaining} subtitle="Requests left before the manual reset is needed" />
            <MetricCard label="Access" value={roleLabel} subtitle="Employees and managers can submit with their own signed-in IDs" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-200/70 bg-white/95 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-xl">Call Input Form</CardTitle>
                <CardDescription>
                  This is the dedicated input page, so the existing call-analysis table stays read-only.
                </CardDescription>
              </div>

              <Badge variant="outline" className={cn("gap-1 font-medium", getQuotaTone(quotaStatus))}>
                {quotaStatus.exhausted ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {quotaStatus.exhausted ? "Usage Limit Reached" : "Quota Available"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {fetchWarning ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                {fetchWarning}
              </div>
            ) : null}

            {submitError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
                {submitError}
              </div>
            ) : null}

            {submitSuccess ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">
                {submitSuccess}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Employee</label>
                  <Input
                    value={`${user.name || user.employee_name || user.eid} (${user.eid})`}
                    readOnly
                    className="bg-slate-50 dark:bg-slate-900/70"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Taken from the current signed-in session.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Timestamp</label>
                  <Input
                    type="datetime-local"
                    value={formData.timestamp}
                    onChange={(event) => handleInputChange("timestamp", event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Duration</label>
                  <Input
                    value={formData.duration}
                    onChange={(event) => handleInputChange("duration", event.target.value)}
                    placeholder="4m 20s"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Use the same format shown in Call Logs, for example `4m 20s`. Zero-length calls are not allowed.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Region</label>
                  <Input
                    value={formData.region}
                    onChange={(event) => handleInputChange("region", event.target.value)}
                    placeholder="Asia"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Customer Phone</label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(event) => handleInputChange("customer_phone", event.target.value)}
                    placeholder="9876543210"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Employee Phone</label>
                  <Input
                    value={user.phone || user.employee_phone || ""}
                    readOnly
                    className="bg-slate-50 dark:bg-slate-900/70"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Taken from the current signed-in session.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Call Transcript</label>
                <Textarea
                  value={formData.transcript}
                  onChange={(event) => handleInputChange("transcript", event.target.value)}
                  placeholder="Paste the full conversation text here..."
                  className="min-h-[220px] resize-y"
                  required
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Logged in as {user.name || user.employee_name || user.eid}. Paste the transcript and add the call details to continue.
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || quotaStatus.exhausted || !formData.transcript.trim()}
                  className="h-11 min-w-[220px] bg-slate-950 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {isSubmitting ? "Generating..." : quotaStatus.exhausted ? "Usage Limit Reached" : "Generate and Save Analysis"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_52%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-lg shadow-slate-200/50 dark:border-slate-700/80 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] dark:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Latest Generated Result</CardTitle>
                <CardDescription>
                  Review the latest response that was saved into MongoDB.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {analysisResult ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Call ID</div>
                    <div className="mt-2 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{analysisResult.cid}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Employee ID</div>
                    <div className="mt-2 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{analysisResult.eid}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Satisfaction Score</div>
                    <div className="mt-2 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">{Number(analysisResult.satisfaction_score).toFixed(1)} / 4</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Sentiment</div>
                    <div className="mt-2">
                      <Badge variant="outline" className={cn("capitalize font-medium", getSentimentTone(analysisResult.sentiment_analysis))}>
                        {analysisResult.sentiment_analysis}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 dark:border-slate-700/70 dark:bg-slate-900/70">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Call Summary</div>
                  <div className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {analysisResult.call_summary}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Follow Up</div>
                  <div className="mt-2 font-medium text-slate-900 dark:text-slate-100">{analysisResult.follow_up}</div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 text-center dark:border-slate-700/70 dark:bg-slate-900/60">
                <div className="rounded-full bg-slate-100 p-4 text-slate-500 dark:bg-slate-950 dark:text-slate-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-900 dark:text-slate-100">No generated result yet</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Submit the form once, and the saved AI analysis will appear here immediately.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default GenerateAnalysis;
