import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db";
import {
  shopSettings,
  garments,
  customerProfiles,
} from "@/db/schema/catalogue";
import type { Catalogue } from "@/features/settings/contracts/catalogue";
import type { Customer, Workspace } from "@/shared/workspace";
import { defaultCatalogue } from "@/features/settings/domain/catalogue";
import { withRead } from "./read-context";

export async function readStoredCatalogue(
  tx: DatabaseTransaction,
): Promise<Catalogue | undefined> {
  const [settings] = await tx
    .select()
    .from(shopSettings)
    .where(eq(shopSettings.workspaceId, 1));
  if (!settings) return undefined;
  const rows = await tx
    .select()
    .from(garments)
    .where(eq(garments.workspaceId, 1))
    .orderBy(asc(garments.position));
  return {
    ...(settings.workflows ? { workflows: settings.workflows } : {}),
    revision: settings.revision,
    defaultGarmentId: settings.defaultGarmentId,
    leadDays: settings.leadDays,
    garments: rows.map(
      ({
        workspaceId: _shop,
        position: _position,
        illustrationId,
        image,
        referenceImages,
        designConfig,
        workflowId,
        ...g
      }) => {
        void _shop;
        void _position;
        return {
          ...g,
          ...(workflowId ? { workflowId } : {}),
          ...(illustrationId === null ? {} : { illustrationId }),
          ...(image ? { image } : {}),
          ...(referenceImages ? { referenceImages } : {}),
          ...(designConfig ? { designConfig } : {}),
        };
      },
    ),
  };
}
export const readCatalogue = () =>
  withRead(async ({ tx, revision, legacy }) => ({
    revision,
    catalogue:
      (legacy ? legacy.catalogue : await readStoredCatalogue(tx)) ??
      defaultCatalogue(),
  }));
export async function writeCatalogue(
  tx: DatabaseTransaction,
  before: Workspace,
  after: Workspace,
) {
  const catalogue = after.catalogue;
  if (
    !catalogue ||
    JSON.stringify(before.catalogue) === JSON.stringify(catalogue)
  )
    return;
  await tx
    .insert(shopSettings)
    .values({
      workspaceId: 1,
      revision: catalogue.revision,
      defaultGarmentId: catalogue.defaultGarmentId,
      leadDays: catalogue.leadDays,
      workflows: catalogue.workflows ?? null,
    })
    .onConflictDoUpdate({
      target: shopSettings.workspaceId,
      set: {
        revision: catalogue.revision,
        defaultGarmentId: catalogue.defaultGarmentId,
        leadDays: catalogue.leadDays,
        workflows: catalogue.workflows ?? null,
      },
    });
  for (const [position, garment] of catalogue.garments.entries()) {
    const row = {
      ...garment,
      workflowId: garment.workflowId ?? null,
      illustrationId: garment.illustrationId ?? null,
      image: garment.image ?? null,
      referenceImages: garment.referenceImages ?? null,
      designConfig: garment.designConfig ?? null,
      position,
    };
    await tx
      .insert(garments)
      .values(row)
      .onConflictDoUpdate({ target: garments.id, set: row });
  }
}
export async function attachProfiles(
  tx: DatabaseTransaction,
  customers: Customer[],
) {
  if (!customers.length) return;
  const rows = await tx
    .select()
    .from(customerProfiles)
    .where(
      inArray(
        customerProfiles.customerId,
        customers.map((c) => c.id),
      ),
    )
    .orderBy(asc(customerProfiles.position));
  for (const customer of customers) {
    const profiles = rows
      .filter((r) => r.customerId === customer.id)
      .map((r) => r.profile);
    if (profiles.length) customer.profiles = profiles;
  }
}
export async function writeProfiles(
  tx: DatabaseTransaction,
  before: Workspace,
  after: Workspace,
) {
  for (const customer of after.customers)
    for (const [position, profile] of (customer.profiles ?? []).entries()) {
      const old = before.customers
        .find((c) => c.id === customer.id)
        ?.profiles?.find((p) => p.garmentId === profile.garmentId);
      const oldPosition = before.customers
        .find((c) => c.id === customer.id)
        ?.profiles?.findIndex((p) => p.garmentId === profile.garmentId);
      if (
        JSON.stringify(old) === JSON.stringify(profile) &&
        oldPosition === position
      )
        continue;
      await tx
        .insert(customerProfiles)
        .values({
          customerId: customer.id,
          garmentId: profile.garmentId,
          profile,
          position,
        })
        .onConflictDoUpdate({
          target: [customerProfiles.customerId, customerProfiles.garmentId],
          set: { profile, position },
        });
    }
}
