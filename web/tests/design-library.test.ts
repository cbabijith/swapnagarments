import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { ensureSchema } from "../src/db";
import {
  builtinAssets,
  builtinById,
} from "../src/features/design-library/domain/registry";
import {
  garmentImage,
  suggestedDesigns,
  snapshotDesign,
} from "../src/features/design-library/domain/designs";
import {
  libraryQuerySchema,
  toAssetRef,
} from "../src/features/design-library/contracts";
import { defaultCatalogue } from "../src/features/settings/domain/catalogue";
import {
  browseDesignLibrary,
  updateDesignAsset,
  uploadDesignAsset,
} from "../src/services/design-library-service";
import {
  readWorkspace,
  executeWorkspaceCommand,
} from "../src/services/workspace-service";
import { readCatalogue } from "../src/services/catalogue-storage";
import { readOrder } from "../src/services/order-read-service";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import { storage } from "../src/integrations/storage";
import { processDesignImage } from "../src/integrations/storage/design-images";
import { cleanupDesignUploads } from "../src/services/design-cleanup-service";
import { GET, PATCH } from "../src/app/api/design-library/route";
import { POST } from "../src/app/api/design-library/upload/route";
import { GET as imageGet } from "../src/app/api/design-library/[id]/image/route";
import { shopDate } from "../src/shared/workspace";
import type { Intake } from "../src/features/orders/contracts/intake";
import type { WorkspaceMutation } from "../src/shared/contracts/command";

const owner = { name: "Image Test", email: "image@example.test" };
const send = (action: WorkspaceMutation, mutationId = crypto.randomUUID()) =>
  executeWorkspaceCommand({ action, mutationId }, owner);
const query = (values: Record<string, string | number> = {}) =>
  libraryQuerySchema.parse(values);
async function transition(direction: "cutover" | "rollback") {
  const s = await storageStatus();
  return transitionWorkspaceStorage({
    direction,
    expectedRevision: s.revision,
    expectedChecksum: s.checksum,
    backupReference: "isolated-design-test",
  });
}

test("150 distinct, local SVG drawings cover the complete catalogue and relevant garment groups", () => {
  assert.equal(builtinAssets.length, 150);
  assert.equal(builtinAssets.filter((a) => a.kind === "garment").length, 70);
  const shapes = new Set<string>();
  for (const a of builtinAssets) {
    const svg = readFileSync(`public/design-library/v1/${a.id}.svg`, "utf8");
    assert(!/<script|<foreignObject|https?:\/\/[^w]/.test(svg));
    assert(svg.includes('viewBox="0 0 128 160"'));
    shapes.add(
      createHash("sha256")
        .update(svg.replace(/<title>.*?<\/title>/, " "))
        .digest("hex"),
    );
  }
  assert.equal(shapes.size, 150, "Every entry must have its own drawing");
  assert.equal(garmentImage({ name: "Mundu" }).id, "garment-dhoti-or-mundu");
  assert.equal(
    garmentImage({ name: "Blouse", illustrationId: "shirt" }).id,
    "garment-shirt",
    "Existing explicit image choices take precedence over the garment name",
  );
  const bottom = {
    ...defaultCatalogue().garments[0],
    image: toAssetRef(builtinById["garment-straight-trousers"]),
  };
  assert.deepEqual(
    suggestedDesigns(bottom).groups.map((g) => g.kind),
    ["closure", "hem", "pocket"],
  );
  assert.throws(
    () =>
      snapshotDesign(bottom, {
        choices: { "front-neck": "detail-front-neck-round" },
        references: [],
        notes: "",
      }),
    /not enabled/,
  );
  assert.throws(
    () =>
      snapshotDesign(defaultCatalogue().garments[0], {
        choices: {
          "sleeve-length": "detail-sleeve-length-sleeveless",
          "sleeve-shape": "detail-sleeve-shape-puff-sleeve",
        },
        references: [],
        notes: "",
      }),
    /sleeveless/,
  );
});

