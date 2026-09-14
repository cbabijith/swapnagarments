import {
  workHistoryQuery,
  type WorkHistoryQuery,
} from "../contracts/work-history";

export function historyFilters(
  params: Pick<URLSearchParams, "get">,
): WorkHistoryQuery {
  const parsed = workHistoryQuery.safeParse({
    page: params.get("page") ?? 1,
    pageSize: 20,
    q: params.get("q") ?? "",
    station: params.get("station") ?? "all",
  });
  return parsed.success ? parsed.data : workHistoryQuery.parse({});
}

export function historyFilterQuery(input: WorkHistoryQuery) {
  return new URLSearchParams({
    page: String(input.page),
    q: input.q,
    station: input.station,
  }).toString();
}

export const completedWorkDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
