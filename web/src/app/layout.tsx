import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { AppShell } from "@/components/app-shell";
import { createPreviewWorkspace, emptyWorkspace } from "@/lib/workspace";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swapna Garments — Tailoring Management",
  description:
    "Order, measurement, workflow, and notification management for the Swapna Garments custom tailoring shop.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#184e40",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode =
    process.env.WORKSPACE_PREVIEW === "true" ||
    (!process.env.DATABASE_URL && process.env.NODE_ENV === "development")
      ? "preview"
      : "live";
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <WorkspaceProvider
          mode={mode}
          initialData={
            mode === "preview" ? createPreviewWorkspace() : emptyWorkspace()
          }
        >
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
