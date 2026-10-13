"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AUTH_STORAGE_KEY = "heronhub_department_admin";

type DemoSession = {
  role: "department_admin" | "system_admin";
};

export default function SystemAdminPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    void fetch("/api/demo/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No active session");
        return (await response.json()) as DemoSession;
      })
      .then((session) => {
        if (session.role !== "system_admin") throw new Error("Not a system admin");
        window.localStorage.setItem(AUTH_STORAGE_KEY, session.role);
        setVerified(true);
      })
      .catch(() => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        router.replace("/");
      });
  }, [router]);

  async function signOut() {
    await fetch("/api/demo/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push("/");
  }

  if (!verified) {
    return <main className="sign-in-page"><p role="status">Restoring your session...</p></main>;
  }

  return (
    <main className="admin-console">
      <header className="console-bar">
        <a className="console-brand" href="#main-content">Heron&apos;s <span>Guide</span></a>
        <span className="console-role">System Admin</span>
        <button className="console-signout" onClick={() => void signOut()} type="button">Sign out</button>
      </header>
      <section className="console-workspace" id="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">University operations</p>
            <h1>System Admin dashboard</h1>
            <p>Manage college tenants and department-admin access for the Heron&apos;s Guide demo.</p>
          </div>
          <span className="tenant-badge">University-wide</span>
        </header>
        <section className="empty-state" aria-labelledby="system-admin-ready">
          <h2 id="system-admin-ready">System administration ready</h2>
          <p>Your verified demo session can access the system tenant and user management APIs.</p>
        </section>
      </section>
    </main>
  );
}
