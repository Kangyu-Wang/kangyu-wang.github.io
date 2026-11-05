import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, writeFile, rm, access, symlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, renderContent } from "../build.mjs";

const source = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("Markdown edits and shared details reach every published page", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "website-edit-"));
  try {
    for (const directory of ["text", "layouts", "assets", "vendor"]) {
      await cp(path.join(source, directory), path.join(root, directory), { recursive: true });
    }
    await cp(path.join(source, "site.json"), path.join(root, "site.json"));
    await cp(path.join(source, "build.mjs"), path.join(root, "build.mjs"));
    // The entry point also works through macOS's /var symlink and from another directory.
    await symlink(root, path.join(root, "alias"), "dir");
    const result = await promisify(execFile)(process.execPath, [path.join(root, "alias/build.mjs")], { cwd: tmpdir() });
    assert.match(result.stdout, /Built three pages/);
    const before = await readFile(path.join(root, "docs/index.html"), "utf8");
    await writeFile(path.join(root, "text/profile.md"), "Updated biography.\n\n## New section\n\n新内容。\n");
    await writeFile(path.join(root, "text/research.md"),
      "Updated research.\n\n## New work\n\n- **New paper**, [PDF](../assets/Kangyu_Wang_CV_26.10.12.pdf)\n");
    await writeFile(path.join(root, "text/teaching.md"), "## New course\n\n- Updated teaching.\n");
    await writeFile(path.join(root, "text/contact.md"),
      "new-address[at]example.org\n\n- [CV](../assets/Kangyu_Wang_CV_26.10.12.pdf)\n");
    await writeFile(path.join(root, "text/footer.md"), "Shared **footer**.");
    await writeFile(path.join(root, "docs/stale.html"), "obsolete preview");
    await build(root);
    for (const page of ["index.html", "research/index.html", "teaching/index.html"]) {
      const html = await readFile(path.join(root, "docs", page), "utf8");
      assert.match(html, /new-address\[at\]example.org/);
      assert.match(html, /Shared <strong>footer<\/strong>/);
      assert.match(html, /target="_blank" rel="noopener" href="(?:\.\.\/)?assets\/Kangyu_Wang_CV_26\.10\.12\.pdf"/);
      assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    }
    assert.notEqual(await readFile(path.join(root, "docs/index.html"), "utf8"), before);
    assert.match(await readFile(path.join(root, "docs/research/index.html"), "utf8"), /<strong>New paper<\/strong>/);
    assert.match(await readFile(path.join(root, "docs/teaching/index.html"), "utf8"), /Updated teaching/);
    await assert.rejects(access(path.join(root, "docs/stale.html")));
    const working = await readFile(path.join(root, "docs/index.html"), "utf8");
    await writeFile(path.join(root, "site.json"), "{broken");
    await assert.rejects(build(root));
    assert.equal(await readFile(path.join(root, "docs/index.html"), "utf8"), working);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("folded sections close before the next heading and final paragraph", () => {
  const html = renderContent(
    "Intro.\n\n## Field\n\n#### Collaborations\n\n- First\n  - Nested\n\n### Solo\n\nSecond.\n\n#### More\n\nThird.\n\n---\n\nContact me.",
    "research",
  );
  assert.match(html, /<details[^>]*>[\s\S]*<li>Nested<\/li>/);
  assert.match(html, /<\/details>\s*<h3>Solo<\/h3>/);
  assert.match(html, /<\/details>\s*<\/div><\/section>\s*<p>Contact me\.<\/p>/);
  assert.equal((html.match(/<details/g) || []).length, (html.match(/<\/details>/g) || []).length);
});

test("relative Markdown links work on nested pages and project URLs", () => {
  const html = renderContent(
    "[Profile](profile.md) [Research](research.md#topic) [PDF](../assets/cv.pdf) " +
    "![Portrait](../assets/kangyu-wang.jpg) [External](https://example.org/a_(b)?x=1&y=2)\n\n" +
    "## [Linked heading][target]\n\n[target]: https://example.org/heading",
    "research", "../",
  );
  assert.match(html, /href="\.\.\/index.html"/);
  assert.match(html, /href="\.\.\/research\/index.html#topic"/);
  assert.match(html, /src="\.\.\/assets\/kangyu-wang.jpg"/);
  assert.match(html, /target="_blank" rel="noopener" href="\.\.\/assets\/cv.pdf"/);
  assert.match(html, /href="https:\/\/example.org\/a_\(b\)\?x=1&amp;y=2"/);
  assert.match(html, /<h2><a href="https:\/\/example.org\/heading">Linked heading<\/a><\/h2>/);
});
