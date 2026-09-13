import { Suspense } from "react";
import { WorkQueue } from "@/features/team/components/work-queue";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading work…</p>}>
      <WorkQueue />
    </Suspense>
  );
}
