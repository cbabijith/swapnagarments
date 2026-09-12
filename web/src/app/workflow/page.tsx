import { Suspense } from "react";
import { Workflow } from "@/features/workflow/components/workflow";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading workflow…</p>}>
      <Workflow />
    </Suspense>
  );
}
