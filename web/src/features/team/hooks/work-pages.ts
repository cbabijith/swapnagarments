import { recordPage, uniqueRecords } from "@/shared/queries/infinite-pages";
import type { WorkRead } from "../types/queries";

export const workPageAdapter = {
  page: recordPage,
  merge: (pages: WorkRead[]): WorkRead => ({
    ...pages[pages.length - 1],
    pieces: uniqueRecords(
      pages.flatMap((page) => page.pieces),
      (piece) => piece.item.id,
    ),
  }),
};
