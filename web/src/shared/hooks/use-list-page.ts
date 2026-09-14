"use client";

import { useCallback, useState } from "react";

/** A search, selected record or filter change starts a new scrolling list. */
export function useListPage(key: string, initialPage = 1) {
  const [selection, setSelection] = useState({ key, page: initialPage });
  const setPage = useCallback(
    (page: number) => setSelection({ key, page }),
    [key],
  );
  return [selection.key === key ? selection.page : 1, setPage] as const;
}
