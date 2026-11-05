import { readFile, writeFile, mkdir, cp, mkdtemp, rename, rm } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked, Renderer } from "./vendor/marked/marked.mjs";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const pages = [
  { source: "profile.md", output: "index.html", title: "About me", type: "about" },
  { source: "research.md", output: "research/index.html", title: "Research", type: "research" },
  { source: "teaching.md", output: "teaching/index.html", title: "Teaching", type: "teaching" },
];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

// Markdown links are relative to text/. Published links are relative to each HTML page.
function publishedLink(href, prefix) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(href)) return href;
  const [, pathname, suffix] = href.match(/^([^?#]*)(.*)$/);
  let target = path.posix.resolve("/text", pathname);
  const page = pages.find(page => target === "/text/" + page.source);
  if (page) target = "/" + page.output;
  if (target === "/") target = "/index.html";
  if (/^\/(research|teaching)\/?$/.test(target)) target = target.replace(/\/$/, "") + "/index.html";
  return prefix + target.slice(1) + suffix;
}

function markdownFor(prefix) {
  const markdown = new Marked({ gfm: true });
  const defaultLink = Renderer.prototype.link;
  const defaultImage = Renderer.prototype.image;
  markdown.use({
    renderer: {
      link(token) {
        const href = publishedLink(token.href, prefix);
        const result = defaultLink.call(this, { ...token, href });
        return /\.pdf(?:[?#]|$)/i.test(href)
          ? result.replace("<a ", '<a target="_blank" rel="noopener" ')
          : result;
      },
      image(token) {
        return defaultImage.call(this, { ...token, href: publishedLink(token.href, prefix) });
      },
    },
  });
  return markdown;
}

// Ordinary Markdown headings control the existing sections and disclosure panels.
export function renderContent(source, type, prefix = "") {
  const markdown = markdownFor(prefix);
  const tokens = markdown.lexer(source);
  const output = [];
  const open = [];

  function closeTo(depth) {
    while (open.length && open.at(-1).depth >= depth) {
      output.push(open.pop().closing);
    }
  }

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 1) continue;
    if (token.type === "hr" && open.length) {
      closeTo(0);
    } else if (token.type === "heading" && token.depth === 2) {
      closeTo(2);
      const title = markdown.Parser.parseInline(token.tokens, markdown.defaults);
      if (type === "about") {
        if (!open.length) {
          output.push('<div class="bio-folds">');
          open.push({ depth: 1, closing: "</div>" });
        }
        output.push('<details class="fold"><summary>' + title + '</summary><div class="fold-copy">');
        open.push({ depth: 2, closing: "</div></details>" });
      } else {
        const heading = title.replace(/^(\d+:)/, '<span class="area-no">$1</span>');
        output.push('<section class="group"><h2>' + heading + '</h2><div class="group-text">');
        open.push({ depth: 2, closing: "</div></section>" });
      }
    } else if (token.type === "heading" && token.depth === 4) {
      closeTo(4);
      output.push('<details class="fold"><summary>' + markdown.Parser.parseInline(token.tokens, markdown.defaults) + '</summary><div class="fold-copy">');
      open.push({ depth: 4, closing: "</div></details>" });
    } else {
      if (token.type === "heading") closeTo(token.depth);
      let html = markdown.parser([token]);
      if (type === "about" && token.type === "paragraph" && !output.some(part => part.trim())) {
        html = html.replace("<p>", '<p class="intro">');
      }
      output.push(html);
    }
  }
  closeTo(0);
  return output.join("\n");
}

export async function build(root = projectRoot) {
  const read = filename => readFile(path.join(root, filename), "utf8");
  const [template, siteText, contact, footer, ...sources] = await Promise.all([
    read("layouts/page.html"), read("site.json"), read("text/contact.md"), read("text/footer.md"),
    ...pages.map(page => read("text/" + page.source)),
  ]);
  const site = JSON.parse(siteText);
  for (const key of ["name", "chineseName", "description", "portrait", "largePortrait"]) {
    if (typeof site[key] !== "string" || !site[key].trim()) throw new Error("site.json needs " + key);
  }
  const rendered = pages.map((page, index) => {
    const prefix = page.output === "index.html" ? "" : "../";
    const markdown = markdownFor(prefix);
    const values = {
      root: prefix,
      page_title: escapeHTML(page.title),
      page_class: page.type,
      name: escapeHTML(site.name),
      chinese_name: escapeHTML(site.chineseName),
      description: escapeHTML(page.title + " · " + site.name + " " + site.chineseName + ", " + site.description),
      portrait: escapeHTML(prefix + site.portrait),
      large_portrait: escapeHTML(prefix + site.largePortrait),
      navigation: pages.map((item, number) =>
        '<a href="' + prefix + item.output + '"' + (item === page ? ' aria-current="page"' : "") +
        '><span class="folio" aria-hidden="true">0' + (number + 1) + "</span>" + item.title + "</a>"
      ).join("\n"),
      contact: markdown.parse(contact).replace("<ul>", '<ul class="profiles">'),
      footer: markdown.parseInline(footer.trim()),
      content: renderContent(sources[index], page.type, prefix),
    };
    const html = template.replace(/{{(\w+)}}/g, (_, key) => {
      if (!(key in values)) throw new Error("Unknown layout placeholder: " + key);
      return values[key];
    });
    return { output: page.output, html };
  });

  // Prepare the whole build before replacing the last working local preview.
  const staging = await mkdtemp(path.join(root, ".build-"));
  const next = path.join(staging, "next");
  const previous = path.join(staging, "previous");
  const destination = path.join(root, "docs");
  let savedPrevious = false;
  try {
    await mkdir(next);
    await cp(path.join(root, "assets"), path.join(next, "assets"), { recursive: true });
    // Also serve the conventional root icon for browsers and saved bookmarks.
    await cp(path.join(root, "assets/favicon.ico"), path.join(next, "favicon.ico"));
    for (const page of rendered) {
      const filename = path.join(next, page.output);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, page.html);
    }
    for (const page of pages.slice(1)) {
      await writeFile(path.join(next, page.type + ".html"),
        '<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' +
        page.output + '"><title>' + page.title + '</title><a href="' + page.output + '">' + page.title + "</a></html>\n");
    }
    await writeFile(path.join(next, ".nojekyll"), "");
    try {
      await rename(destination, previous);
      savedPrevious = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    try {
      await rename(next, destination);
    } catch (error) {
      if (savedPrevious) await rename(previous, destination);
      throw error;
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return destination;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().then(directory => console.log("Built three pages in " + directory)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
