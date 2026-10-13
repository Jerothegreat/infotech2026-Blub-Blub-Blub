"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Screen = "dashboard" | "announcements" | "sources";
type Announcement = {
  id: number;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  status: "draft" | "published" | "archived";
};
type Source = {
  id: number;
  title: string;
  currentVersion: {
    versionNumber: number;
    upload: { name: string };
  } | null;
};
type ApiError = { error?: { message?: string } };
const AUTH_STORAGE_KEY = "heronhub_department_admin";
type DemoRole = "department_admin" | "system_admin";

const navigation: { label: string; screen: Screen }[] = [
  { label: "Dashboard", screen: "dashboard" },
  { label: "Announcements", screen: "announcements" },
  { label: "Sources", screen: "sources" },
];

function formatDate(value: string | null) {
  if (!value) return "No end date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(
      body.error?.message ?? "The request could not be completed.",
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export default function Dashboard() {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const session = storedSession
      ? request<{ departmentId: number; role: DemoRole }>("/api/demo/session")
      : Promise.resolve(null);
    void session
      .then((currentSession) => {
        if (currentSession?.role === "system_admin") {
          window.localStorage.setItem(AUTH_STORAGE_KEY, currentSession.role);
          router.replace("/system-admin");
          return;
        }
        if (currentSession) setDepartmentId(currentSession.departmentId);
        if (!currentSession) window.localStorage.removeItem(AUTH_STORAGE_KEY);
      })
      .catch(() => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      })
      .finally(() => setAuthChecked(true));
  }, [router]);

  if (!authChecked)
    return (
      <main className="sign-in-page">
        <p role="status">Restoring your session...</p>
      </main>
    );
  return departmentId ? (
    <DepartmentAdminDashboard
      departmentId={departmentId}
      onSignOut={() => setDepartmentId(null)}
    />
  ) : (
    <SignInScreen
      onAuthenticated={(session) => {
        window.localStorage.setItem(AUTH_STORAGE_KEY, session.role);
        if (session.role === "system_admin") {
          router.push("/system-admin");
          return;
        }
        setDepartmentId(session.departmentId);
      }}
    />
  );
}