test("image processing rotates EXIF, strips metadata, bounds size and rejects SVG and invalid bytes", async () => {
  const original = await sharp({
    create: { width: 300, height: 120, channels: 3, background: "#aaca9a" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const processed = await processDesignImage(original);
  const metadata = await sharp(processed.image).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 120);
  assert.equal(metadata.height, 300);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  const thumb = await sharp(processed.thumbnail).metadata();
  assert(thumb.width! <= 256 && thumb.height! <= 320);
  await assert.rejects(
    processDesignImage(Buffer.alloc(8 * 1024 * 1024 + 1)),
    /8 MB/,
  );
  await assert.rejects(
    processDesignImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      ),
    ),
    /valid, still/,
  );
  await assert.rejects(
    processDesignImage(Buffer.from("not an image")),
    /valid, still/,
  );
  const huge = await sharp({
    create: { width: 4500, height: 4500, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(processDesignImage(huge), /20 megapixels/);
});

test("library pagination, private uploads, retries, immutable order designs and media survive rollback and recutover", async () => {
  const { engine } = isolatedDatabase();
  const objects = new Map<string, Buffer>(),
    modified = new Map<string, Date>();
  let failThumbnail = false;
  process.env.AWS_ENDPOINT_URL = "http://127.0.0.1:1";
  process.env.AWS_S3_BUCKET_NAME = "isolated-images";
  process.env.AWS_ACCESS_KEY_ID = "isolated";
  process.env.AWS_SECRET_ACCESS_KEY = "isolated";
  const objectMock = mock.method(
    storage(),
    "send",
    async (command: { input: { Key?: string; Body?: Buffer } }) => {
      const { Key, Body } = command.input;
      if (command.constructor.name === "ListObjectsV2Command")
        return {
          Contents: [...objects.keys()].map((Key) => ({
            Key,
            LastModified: modified.get(Key) ?? new Date(),
          })),
        };
      if (command.constructor.name === "HeadObjectCommand")
        return { LastModified: modified.get(Key!) ?? new Date() };
      if (command.constructor.name === "DeleteObjectCommand") {
        objects.delete(Key!);
        return {};
      }
      if (Body) {
        if (failThumbnail && Key!.endsWith("thumbnail.webp"))
          throw new Error("isolated interrupted upload");
        objects.set(Key!, Buffer.from(Body));
        modified.set(Key!, new Date());
        return {};
      }
      const bytes = objects.get(Key!);
      if (!bytes) throw new Error("missing isolated image");
      return {
        Body: { transformToByteArray: async () => new Uint8Array(bytes) },
      };
    },
  );
  try {
    await ensureSchema();
    await engine.query(
      "INSERT INTO sg_owner(id,name,email,password_hash,salt) VALUES (1,$1,$2,'test','test')",
      [owner.name, owner.email],
    );
    const token = "ab".repeat(32);
    await engine.query(
      "INSERT INTO sg_sessions(token_hash,owner_id,expires_at) VALUES ($1,1,'2030-01-01Z')",
      [createHash("sha256").update(token).digest("hex")],
    );
    const request = (
      url: string,
      method = "GET",
      body?: unknown,
      authenticated = true,
    ) =>
      new NextRequest("http://shop.test" + url, {
        method,
        headers: {
          origin: "http://shop.test",
          ...(authenticated ? { cookie: `swapna_session=${token}` } : {}),
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal(
      (
        await GET(
          request("/api/design-library?kind=invalid", "GET", undefined, false),
        )
      ).status,
      401,
    );
    assert.equal(
      (await PATCH(request("/api/design-library", "PATCH", {}, false))).status,
      401,
    );
    assert.equal(
      (await POST(request("/api/design-library/upload", "POST", {}, false)))
        .status,
      401,
    );
    assert.equal(
      (
        await imageGet(
          request(
            "/api/design-library/upload-missing/image",
            "GET",
            undefined,
            false,
          ),
          { params: Promise.resolve({ id: "upload-missing" }) },
        )
      ).status,
      401,
    );
    const seen = new Set<string>();
    for (let page = 1; page <= 13; page++) {
      const result = await browseDesignLibrary(query({ page }));
      assert.equal(result.total, 150);
      result.items.forEach((a) => seen.add(a.id));
    }
    assert.equal(seen.size, 150);
    assert.equal((await browseDesignLibrary(query({ q: "sari" }))).total, 2);
    assert.equal((await browseDesignLibrary(query({ q: "%" }))).total, 0);
    const favourite = await updateDesignAsset({
      id: "garment-shirt",
      revision: 0,
      favourite: true,
    });
    assert.equal(
      (await browseDesignLibrary(query({ source: "favourite" }))).items[0].id,
      favourite.id,
    );
    await assert.rejects(
      updateDesignAsset({ id: favourite.id, revision: 0, active: false }),
      /another device/,
    );
    const source = await sharp({
      create: { width: 260, height: 180, channels: 3, background: "#abc79e" },
    })
      .png()
      .toBuffer();
    const metadata = {
      id: crypto.randomUUID(),
      label: "Shop blouse",
      kind: "garment" as const,
      view: "front" as const,
    };
    failThumbnail = true;
    await assert.rejects(
      uploadDesignAsset(metadata, source),
      /could not be uploaded/,
    );
    assert.equal(
      (await browseDesignLibrary(query({ source: "upload" }))).total,
      0,
    );
    failThumbnail = false;
    const upload = await uploadDesignAsset(metadata, source);
    assert.equal((await uploadDesignAsset(metadata, source)).id, upload.id);
    assert.equal(
      (await browseDesignLibrary(query({ source: "upload" }))).total,
      1,
    );
    await assert.rejects(
      uploadDesignAsset({ ...metadata, label: "Changed metadata" }, source),
      /already used/,
    );
    const photoMetadata = {
      id: crypto.randomUUID(),
      label: "Customer reference",
      kind: "reference" as const,
      view: "reference" as const,
    };
    const form = new FormData();
    for (const [key, value] of Object.entries(photoMetadata))
      form.set(key, value);
    form.set(
      "file",
      new File([new Uint8Array(source)], "photo.png", { type: "image/png" }),
    );
    const posted = await POST(
      new NextRequest("http://shop.test/api/design-library/upload", {
        method: "POST",
        headers: {
          origin: "http://shop.test",
          cookie: `swapna_session=${token}`,
        },
        body: form,
      }),
    );
    assert.equal(posted.status, 201);
    const photo = (await posted.json()).asset;
    const image = await imageGet(
      request(`/api/design-library/${photo.id}/image`),
      { params: Promise.resolve({ id: photo.id }) },
    );
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");
    assert(image.headers.get("cache-control")?.includes("no-store"));
    assert((await image.arrayBuffer()).byteLength > 0);
    await transition("cutover");
    const catalogue = defaultCatalogue();
    catalogue.garments[0].image = {
      ...toAssetRef(upload),
      label: "Untrusted client label",
    };
    catalogue.garments[0].designConfig = {
      groups: [
        {
          kind: "front-neck",
          assetIds: ["detail-front-neck-round", "detail-front-neck-v-neck"],
        },
        {
          kind: "sleeve-length",
          assetIds: [
            "detail-sleeve-length-full",
            "detail-sleeve-length-sleeveless",
          ],
        },
      ],
      presets: [
        {
          id: "daily",
          name: "Daily",
          choices: { "front-neck": "detail-front-neck-round" },
        },
      ],
    };
    await send({ type: "settings.save", catalogue });
    const g = (await readCatalogue()).catalogue.garments[0];
    assert.equal(g.image?.label, "Shop blouse");
    const action: Intake = {
      type: "order.intake",
      customer: {
        kind: "new",
        name: "Design Customer",
        phone: "9876543210",
        email: "",
        notes: "",
      },
      items: [
        {
          garmentId: g.id,
          garmentRevision: g.revision,
          quantity: 2,
          price: 80000,
          material: "Silk",
          measurements: {
            values: {},
            extraFields: [],
            source: "new",
            confirmed: false,
            saveProfile: false,
            expectedProfileRevision: 0,
          },
          design: {
            choices: {
              "front-neck": "detail-front-neck-v-neck",
              "sleeve-length": "detail-sleeve-length-full",
            },
            references: [photo.id],
            notes: "Match this neckline.",
          },
        },
      ],
      dueDate: shopDate(),
      priority: "normal",
      notes: "",
      advance: 0,
      method: "Cash",
    };
    const retry = crypto.randomUUID(),
      created = await send(action, retry),
      order = created.data.orders[0];
    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].design?.garmentImage?.id, upload.id);
    assert.equal(order.items[0].design?.choices[0].label, "V neck");
    const frozen = structuredClone(order.items[0].design);
    assert.deepEqual(order.items[1].design, frozen);
    await updateDesignAsset({
      id: upload.id,
      revision: upload.revision,
      active: false,
    });
    await updateDesignAsset({
      id: photo.id,
      revision: photo.revision,
      active: false,
    });
    await updateDesignAsset({
      id: "detail-front-neck-v-neck",
      revision: 0,
      active: false,
    });
    assert.equal(
      (await send(action, retry)).resultId,
      created.resultId,
      "Retry succeeds after archived library changes",
    );
    const next = (await readCatalogue()).catalogue;
    next.garments[0].image = toAssetRef(builtinById["garment-katori-blouse"]);
    await send({ type: "settings.save", catalogue: next });
    assert.deepEqual(
      (await readWorkspace()).data.orders[0].items[0].design,
      frozen,
    );
    assert.deepEqual(
      (await readOrder(order.id, { page: 1, pageSize: 20 })).data.orders[0]
        .items[0].design,
      frozen,
    );
    const fresh: Intake = {
      ...action,
      customer: { kind: "existing", id: order.customerId },
      items: action.items.map((i) => ({
        ...i,
        garmentRevision: next.garments[0].revision + 1,
      })),
    };
    await assert.rejects(send(fresh), /unavailable/);
    assert.equal((await readWorkspace()).data.orders.length, 1);
    const prefsBefore = (
      await engine.query("SELECT * FROM sg_design_assets ORDER BY id")
    ).rows;
    await transition("rollback");
    assert.deepEqual(
      (await readWorkspace()).data.orders[0].items[0].design,
      frozen,
    );
    await transition("cutover");
    assert.deepEqual(
      (await readWorkspace()).data.orders[0].items[0].design,
      frozen,
    );
    assert.deepEqual(
      (await engine.query("SELECT * FROM sg_design_assets ORDER BY id")).rows,
      prefsBefore,
    );
    assert.equal(
      (
        await imageGet(request(`/api/design-library/${photo.id}/image`), {
          params: Promise.resolve({ id: photo.id }),
        })
      ).status,
      200,
      "Archived photos remain available to saved orders",
    );
    const cleared = (await readCatalogue()).catalogue;
    delete cleared.garments[0].image;
    delete cleared.garments[0].designConfig;
    await send({ type: "settings.save", catalogue: cleared });
    assert.equal(
      (await readCatalogue()).catalogue.garments[0].image,
      undefined,
    );
    const retained = [...objects.keys()];
    retained.forEach((key) => modified.set(key, new Date("2020-01-01")));
    const orphan = `designs/1/upload-${crypto.randomUUID()}/${"a".repeat(64)}/image.webp`,
      freshObject = `designs/1/upload-${crypto.randomUUID()}/${"b".repeat(64)}/image.webp`;
    objects.set(orphan, source);
    modified.set(orphan, new Date("2020-01-01"));
    objects.set(freshObject, source);
    assert.equal((await cleanupDesignUploads()).candidates, 1);
    assert(objects.has(orphan));
    assert.equal((await cleanupDesignUploads(true)).deleted, 1);
    assert(!objects.has(orphan));
    assert(objects.has(freshObject));
    retained.forEach((key) =>
      assert(
        objects.has(key),
        "Recorded media survives cleanup even after archive",
      ),
    );
  } finally {
    objectMock.mock.restore();
    await engine.close();
  }
});
