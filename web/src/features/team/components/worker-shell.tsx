"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Scissors, ScanLine, ListTodo, LogOut, X } from "lucide-react";
import { useWorkspace } from "@/shared/compat/workspace-provider";
import { WorkQueue } from "./work-queue";
import { Scan } from "@/features/qr-tags/components/qr-tags";
export function WorkerShell() {
  const { owner, signOut, notice, notify } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname !== "/my-work" && pathname !== "/scan")
      router.replace("/my-work");
  }, [pathname, router]);
  return (
    <div className="worker-shell">
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
          <span>{owner.name}</span>
          <button className="button" onClick={() => void signOut()}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>
      <main className="page-content" id="main-content">
        <Suspense fallback={<p>Loading your work…</p>}>
          {pathname === "/scan" ? <Scan /> : <WorkQueue />}
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
          href="/scan"
          aria-current={pathname === "/scan" ? "page" : undefined}
        >
          <ScanLine size={20} />
          Scan piece
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
