import { useEffect, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  ClipboardCheck,
  Files,
  LayoutDashboard,
  Menu,
  PenLine,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import {
  BRAND,
  NAV,
  ROLES,
  TODAY,
  addDays,
  type RoleKey,
  type ViewKey,
  myReviewPending,
  visibleTo,
} from "@/lib/irerc/model";
import { useIrerc } from "@/lib/irerc/store";
import { applyTheme, getStoredTheme } from "@/lib/irerc/theme";
import { Dashboard } from "@/components/irerc/dashboard";
import { ProtocolList } from "@/components/irerc/protocols";
import { ProtocolDetail } from "@/components/irerc/detail";
import { ArchiveDesk, CommitteeDesk, MonitorDesk, ReviewsDesk, RosterDesk, SafetyDesk, SystemDesk } from "@/components/irerc/desks";
import { ModalHost } from "@/components/irerc/modals";
import { ThemePicker } from "@/components/irerc/theme-picker";
import { NotificationCenter } from "@/components/irerc/notifications";
import { useVisibleNotifications } from "@/lib/irerc/notifications-utils";
import { workItems } from "@/lib/irerc/work-items";
import { SettingsDesk } from "@/components/irerc/settings";
import { AnalysisReport } from "@/components/irerc/analysis-report";
import type { AuthConfig } from "@/lib/integrations/types";

const ICONS: Record<ViewKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  protocols: Files,
  detail: Files,
  reviews: PenLine,
  screening: ClipboardCheck,
  committee: Scale,
  safety: ShieldAlert,
  monitor: Activity,
  archive: Archive,
  system: Settings,
  roster: Users,
  analysis: BarChart3,
  settings: Settings,
};

const ROLE_ICON: Record<RoleKey, typeof LayoutDashboard> = {
  investigator: ClipboardCheck,
  secretariat: Files,
  reviewer: PenLine,
  chair: Scale,
  admin: Settings,
};

const NAV_TONE: Record<ViewKey, { tile: string; active: string }> = {
  dashboard: { tile: "from-sky to-blue-500", active: "from-sky/25 via-blue-500/10 to-transparent ring-sky/40" },
  protocols: { tile: "from-indigo-500 to-violet-500", active: "from-indigo-500/25 via-violet-500/10 to-transparent ring-indigo-400/40" },
  detail: { tile: "from-indigo-500 to-violet-500", active: "from-indigo-500/25 via-violet-500/10 to-transparent ring-indigo-400/40" },
  screening: { tile: "from-amber-500 to-orange-500", active: "from-amber-500/25 via-orange-500/10 to-transparent ring-amber-400/40" },
  reviews: { tile: "from-fuchsia-500 to-pink-500", active: "from-fuchsia-500/25 via-pink-500/10 to-transparent ring-fuchsia-400/40" },
  committee: { tile: "from-em to-teal-500", active: "from-em/25 via-teal-500/10 to-transparent ring-em/40" },
  safety: { tile: "from-rose-500 to-red-500", active: "from-rose-500/25 via-red-500/10 to-transparent ring-rose-400/40" },
  monitor: { tile: "from-cyan-500 to-sky", active: "from-cyan-500/25 via-sky/10 to-transparent ring-cyan-400/40" },
  archive: { tile: "from-slate-500 to-slate-700", active: "from-slate-500/25 via-slate-600/10 to-transparent ring-slate-400/40" },
  system: { tile: "from-violet-500 to-purple-600", active: "from-violet-500/25 via-purple-600/10 to-transparent ring-violet-400/40" },
  roster: { tile: "from-pink-500 to-rose-500", active: "from-pink-500/25 via-rose-500/10 to-transparent ring-pink-400/40" },
  analysis: { tile: "from-cyan-500 to-blue-600", active: "from-cyan-500/25 via-blue-600/10 to-transparent ring-cyan-400/40" },
  settings: { tile: "from-amber-500 to-violet-500", active: "from-amber-500/25 via-violet-500/10 to-transparent ring-amber-400/40" },
};

