"use client";
import Link from "next/link";
import { PageHeading } from "@/shared/components/ui";
import { LibraryBrowser } from "./library-browser";
import styles from "./library.module.css";
export function DesignLibraryPage() {
  return (
    <>
      <Link href="/settings" className="back-link">
        ← Back to settings
      </Link>
      <PageHeading
        eyebrow="STYLE REFERENCES"
        title="Image library"
        description="70 garment models, 80 design details, and your own images. Find the right style in a few clicks."
      />
      <section className={`panel ${styles.panel}`}>
        <LibraryBrowser />
      </section>
    </>
  );
}
