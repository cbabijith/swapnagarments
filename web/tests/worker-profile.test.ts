import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isolatedDatabase } from "./helpers/isolated-database";
import { authenticate, getUserSession } from "../src/services/auth-service";
import { executeWorkspaceCommand } from "../src/services/workspace-service";
import { readWorkerProfile } from "../src/services/worker-profile-service";
import {
  storageStatus,
  transitionWorkspaceStorage,
} from "../src/services/storage-migration-service";
import { GET } from "../src/app/api/work/profile/route";
import type { Worker } from "../src/features/team/contracts/team";

test("worker profiles use session identity, expose only personal fields, refresh and survive storage transitions", async () => {
  const context = isolatedDatabase();
  process.env.SETUP_TOKEN = "profile-fixture-setup";
  const owner = { name: "Profile Owner", email: "profile-owner@example.test" };
  const password = "profile-fixture-password";
  const profile: Worker = {
    email: "profile-a@example.test",
    active: true,
    available: true,
    skills: [0, 3],
    capacityMinutes: 480,
    revision: 1,
  };
  const request = (token?: string, suffix = "") =>
    new NextRequest(`http://localhost:3000/api/work/profile${suffix}`, {
      headers: token ? { Cookie: `swapna_session=${token}` } : {},
    });
  async function transition(direction: "cutover" | "rollback") {
    const current = await storageStatus();
    await transitionWorkspaceStorage({
      direction,
      expectedRevision: current.revision,
      expectedChecksum: current.checksum,
      backupReference: "isolated-profile-test",
    });
  }
  try {
    const ownerToken = await authenticate({
      action: "setup",
      ...owner,
      password,
      setupToken: process.env.SETUP_TOKEN,
    });
    const first = await executeWorkspaceCommand(
      {
        mutationId: crypto.randomUUID(),
        action: {
          type: "team.save",
          name: "Profile Worker",
          worker: profile,
          password,
          expectedRevision: 0,
        },
      },
      owner,
    );
    const second = await executeWorkspaceCommand(
      {
        mutationId: crypto.randomUUID(),
        action: {
          type: "team.save",
          name: "Other Worker",
          worker: { ...profile, email: "profile-b@example.test", skills: [1] },
          password,
          expectedRevision: 0,
        },
      },
      owner,
    );
    const token = await authenticate({
      action: "signin",
      email: profile.email,
      password,
    });
    const user = (await getUserSession(token))!;
    const expected = {
      id: first.resultId,
      name: "Profile Worker",
      email: profile.email,
      role: "Worker",
      color: "sage",
      skills: [0, 3],
      available: true,
      capacityMinutes: 480,
    };
    assert.equal((await GET(request())).status, 401);
    assert.equal((await GET(request(ownerToken))).status, 403);
    assert.throws(
      () =>
        readWorkerProfile({
          name: "No identity",
          email: "no@example.test",
          role: "worker",
        }),
      /worker account/,
    );
    const legacy = await readWorkerProfile(user);
    assert.deepEqual(legacy.profile, expected);
    await transition("cutover");
    assert.deepEqual((await readWorkerProfile(user)).profile, expected);
    const response = await GET(
      request(token, `?member=${second.resultId}&staffId=${second.resultId}`),
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Cache-Control")!, /no-store/);
    const body = await response.json();
    assert.deepEqual(body.profile, expected);
    for (const secret of [
      "Other Worker",
      "profile-b@example.test",
      "password",
      "salt",
      "customers",
      "payments",
    ])
      assert.ok(
        !JSON.stringify(body).includes(secret),
        `Profile leaked ${secret}`,
      );
    const updated = {
      ...profile,
      available: false,
      skills: [0, 1, 3],
      capacityMinutes: 360,
    };
    await executeWorkspaceCommand(
      {
        mutationId: crypto.randomUUID(),
        action: {
          type: "team.save",
          id: first.resultId,
          name: "Updated Worker",
          worker: updated,
          expectedRevision: 1,
        },
      },
      owner,
    );
    const refreshed = (await GET(request(token))).clone();
    assert.equal(refreshed.status, 200);
    const current = await refreshed.json();
    assert.equal(current.profile.name, "Updated Worker");
    assert.equal(current.profile.available, false);
    assert.deepEqual(current.profile.skills, [0, 1, 3]);
    assert.equal(current.profile.capacityMinutes, 360);
    assert.ok(current.revision > legacy.revision);
    await transition("rollback");
    assert.deepEqual((await readWorkerProfile(user)).profile, current.profile);
    await transition("cutover");
    assert.deepEqual((await readWorkerProfile(user)).profile, current.profile);
    await executeWorkspaceCommand(
      {
        mutationId: crypto.randomUUID(),
        action: {
          type: "team.save",
          id: first.resultId,
          name: "Updated Worker",
          worker: { ...updated, active: false },
          expectedRevision: 2,
        },
      },
      owner,
    );
    assert.equal((await GET(request(token))).status, 401);
    await assert.rejects(readWorkerProfile(user), /unavailable/);
  } finally {
    await context.engine.close();
  }
});
