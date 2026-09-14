import { WorkHistory } from "@/features/team/components/work-history";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading work history…</p>}>
      <WorkHistory />
    </Suspense>
  );
}