function SignInScreen({
  onAuthenticated,
}: {
  onAuthenticated: (session: { departmentId: number; role: DemoRole }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const session = await request<{ departmentId: number; role: DemoRole }>(
        "/api/demo/session",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      onAuthenticated(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-panel" aria-labelledby="sign-in-title">
        <a className="sign-in-brand" href="#sign-in-title">
          Heron&apos;s <span>Guide</span>
        </a>
        <p className="eyebrow">UMak administration</p>
        <h1 id="sign-in-title">Log in to Heron&apos;s Guide</h1>
        <p>
          Use your assigned University of Makati administration account to
          continue.
        </p>
        <form className="sign-in-form" onSubmit={signIn}>
          <div className="field">
            <label htmlFor="email">UMak email</label>
            <input
              autoComplete="username"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-control">
              <input
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={passwordVisible ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                className="password-toggle"
                onClick={() => setPasswordVisible((visible) => !visible)}
                type="button"
              >
                Show
              </button>
            </div>
          </div>
          {error && (
            <p className="form-status" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}

function DepartmentAdminDashboard({
  departmentId,
  onSignOut,
}: {
  departmentId: number;
  onSignOut: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function getDashboardData() {
    return Promise.all([
      request<{ announcements: Announcement[] }>("/api/v1/admin/announcements"),
      request<{ sources: Source[] }>("/api/v1/admin/sources"),
    ]);
  }

  useEffect(() => {
    let active = true;
    void getDashboardData()
      .then(([announcementData, sourceData]) => {
        if (!active) return;
        setAnnouncements(announcementData.announcements);
        setSources(sourceData.sources);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load department data.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [announcementData, sourceData] = await getDashboardData();
      setAnnouncements(announcementData.announcements);
      setSources(sourceData.sources);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load department data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/demo/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    onSignOut();
  }

  return (
    <main className="admin-console">
      <header className="console-bar">
        <a
          className="console-brand"
          href="#main-content"
          aria-label="Heron's Guide dashboard"
        >
          Heron&apos;s <span>Guide</span>
        </a>
        <nav className="console-nav" aria-label="Department Admin navigation">
          {navigation.map((item) => (
            <button
              className={screen === item.screen ? "is-active" : ""}
              key={item.screen}
              onClick={() => {
                setNotice("");
                setScreen(item.screen);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <span className="console-role">CCIS Department Admin</span>
        <button
          className="console-signout"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
        </button>
      </header>
      <section className="console-workspace" id="main-content">
        {error && (
          <p className="form-status" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Loading department data...</p>
        ) : (
          <>
            {screen === "dashboard" && (
              <DashboardScreen
                announcements={announcements}
                onAnnounce={() => setScreen("announcements")}
                onSources={() => setScreen("sources")}
                sources={sources}
              />
            )}
            {screen === "announcements" && (
              <AnnouncementScreen
                departmentId={departmentId}
                onCancel={() => setScreen("dashboard")}
                onPublished={async () => {
                  await reload();
                  setNotice("Announcement published to CCIS.");
                  setScreen("dashboard");
                }}
              />
            )}
            {screen === "sources" && (
              <SourceScreen
                notice={notice}
                onUploaded={async (message) => {
                  await reload();
                  setNotice(message);
                }}
                sources={sources}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function PageHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Department operations</p>
        <h1>{title}</h1>
        {children}
      </div>
      <span className="tenant-badge">Department: CCIS</span>
    </header>
  );
}

function DashboardScreen({
  announcements,
  onAnnounce,
  onSources,
  sources,
}: {
  announcements: Announcement[];
  onAnnounce: () => void;
  onSources: () => void;
  sources: Source[];
}) {
  const activeNotices = announcements.filter(
    (announcement) => announcement.status === "published",
  ).length;
  const availableSources = sources.filter((source) => source.currentVersion).length;
  return (
    <>
      <PageHeader title="Admin dashboard">
        <p>
          Publish a college update or manage sources owned by the CCIS
          department.
        </p>
      </PageHeader>
      <div className="page-actions">
        <button className="button primary" onClick={onAnnounce} type="button">
          Publish announcement
        </button>
        <button className="button secondary" onClick={onSources} type="button">
          Manage sources
        </button>
      </div>
      <section className="metric-grid" aria-label="Department overview">
        <Metric
          label="Available Sources"
          value={String(availableSources)}
          action="Manage sources"
          onAction={onSources}
          tone="yellow"
        />
        <Metric
          label="Active notices"
          value={String(activeNotices)}
          action="Manage notices"
          onAction={onAnnounce}
          tone="orange"
        />
      </section>
      <section className="flat-list" aria-labelledby="announcement-history">
        <div className="list-heading">
          <h2 id="announcement-history">Announcement history</h2>
          <button onClick={onAnnounce} type="button">
            Publish announcement
          </button>
        </div>
        {announcements.length === 0 ? (
          <p>No announcements have been published for CCIS.</p>
        ) : (
          announcements.map((item) => (
            <article className="data-row" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
              <span>CCIS</span>
              <strong className={item.status === "published" ? "verified" : ""}>
                {item.status === "published"
                  ? `Published, ends ${formatDate(item.endsAt)}`
                  : item.status}
              </strong>
            </article>
          ))
        )}
      </section>
      <section className="flat-list" aria-labelledby="knowledge-base">
        <div className="list-heading">
          <h2 id="knowledge-base">Knowledge base</h2>
          <button onClick={onSources} type="button">
            Manage CCIS sources
          </button>
        </div>
        {sources.length === 0 ? (
          <p>No CCIS sources have been uploaded.</p>
        ) : (
          sources.map((source) => (
            <article className="data-row" key={source.id}>
              <div>
                <h3>{source.title}</h3>
                <p>
                  {source.currentVersion?.upload.name ?? "No uploaded file yet"}
                </p>
              </div>
              <span>CCIS</span>
              <strong className={source.currentVersion ? "verified" : ""}>
                {source.currentVersion
                  ? `Available, version ${source.currentVersion.versionNumber}`
                  : "No file"}
              </strong>
              <button onClick={onSources} type="button">
                Replace
              </button>
            </article>
          ))
        )}
      </section>
    </>
  );
}

function Metric({
  action,
  label,
  onAction,
  tone,
  value,
}: {
  action: string;
  label: string;
  onAction: () => void;
  tone: string;
  value: string;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <button onClick={onAction} type="button">
        {action}
      </button>
    </article>
  );
}

function AnnouncementScreen({
  departmentId,
  onCancel,
  onPublished,
}: {
  departmentId: number;
  onCancel: () => void;
  onPublished: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const titleId = useId();
  const bodyId = useId();

  function requestPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !body.trim() || !startsAt || !endsAt)
      return setError(
        "Complete the title, message, and active dates before publishing.",
      );
    if (endsAt < startsAt)
      return setError("The end date must be on or after the start date.");
    setShowConfirmation(true);
  }

  async function publish() {
    try {
      await request("/api/v1/admin/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          startsAt,
          endsAt,
          audienceDepartmentIds: [departmentId],
        }),
      });
      await onPublished();
    } catch (reason) {
      setShowConfirmation(false);
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to publish the announcement.",
      );
    }
  }

  return (
    <>
      <PageHeader title="Create announcement">
        <p>Publish a dated update to your CCIS students.</p>
      </PageHeader>
      <form className="editor-form" onSubmit={requestPublish}>
        <div className="field">
          <label htmlFor={titleId}>
            Announcement title <span aria-hidden="true">*</span>
          </label>
          <input
            id={titleId}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </div>
        <div className="field">
          <label htmlFor={bodyId}>
            Message <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={bodyId}
            onChange={(event) => setBody(event.target.value)}
            value={body}
          />
        </div>
        <div className="date-fields">
          <div className="field">
            <label htmlFor="announcement-start">
              Starts <span aria-hidden="true">*</span>
            </label>
            <input
              id="announcement-start"
              onChange={(event) => setStartsAt(event.target.value)}
              type="date"
              value={startsAt}
            />
          </div>
          <div className="field">
            <label htmlFor="announcement-end">
              Ends <span aria-hidden="true">*</span>
            </label>
            <input
              id="announcement-end"
              onChange={(event) => setEndsAt(event.target.value)}
              type="date"
              value={endsAt}
            />
          </div>
        </div>
        <p className="form-note">
          What we collect: the announcement content and its active dates. This
          announcement publishes to your CCIS tenant.
        </p>
        {error && (
          <p className="form-status" role="alert">
            {error}
          </p>
        )}
        <footer className="form-footer">
          <button className="text-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="button primary" type="submit">
            Publish announcement
          </button>
        </footer>
      </form>
      {showConfirmation && (
        <div
          aria-labelledby="publish-dialog-title"
          aria-modal="true"
          className="modal-backdrop"
          role="dialog"
        >
          <section className="confirmation-dialog">
            <p className="eyebrow">Final check</p>
            <h2 id="publish-dialog-title">Publish announcement?</h2>
            <p>
              This will publish to CCIS students from {formatDate(startsAt)}{" "}
              through {formatDate(endsAt)}.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setShowConfirmation(false)}
                type="button"
              >
                Go back
              </button>
              <button
                className="button primary"
                onClick={() => void publish()}
                type="button"
              >
                Publish announcement
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function SourceScreen({
  notice,
  onUploaded,
  sources,
}: {
  notice: string;
  onUploaded: (message: string) => Promise<void>;
  sources: Source[];
}) {
  const [sourceId, setSourceId] = useState(
    sources[0]?.id ? String(sources[0].id) : "",
  );
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = sources.find((source) => source.id === Number(sourceId));

  async function upload() {
    if (!file) return setError("Choose a source file before uploading.");
    setError("");
    const form = new FormData();
    form.set("file", file);
    const replacing = Boolean(selected);
    if (replacing) {
      await request(`/api/v1/admin/sources/${selected?.id}`, {
        method: "PUT",
        body: form,
      });
    } else {
      if (!title.trim()) return setError("Enter a title for the new source.");
      form.set("title", title.trim());
      await request("/api/v1/admin/sources", { method: "POST", body: form });
    }
    await onUploaded(
      replacing
        ? "Replacement uploaded and available."
        : "Source uploaded and available.",
    );
  }

  return (
    <>
      <PageHeader title="Manage sources">
        <p>
          Add a CCIS source or replace a version without interrupting answers
          backed by the current source.
        </p>
      </PageHeader>
      <section className="source-workflow">
        <div className="source-fields">
          <div className="field">
            <label htmlFor="source-document">Source document</label>
            <select
              id="source-document"
              onChange={(event) => setSourceId(event.target.value)}
              value={sourceId}
            >
              <option value="">Upload a new source</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </div>
          {!selected && (
            <div className="field">
              <label htmlFor="source-title">Source title</label>
              <input
                id="source-title"
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="replacement-status">Replacement status</label>
            <input
              id="replacement-status"
              readOnly
              value={
                selected?.currentVersion
                  ? `Available, version ${selected.currentVersion.versionNumber}`
                  : "New source"
              }
            />
          </div>
        </div>
        <div className="dropzone">
          <strong>Choose a .md, .pdf, or .docx file</strong>
          <p>
            {selected
              ? "The replacement becomes available as soon as the upload completes."
              : "The file becomes available as soon as the upload completes."}
          </p>
          <button
            className="button secondary"
            onClick={() => fileInput.current?.click()}
            type="button"
          >
            Choose file
          </button>
          {file && <span className="selected-file">Selected: {file.name}</span>}
          <input
            accept=".md,.pdf,.docx"
            className="visually-hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            ref={fileInput}
            type="file"
          />
        </div>
        <button
          className="button primary"
          onClick={() => void upload()}
          type="button"
        >
          {selected ? "Replace source" : "Upload source"}
        </button>
        {error && (
          <p className="form-status" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="form-status" role="status">
            {notice}
          </p>
        )}
      </section>
    </>
  );
}