export function Portal() {
  const restore = useIrerc((s) => s.restore);
  const setAuthReady = useIrerc((s) => s.setAuthReady);

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    let active = true;
    void import("@/lib/irerc/auth").then(({ getSession }) =>
      getSession()
        .then((user) => {
          if (!active) return;
          if (user) restore(user);
          else setAuthReady(true);
        })
        .catch(() => {
          if (active) setAuthReady(true);
        }),
    );
    return () => {
      active = false;
    };
  }, [restore, setAuthReady]);

  return <Gate />;
}

function Gate() {
  const role = useIrerc((s) => s.role);
  const authReady = useIrerc((s) => s.authReady);
  if (!authReady) return <SessionSplash />;
  if (!role) return <RoleGate />;
  return <Shell />;
}

function SessionSplash() {
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-blue-700 via-indigo-700 to-teal-700 text-white">
      <div className="flex flex-col items-center gap-4">
        <img src="/seal.png" alt="" className="size-16 rounded-2xl object-contain" />
        <p className="text-sm font-semibold tracking-wide text-white/80">Restoring your session…</p>
        <span className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    </div>
  );
}

function RoleGate() {
  const login = useIrerc((s) => s.login);

  // ── form state ────────────────────────────────────────────────
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [mode, setMode]         = useState<"detect" | "sign-in" | "register">("detect");
  const [isStaff, setIsStaff]   = useState(false);
  const [error, setError]       = useState("");
  const [notice, setNotice]     = useState("");
  const [busy, setBusy]         = useState(false);
  const [config, setConfig]     = useState<AuthConfig | null>(null);

  const inputCls = "mt-1 block min-h-12 w-full rounded-xl border border-line bg-ink-2 px-4 text-sm text-fg outline-none transition placeholder:text-muted focus:border-sky focus:ring-2 focus:ring-sky/20";

  useEffect(() => {
    let active = true;
    void import("@/lib/irerc/auth").then(({ getAuthConfig }) =>
      getAuthConfig().then((loaded) => {
        if (active) setConfig(loaded);
      }),
    );
    return () => {
      active = false;
    };
  }, []);

  function clearError() { setError(""); setNotice(""); }

  // ── Step 1: user enters email and presses Continue ─────────────
  async function handleDetect(e: React.FormEvent) {
    e.preventDefault();
    const norm = email.trim().toLowerCase();
    if (!norm || !/^\S+@\S+\.\S+$/.test(norm)) { setError("Enter a valid email address."); return; }
    setBusy(true); clearError();
    const { detectAccount } = await import("@/lib/irerc/auth");
    const detected = await detectAccount(norm);
    setBusy(false);
    if (!detected) {
      // The lookup failed; let the person still try their password.
      setIsStaff(false);
      setMode("sign-in");
      setNotice("We could not check this address right now. You can still try signing in.");
      return;
    }
    setIsStaff(detected === "staff");
    setMode(detected === "register" ? "register" : "sign-in");
  }

  // ── Step 2a: sign in (staff or existing PI) ────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); clearError();
    const { smartLogin } = await import("@/lib/irerc/auth");
    const result = await smartLogin(email, password);
    if ("error" in result) { setError(result.error); setBusy(false); return; }
    login(result);
  }

  // ── Step 2b: new PI registration ──────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Enter your full name."); return; }
    if (!password)    { setError("Enter a password."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true); clearError();
    const { registerPI } = await import("@/lib/irerc/auth");
    const result = await registerPI(name, email, password);
    if ("error" in result) { setError(result.error); setBusy(false); return; }
    login(result);
  }

  // ── Google Sign-In ────────────────────────────────────────────
  async function handleGoogle() {
    setBusy(true); clearError();
    try {
      const { getAuthConfig, requestGoogleCredential, signInWithGoogle } = await import(
        "@/lib/irerc/auth"
      );
      const current = config ?? (await getAuthConfig());
      if (!current) {
        setError("The server is unreachable. Try again in a moment.");
        return;
      }
      if (!current.googleEnabled || !current.googleClientId) {
        setError("Google Sign-In is not configured. Sign in with email and password instead.");
        return;
      }
      const credential = await requestGoogleCredential(current.googleClientId);
      const user = await signInWithGoogle(credential);
      if ("error" in user) {
        setError(user.error);
        return;
      }
      login(user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google Sign-In failed. Try email and password instead.");
    } finally {
      setBusy(false);
    }
  }

  const isRegistering = mode === "register";
  const googleVisible = config === null || config.googleEnabled;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-teal-700 text-white">
      <div className="pointer-events-none absolute -top-28 -left-24 size-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 size-96 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize: "52px 52px", maskImage: "radial-gradient(ellipse at center,black,transparent 78%)" }} />
      <div className="absolute top-4 right-4 z-20 rounded-2xl border border-white/20 bg-white/10 p-1 shadow-sm backdrop-blur">
        <ThemePicker inverted />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">

        {/* Branding */}
        <div className="min-w-0 max-w-xl">
          <div className="flex min-w-0 flex-nowrap items-center gap-4">
            <img src="/seal.png" alt="Addis Ababa City Administration Health Bureau seal" className="size-16 shrink-0 rounded-2xl object-contain sm:size-24" />
            <div>
              <h1 className="text-[clamp(1.1rem,3.2vw,2.1rem)] font-extrabold leading-tight tracking-tight text-white">{BRAND.short}</h1>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Institutional Research Ethics Review Portal</p>
            </div>
          </div>
          <p className="mt-5 max-w-lg border-l-2 border-amber-300/80 pl-3 text-xs font-semibold leading-relaxed tracking-[0.04em] text-amber-100 sm:text-sm">
            <span className="text-white/90">{BRAND.bureau}</span>
            <span className="px-1.5 text-amber-300/80">·</span>
            <span className="text-amber-200">{BRAND.directorate}</span>
          </p>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80">
            A single, governed route from protocol submission through screening, independent review,
            committee decision and clearance — every role sees only their own desk.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Admin", "Chairperson", "Secretariat", "Reviewers", "Investigators"].map((r) => (
              <span key={r} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{r}</span>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-[1.75rem] bg-gradient-to-br from-white/60 via-cyan-200/30 to-white/20 p-[1px] shadow-2xl">
          <div className="rounded-[calc(1.75rem-1px)] bg-panel/97 p-5 text-fg backdrop-blur md:p-7">
            <div className="mb-5">
              <p className="text-[10px] font-bold tracking-[0.18em] text-sky uppercase">Portal access</p>
              <h2 className="mt-1 text-2xl font-bold">
                {mode === "detect"    ? "Sign in"           :
                 isRegistering       ? "Create account"    : "Welcome back"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {mode === "detect"
                  ? "Enter your email. The system will guide you from there."
                  : isRegistering
                  ? "New investigator — create a free account. No approval needed."
                  : "Enter your password to continue."}
              </p>
            </div>

            {/* Google button — shown on first step */}
            {mode === "detect" && googleVisible ? (
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={busy}
                className="mb-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-panel-2/60 text-sm font-semibold text-fg transition hover:border-sky/50 hover:bg-sky/5 disabled:opacity-50"
              >
                <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            ) : null}

            {/* Divider */}
            {mode === "detect" && googleVisible ? (
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-muted">or continue with email</span>
                <div className="h-px flex-1 bg-line" />
              </div>
            ) : null}

            {/* ── Detect step: email only ── */}
            {mode === "detect" && (
              <form onSubmit={(e) => void handleDetect(e)} className="space-y-3" noValidate>
                <label className="block text-xs font-semibold tracking-wide text-muted uppercase">
                  Email address
                  <input type="email" autoComplete="email" autoFocus value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    placeholder="yourname@institution.et"
                    className={inputCls} />
                </label>
                {error ? <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p> : null}
                {notice ? <p className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">{notice}</p> : null}
                <button type="submit" disabled={busy}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-sky to-em text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                  {busy ? "Checking…" : "Continue →"}
                </button>
              </form>
            )}

            {/* ── Sign-in step ── */}
            {mode === "sign-in" && (
              <form onSubmit={(e) => void handleSignIn(e)} className="space-y-3" noValidate>
                <div className="rounded-xl border border-line bg-panel-2/50 px-3 py-2 text-sm">
                  <span className="text-muted">Signing in as </span>
                  <span className="font-semibold">{email}</span>
                  <button type="button" onClick={() => { setMode("detect"); setPassword(""); clearError(); }}
                    className="ml-2 text-xs text-sky hover:underline">Change</button>
                </div>
                <label className="block text-xs font-semibold tracking-wide text-muted uppercase">
                  Password
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} autoComplete="current-password" autoFocus
                      value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      placeholder="••••••••" className={`${inputCls} pr-12`} />
                    <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-fg">
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                {error ? <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p> : null}
                {notice ? <p className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">{notice}</p> : null}
                <button type="submit" disabled={busy}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-sky to-em text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                  {busy ? "Signing in…" : "Sign in"}
                </button>
                {!isStaff ? (
                  <p className="text-center text-xs text-muted">
                    New here?{" "}
                    <button type="button" onClick={() => { setMode("register"); setPassword(""); clearError(); }}
                      className="font-semibold text-sky hover:underline">Create account →</button>
                  </p>
                ) : null}
              </form>
            )}

            {/* ── Registration step (PI only) ── */}
            {isRegistering && (
              <form onSubmit={(e) => void handleRegister(e)} className="space-y-3" noValidate>
                <div className="rounded-xl border border-line bg-panel-2/50 px-3 py-2 text-sm">
                  <span className="text-muted">Registering as PI: </span>
                  <span className="font-semibold">{email}</span>
                  <button type="button" onClick={() => { setMode("detect"); setPassword(""); setName(""); setConfirm(""); clearError(); }}
                    className="ml-2 text-xs text-sky hover:underline">Change</button>
                </div>
                <label className="block text-xs font-semibold tracking-wide text-muted uppercase">
                  Full name
                  <input type="text" autoComplete="name" autoFocus value={name}
                    onChange={(e) => { setName(e.target.value); clearError(); }}
                    placeholder="Dr. Abebe Kebede" className={inputCls} />
                </label>
                <label className="block text-xs font-semibold tracking-wide text-muted uppercase">
                  Password
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} autoComplete="new-password"
                      value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      placeholder="At least 8 characters" className={`${inputCls} pr-12`} />
                    <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-fg">
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <label className="block text-xs font-semibold tracking-wide text-muted uppercase">
                  Confirm password
                  <input type={showPass ? "text" : "password"} autoComplete="new-password"
                    value={confirm} onChange={(e) => { setConfirm(e.target.value); clearError(); }}
                    placeholder="Repeat password" className={inputCls} />
                </label>
                {error ? <p className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p> : null}
                <button type="submit" disabled={busy}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-sky to-em text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                  {busy ? "Creating account…" : "Create account and sign in"}
                </button>
                <p className="text-center text-xs text-muted">
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setMode("sign-in"); setPassword(""); clearError(); }}
                    className="font-semibold text-sky hover:underline">Sign in →</button>
                </p>
              </form>
            )}

            <p className="mt-5 text-center text-[10px] text-muted">
              AAPHREML-IRERC · Addis Ababa City Administration Health Bureau
            </p>
            {config && !config.driveConfigured ? (
              <p className="mt-2 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-center text-[10px] text-amber">
                Google Drive is not connected yet. Sign-in works, but document uploads and previews will be
                unavailable until the administrator adds the service-account key.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/15 px-5 py-4 text-center text-[11px] font-medium text-white/70">
        Developed by: <span className="font-semibold text-amber-200">Addis Ababa City Data Management Center</span>
      </footer>
    </div>
  );
}

