import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve("src");
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [path.join(dir, entry.name)]
        : [],
  );
}
function dependencies(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  return source.statements.flatMap((node) =>
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
      ? [node.moduleSpecifier.text]
      : [],
  );
}
test("client imports cannot reach server services, database code or integrations", () => {
  const entries = files(root).filter((file) =>
    /^\s*["']use client["']/.test(readFileSync(file, "utf8")),
  );
  assert.ok(entries.length > 5);
  for (const entry of entries) {
    const seen = new Set<string>();
    function visit(file: string) {
      if (seen.has(file)) return;
      seen.add(file);
      const local = path.relative(root, file).replaceAll("\\", "/");
      assert.ok(
        !/^(db|services|integrations)\/|^shared\/server\//.test(local),
        `${entry} reaches server module ${local}`,
      );
      for (const ref of dependencies(file)) {
        // CSS modules are styling assets, not executable client dependencies.
        if (ref.endsWith(".css")) continue;
        assert.notEqual(
          ref,
          "server-only",
          `${entry} reaches server-only code in ${file}`,
        );
        assert.ok(
          !/^(pg|drizzle-orm|@aws-sdk)(\/|$)/.test(ref),
          `${entry} imports server package ${ref}`,
        );
        const target = ref.startsWith("@/")
          ? path.join(root, ref.slice(2))
          : ref.startsWith(".")
            ? path.resolve(path.dirname(file), ref)
            : null;
        if (!target) continue;
        const resolved = [
          target + ".ts",
          target + ".tsx",
          path.join(target, "index.ts"),
          path.join(target, "index.tsx"),
        ].find(existsSync);
        assert.ok(resolved, `Unresolved import ${ref} in ${file}`);
        visit(resolved!);
      }
    }
    visit(entry);
  }
});
test("API routes have no database imports or raw SQL", () => {
  for (const file of files(path.join(root, "app/api"))) {
    const source = readFileSync(file, "utf8");
    assert.ok(
      !dependencies(file).some((ref) => /^@\/db|^pg$|^drizzle-orm/.test(ref)),
      file,
    );
    assert.ok(
      !/\b(SELECT .+ FROM|INSERT INTO|UPDATE sg_|DELETE FROM|BEGIN|COMMIT)\b/.test(
        source,
      ),
      file,
    );
  }
});
