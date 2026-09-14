import "server-only";
import type { SessionUser } from "@/features/team/contracts/team";
import { WorkspaceError } from "@/shared/errors";
import { readWork } from "./team-read-service";
import { readWorkHistoryDetail } from "./work-history-service";
import { collectDesignIds, readDesignImage } from "./design-library-service";
export async function readAccessibleWorkImage(
  id: string,
  thumbnail: boolean,
  code: string | null,
  user: SessionUser,
) {
  if (user.role === "worker") {
    if (!code || code.length > 300)
      throw new WorkspaceError("Image not found in your work.", 404);
    if (code.startsWith("history:")) {
      const { entry } = await readWorkHistoryDetail(code.slice(8), user);
      if (
        !collectDesignIds([
          entry.snapshot?.design,
          entry.snapshot?.measurement?.image,
        ]).includes(id)
      )
        throw new WorkspaceError("Image not found in your work.", 404);
    } else {
      const work = await readWork(
        { page: 1, pageSize: 1, station: "all", status: "all", code },
        user,
      );
      if (
        !work.pieces.some((p) =>
          collectDesignIds([p.item.design, p.item.measurement?.image]).includes(
            id,
          ),
        )
      )
        throw new WorkspaceError("Image not found in your work.", 404);
    }
  }
  return readDesignImage(id, thumbnail);
}
