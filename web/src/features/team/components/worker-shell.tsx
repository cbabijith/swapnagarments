"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Scissors,
  ScanLine,
  ListTodo,
  History,
  UserRound,
  X,
} from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { WorkQueue } from "./work-queue";
import { WorkHistory } from "./work-history";
import { WorkHistoryDetail } from "./work-history-detail";
import { WorkerProfilePage } from "./worker-profile";
import { Scan } from "@/features/qr-tags/components/qr-tags";
import styles from "./worker-shell.module.css";
export function WorkerShell() {
  const { owner, notice, notify } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const historyDetail =
    /^\/my-work\/history\/[^/]+$/.test(pathname) && Boolean(params.id);
  useEffect(() => {
    if (
      pathname !== "/my-work" &&
      pathname !== "/my-work/history" &&
      !historyDetail &&
      pathname !== "/my-work/profile" &&
      pathname !== "/scan"
    )
      router.replace("/my-work");
  }, [pathname, router, historyDetail]);
  return (
    <div className={`worker-shell ${styles.shell}`}>
      <a className="skip-link" href="#main-content">
        Skip to work
      </a>
      <header className="worker-header">
        <Link href="/my-work" className="brand">
          <Scissors size={25} />
          <strong>
            swapna <small>GARMENTS</small>
          </strong>
        </Link>
        <div>
          {pathname === "/my-work/profile" ? (
            <AccountMenu />
          ) : (
            <Link
              className="worker-account-link"
              href="/my-work/profile"
              aria-label={`View ${owner.name}'s profile`}
            >
              <UserRound size={17} />
              <span>{owner.name}</span>
            </Link>
          )}
        </div>
      </header>
      <main className="page-content" id="main-content" tabIndex={-1}>
        <Suspense fallback={<p>Loading your work…</p>}>
          {pathname === "/scan" ? (
            <Scan />
          ) : pathname === "/my-work/history" ? (
            <WorkHistory />
          ) : historyDetail ? (
            <WorkHistoryDetail key={params.id} id={params.id!} />
          ) : pathname === "/my-work/profile" ? (
            <WorkerProfilePage />
          ) : (
            <WorkQueue />
          )}
        </Suspense>
      </main>
      <nav className="worker-nav" aria-label="Worker navigation">
        <Link
          href="/my-work"
          aria-current={pathname === "/my-work" ? "page" : undefined}
        >
          <ListTodo size={20} />
          My work
        </Link>
        <Link
          href="/my-work/history"
          aria-current={
            pathname === "/my-work/history" || historyDetail
              ? "page"
              : undefined
          }
        >
          <History size={20} />
          History
        </Link>
        <Link
          href="/scan"
          aria-current={pathname === "/scan" ? "page" : undefined}
        >
          <ScanLine size={20} />
          Scan piece
        </Link>
        <Link
          href="/my-work/profile"
          aria-current={pathname === "/my-work/profile" ? "page" : undefined}
        >
          <UserRound size={20} />
          Profile
        </Link>
      </nav>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
