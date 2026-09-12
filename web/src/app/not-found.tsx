import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>This page is still on the cutting table.</h1>
      <p>Let’s get you back to your workspace.</p>
      <Link className="button primary" href="/">
        Back to overview
      </Link>
    </div>
  );
}
