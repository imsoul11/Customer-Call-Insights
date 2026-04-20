import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { Activity, BarChart3, PhoneCall, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "../context/AuthContext";

const QUICK_LOGIN_ACCOUNTS = [
  {
    roleLabel: "Employee",
    eid: "EID05358",
    name: "John J",
    department: "HR",
    email: "john.jones@work.com",
    password: "ezK0zyAM",
  },
  {
    roleLabel: "Manager",
    eid: "EID23672",
    name: "Emma J",
    department: "Finance",
    email: "emma.johnson@work.com",
    password: "aVp1RJqz",
  },
];

const SIGNAL_BARS = [74, 52, 88, 61, 93, 67, 79];

const Login = () => {
  const { user, login, error, loading, isAuthenticated } = useAuth();
  const [eid, setEid] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [activeLoginTarget, setActiveLoginTarget] = useState(null);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!eid || !password) {
      setFormError("Please enter both Employee ID and password.");
      return;
    }

    setFormError("");
    setActiveLoginTarget("manual");

    try {
      await login(eid, password);
    } finally {
      setActiveLoginTarget(null);
    }
  };

  const handleQuickLogin = async (account) => {
    setFormError("");
    setEid(account.eid);
    setPassword(account.password);
    setActiveLoginTarget(account.eid);

    try {
      await login(account.eid, account.password);
    } finally {
      setActiveLoginTarget(null);
    }
  };

  if (isAuthenticated && user?.role === "admin") {
    return <Navigate to="/dashboard/usermanagement" replace />;
  }

  if (isAuthenticated || (user?.role === "employee " || user?.role === "manager")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#eff6ff_0%,_#f8fafc_34%,_#ecfeff_68%,_#fefce8_100%)] p-4 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#082f49_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl dark:bg-cyan-500/12" />
        <div className="absolute right-[-6rem] top-16 h-80 w-80 rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-300/10" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-400/10" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl items-center">
        <div className="grid w-full gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="hidden xl:block">
            <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.28),_transparent_34%),linear-gradient(145deg,_rgba(255,255,255,0.94),_rgba(240,249,255,0.9)_36%,_rgba(236,253,245,0.9)_100%)] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.15)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_34%),linear-gradient(145deg,_rgba(15,23,42,0.95),_rgba(8,47,73,0.95)_40%,_rgba(6,78,59,0.92)_100%)] dark:shadow-none">
              <div className="absolute right-8 top-8 rounded-full border border-white/70 bg-white/75 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:border-slate-600/70 dark:bg-slate-900/70 dark:text-slate-300">
                Customer Call Insights
              </div>

              <div className="relative z-10 max-w-xl space-y-6">
                <Badge className="w-fit border-white/60 bg-white/70 text-slate-700 shadow-sm hover:bg-white/70 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Intelligence Workspace
                </Badge>

                <div className="space-y-4">
                  <h1 className="max-w-lg font-serif text-5xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                    Turn every customer conversation into a clearer signal.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                    Review call quality, sentiment, team performance, and coaching opportunities from one polished workspace designed for fast operational decisions.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60">
                    <PhoneCall className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                    <div className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">1.8K</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Calls monitored</div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60">
                    <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    <div className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">78%</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Positive sentiment</div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/65 p-4 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60">
                    <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                    <div className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">24/7</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Access ready</div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-5 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Conversation signal</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rolling analysis strength</div>
                      </div>
                      <BarChart3 className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                    </div>

                    <div className="mt-6 flex h-40 items-end gap-3">
                      {SIGNAL_BARS.map((height, index) => (
                        <div
                          key={`${height}-${index}`}
                          className="flex-1 rounded-t-[18px] bg-[linear-gradient(180deg,_rgba(34,211,238,0.85),_rgba(14,165,233,0.9)_42%,_rgba(13,148,136,0.92)_100%)] shadow-[0_16px_36px_rgba(14,165,233,0.18)] dark:shadow-none"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/70 bg-white/70 p-5 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Session ready</div>
                      <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">2 roles</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manager and employee quick access</div>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] dark:border-slate-700 dark:bg-slate-950">
                      <div className="text-sm font-medium text-white/80">Live pulse</div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.75)]" />
                        <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,_#34d399,_#22d3ee,_#fbbf24)]" />
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-white/70">Authentication access panel is ready for quick sign-in.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="relative overflow-hidden border-white/70 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none">
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_72%)] dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_72%)]" />
            <CardHeader className="relative space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-3xl font-semibold tracking-tight">Login</CardTitle>
                  <CardDescription className="mt-2 max-w-md text-sm leading-6">
                    Step into the workspace with one tap, or reveal the manual form only when you need it.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-slate-200 bg-white/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                  Quick Access
                </Badge>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="rounded-2xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Secure role-based entry</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Choose the account you want and jump straight into the dashboard.</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {QUICK_LOGIN_ACCOUNTS.map((account) => (
                  <div
                    key={account.eid}
                    className="group flex h-full flex-col rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.9)_100%)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,_rgba(15,23,42,0.85),_rgba(2,6,23,0.95)_100%)] dark:hover:shadow-none"
                  >
                    <div className="flex flex-1 flex-col justify-between gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            {account.roleLabel}
                          </div>
                          <div className="mt-2 text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100">
                            {account.name}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          {account.department}
                        </Badge>
                      </div>

                      <div className="min-h-[82px] rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Contact
                        </div>
                        <div className="mt-2 break-all text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {account.email}
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="mt-1 w-full bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-100 disabled:bg-slate-950 disabled:text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-white dark:disabled:text-slate-950"
                        onClick={() => handleQuickLogin(account)}
                        disabled={loading}
                      >
                        {loading && activeLoginTarget === account.eid
                          ? "Logging in..."
                          : `Login as ${account.roleLabel}`}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-[26px] border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Manual login</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Hidden by default to keep the quick-access view clean.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowManualLogin((visible) => !visible)}
                    disabled={loading}
                  >
                    {showManualLogin ? "Hide Manual Login" : "Show Manual Login"}
                  </Button>
                </div>

                {showManualLogin && (
                  <form className="space-y-4" onSubmit={handleLogin}>
                    <Input
                      type="text"
                      placeholder="Employee ID"
                      value={eid}
                      onChange={(event) => setEid(event.target.value)}
                      required
                      className="h-11 border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                    />

                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-11 border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && activeLoginTarget === "manual" ? "Logging in..." : "Login"}
                    </Button>

                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
