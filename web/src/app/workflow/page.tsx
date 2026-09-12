import { Suspense } from "react";
import { Workflow } from "@/components/studio-pages";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading workflow…</p>}>
      <Workflow />
    </Suspense>
  );
}