function Shell() {
  const role = useIrerc((s) => s.role)!;
  const view = useIrerc((s) => s.view);
  const go = useIrerc((s) => s.go);
  const query = useIrerc((s) => s.query);
  const setQuery = useIrerc((s) => s.setQuery);
  const navOpen = useIrerc((s) => s.navOpen);
  const setNav = useIrerc((s) => s.setNav);
  const protocols = useIrerc((s) => s.protocols);
  const safety = useIrerc((s) => s.safety);
  const acting = useIrerc((s) => s.actingReviewer);
  const toasts = useIrerc((s) => s.toasts);
  const celebrate = useIrerc((s) => s.celebrate);
  const closeModal = useIrerc((s) => s.closeModal);
  const notifications = useVisibleNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const profilePhoto = useIrerc((s) => s.profilePhotos[role]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeModal]);

  const badges = badgeMap(role, acting, protocols, safety);
  const items = NAV.filter((n) => n.roles.includes(role));
  const RoleIcon = ROLE_ICON[role];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink via-ink to-panel-2 text-fg">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-white/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 px-2 text-white shadow-xl md:gap-3 md:px-5">
        <button className="grid size-11 place-items-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 md:hidden" onClick={() => setNav(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <img src="/seal.png" alt="" className="size-9 rounded-xl object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{BRAND.short}</p>
          <p className="hidden text-[10px] font-semibold tracking-[0.18em] text-white/70 uppercase sm:block">Institutional Portal</p>
        </div>
        <label className="relative ml-auto hidden min-w-0 flex-1 md:block md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/70" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (view !== "protocols" && view !== "detail") go("protocols"); }}
            placeholder="Search protocol, investigator, site"
            className="min-h-11 w-full rounded-xl border border-white/25 bg-white/15 pr-3 pl-9 text-sm text-white outline-none transition placeholder:text-white/65 focus:border-white/60 focus:bg-white/20 focus:ring-4 focus:ring-white/15"
          />
        </label>
        <div className="ml-auto hidden text-right sm:block md:ml-0">
          <p className="text-sm font-semibold text-white">{ROLES[role].name}</p>
          <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">{ROLES[role].title}</p>
        </div>
        <button
          type="button"
          className="hidden size-10 overflow-hidden rounded-full ring-2 ring-white/35 transition hover:ring-white/70 sm:block"
          title="Change profile photo"
          onClick={() => go("settings")}
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt="Profile" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center bg-white/20 text-xs font-bold text-white">
              {ROLES[role].initials}
            </span>
          )}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
          onClick={() => go("settings")}
          aria-label="Settings and role guide"
        >
          <Settings className="size-4" />
          <span className="hidden lg:inline">Settings</span>
        </button>
        <button
          type="button"
          className="relative grid size-11 place-items-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
          onClick={() => setNotifOpen(true)}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-5" />
          {unread ? (
            <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-gradient-to-br from-amber to-rose px-1 text-[10px] font-bold text-white shadow">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
        <ThemePicker compact inverted />
      </header>
      <div className="border-b border-line bg-gradient-to-r from-sky/10 via-panel to-em/10 px-3 py-2 md:hidden">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (view !== "protocols") go("protocols"); }}
            placeholder="Search"
            className="min-h-11 w-full rounded-xl border border-line bg-ink-2 pr-3 pl-9 text-sm outline-none focus:border-sky"
          />
        </label>
      </div>
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-line/70 bg-gradient-to-b from-sky/15 via-panel to-em/15 p-3 md:block">
          <p className="mb-2 px-2 text-[10px] font-bold tracking-[0.2em] text-muted uppercase">Navigation</p>
          <NavItems items={items} view={view} badges={badges} onGo={go} />
        </aside>
        {navOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-scrim/70" aria-label="Close menu" onClick={() => setNav(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-line bg-gradient-to-b from-sky/20 via-panel to-em/20 p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-sky to-em text-on-accent">
                    <RoleIcon className="size-4" />
                  </span>
                  <p className="text-sm font-semibold">{ROLES[role].title}</p>
                </div>
                <button className="grid size-11 place-items-center" onClick={() => setNav(false)} aria-label="Close"><X /></button>
              </div>
              <NavItems items={items} view={view} badges={badges} onGo={go} />
            </aside>
          </div>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          {view === "dashboard" ? <Dashboard /> : null}
          {view === "protocols" ? <ProtocolList /> : null}
          {view === "screening" ? <ProtocolList preset={["submitted", "screening", "correction", "complete"]} /> : null}
          {view === "detail" ? <ProtocolDetail /> : null}
          {view === "reviews" ? <ReviewsDesk /> : null}
          {view === "committee" ? <CommitteeDesk /> : null}
          {view === "safety" ? <SafetyDesk /> : null}
          {view === "monitor" ? <MonitorDesk /> : null}
          {view === "archive" ? <ArchiveDesk /> : null}
          {view === "system" ? <SystemDesk /> : null}
          {view === "roster" ? <RosterDesk /> : null}
          {view === "analysis" ? <AnalysisReport /> : null}
          {view === "settings" ? <SettingsDesk /> : null}
        </main>
      </div>
      <footer className="border-t border-line/60 bg-panel/60 px-4 py-4 text-center text-[11px] text-muted">
        Developed by: <span className="font-semibold text-sky">Addis Ababa City Data Management Center</span>
      </footer>
      <ModalHost />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
      <Confetti n={celebrate} />
      <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-[min(100%-1.5rem,22rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-card ${t.kind === "warn" ? "border-amber/40 bg-amber text-on-accent" : "border-em/40 bg-em text-on-accent"}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavItems({
  items,
  view,
  badges,
  onGo,
}: {
  items: typeof NAV;
  view: ViewKey;
  badges: Partial<Record<ViewKey, number>>;
  onGo: (v: ViewKey) => void;
}) {
  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const Icon = ICONS[item.key];
        const tone = NAV_TONE[item.key];
        const active = view === item.key || (view === "detail" && item.key === "protocols");
        const count = badges[item.key];
        return (
          <button
            key={item.key}
            onClick={() => onGo(item.key)}
            className={`group relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-xl border px-2.5 text-left text-sm font-semibold transition ${
              active
                ? `border-transparent bg-gradient-to-r ${tone.active} text-fg shadow-sm ring-1`
                : "border-transparent text-muted hover:border-line/80 hover:bg-panel/80 hover:text-fg"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {active ? <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky to-em" /> : null}
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${tone.tile} text-white shadow-sm transition group-hover:scale-105`}>
              <Icon className="size-4" />
            </span>
            <span className="flex-1">{item.label}</span>
            {item.important ? (
              <span className="size-2 shrink-0 rounded-full bg-amber shadow-[0_0_8px_var(--color-amber)]" title="Important" />
            ) : null}
            {count ? (
              <span className="rounded-full bg-gradient-to-br from-amber to-rose px-2 py-0.5 text-[10px] font-bold text-white tabular-nums shadow-sm">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function badgeMap(role: RoleKey, acting: string, protocols: ReturnType<typeof useIrerc.getState>["protocols"], safety: ReturnType<typeof useIrerc.getState>["safety"]) {
  const list = protocols.filter((p) => visibleTo(role, p));
  const queue = workItems(role, acting, protocols).length;
  const pendingSafety = safety.filter((s) => s.status === "Pending review" && list.some((p) => p.id === s.protocolId)).length;
  const map: Partial<Record<ViewKey, number>> = {};
  if (queue) map.dashboard = queue;
  if (role === "secretariat" || role === "admin") {
    const n = list.filter((p) => ["submitted", "screening", "correction", "complete"].includes(p.status)).length;
    if (n) map.screening = n;
  }
  if (role === "reviewer") {
    const n = list.filter((p) => myReviewPending(p, acting)).length;
    if (n) map.reviews = n;
  }
  if (role === "chair" || role === "secretariat") {
    const n = protocols.filter((p) => p.status === "agenda" || p.status === "reviews_complete" || (role !== "chair" && p.status === "decided")).length;
    if (n) map.committee = n;
  }
  if (pendingSafety) map.safety = pendingSafety;
  const monitor = list.filter((p) => p.status === "active" && p.continuingDue && p.continuingDue <= addDays(TODAY, 45)).length
    + list.filter((p) => p.amendment?.status === "Pending review").length;
  if (monitor) map.monitor = monitor;
  return map;
}

function Confetti({ n }: { n: number }) {
  const [bits, setBits] = useState<{ id: string; left: number; delay: number; dur: number; color: string }[]>([]);
  useEffect(() => {
    if (!n) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["var(--color-sky)", "var(--color-em)", "var(--color-amber)", "var(--color-rose)"];
    setBits(Array.from({ length: 42 }, (_, i) => ({
      id: `${n}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1.5 + Math.random() * 1.2,
      color: colors[i % colors.length]!,
    })));
    const t = window.setTimeout(() => setBits([]), 3200);
    return () => window.clearTimeout(t);
  }, [n]);
  return (
    <>
      {bits.map((b) => (
        <span
          key={b.id}
          className="confetti-bit"
          style={{
            left: `${b.left}vw`,
            background: b.color,
            width: 8,
            height: 12,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </>
  );
}
