import { Suspense } from "react";
import { WorkHistoryDetail } from "@/features/team/components/work-history-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p>Loading completed work…</p>}>
      <WorkHistoryDetail id={id} />
    </Suspense>
  );
}
