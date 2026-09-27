// Regenerates the static copies derived from content.js. Not a build step for
// the site itself (it runs as-is without this); run it after editing
// content.js or index.html so crawlers, link previews and no-JS readers see
// the same words as everyone else:
//
//   node tools/sync-pages.mjs
//
// It writes:
//   index.html, conduct.html        Spanish static text + URL-dependent head tags
//   en/index.html, en/conduct.html  English pages (same markup, English text)
//   calendar.ics    Spanish calendar entry
//   calendar-en.ics English calendar entry
//   robots.txt, 404.html
//   sitemap.xml     only once site.url is set in content.js

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const write = (file, text) => {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
  console.log("wrote", file);
};

const sandbox = { window: {} };
vm.runInNewContext(read("content.js"), sandbox);
const { site, copy } = sandbox.window.AV;
const siteUrl = site.url ? site.url.replace(/\/?$/, "/") : "";

// Static text shows the phase that is current when this runs.
const now = Date.now();
const phase =
  now < Date.parse(site.cfpClose)
    ? "cfp"
    : now < Date.parse(site.eventStart)
      ? "selection"
      : now < Date.parse(site.eventEnd)
        ? "live"
        : "ended";

const escapeText = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (text) => escapeText(text).replace(/"/g, "&quot;");

function lookup(lang, path) {
  const value = path.split(".").reduce((node, key) => node?.[key], copy[lang]);
  if (value && typeof value === "object" && !Array.isArray(value) && phase in value) return value[phase];
  if (value === undefined) throw new Error(`content.js has no "${path}" for ${lang}`);
  return value;
}

function setAttr(tag, name, value) {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  const attr = ` ${name}="${escapeAttr(value)}"`;
  return pattern.test(tag) ? tag.replace(pattern, attr) : tag.replace(/^<([\w-]+)/, `<$1${attr}`);
}

function removeAttr(tag, name) {
  return tag.replace(new RegExp(`\\s${name}(="[^"]*")?(?=[\\s>])`), "");
}

function localizeText(html, lang) {
  // Elements carrying data-i18n hold plain text only, so the first closing tag
  // of the same name ends them.
  html = html.replace(/<(\w+)((?:\s[^>]*?)?\sdata-i18n="([^"]+)"[^>]*)>([^<]*)<\/\1>/g, (all, tag, attrs, path) => {
    return `<${tag}${attrs}>${escapeText(lookup(lang, path))}</${tag}>`;
  });
  html = html.replace(/<[\w-]+\s[^>]*data-i18n-attr="([^"]+)"[^>]*>/g, (tag, pairs) => {
    for (const pair of pairs.split(",")) {
      const [attr, path] = pair.split(":").map((part) => part.trim());
      tag = setAttr(tag, attr, lookup(lang, path));
    }
    return tag;
  });
  return html;
}

function applyPhase(html, lang, prefix) {
  const primary = {
    cfp: site.cfpUrl,
    selection: prefix + lookup(lang, "calendarFile"),
    live: site.streamUrl || "#faq",
    ended: site.streamUrl || "#faq"
  }[phase];
  html = html.replace(/<a\s[^>]*data-cta="primary"[^>]*>/g, (tag) => {
    tag = setAttr(tag, "href", primary);
    if (/^https?:/.test(primary)) {
      tag = setAttr(setAttr(tag, "target", "_blank"), "rel", "noopener noreferrer");
    } else {
      tag = removeAttr(removeAttr(tag, "target"), "rel");
    }
    return tag;
  });
  return html.replace(/<[\w-]+\s[^>]*data-cfp-only[^>]*>/g, (tag) => {
    tag = removeAttr(tag, "hidden");
    return phase === "cfp" ? tag : tag.replace(/>$/, " hidden>");
  });
}

// Every page exists in both languages: Spanish at the root, English in en/.
// `path` is the page's URL relative to its language root.
const PAGES = [
  { file: "index.html", path: "", event: true },
  { file: "conduct.html", path: "conduct.html", event: false }
];

function headBlock(lang, pg) {
  const t = (path) => lookup(lang, path);
  const pageUrl = siteUrl && `${siteUrl}${lang === "en" ? "en/" : ""}${pg.path}`;
  const imageUrl = siteUrl ? `${siteUrl}assets/social-card.jpg` : lang === "en" ? "../assets/social-card.jpg" : "assets/social-card.jpg";
  const event = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Avalonia Conf Online 2026",
    description: t("description"),
    startDate: site.eventStart,
    endDate: site.eventEnd,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    isAccessibleForFree: true,
    inLanguage: ["es", "en"],
    organizer: { "@type": "Organization", name: "Avalonia Conf", ...(siteUrl && { url: siteUrl }) },
    sameAs: [site.koliseoUrl],
    // Required for event rich results: where people attend. The stream once
    // it exists, else this site, else the event's Koliseo page.
    location: { "@type": "VirtualLocation", url: site.streamUrl || pageUrl || site.koliseoUrl },
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: pageUrl || site.koliseoUrl,
      validFrom: "2026-08-01T00:00:00+02:00"
    }
  };
  if (siteUrl) Object.assign(event, { url: pageUrl, image: [imageUrl] });

  const lines = [];
  if (siteUrl) {
    lines.push(
      `<link rel="canonical" href="${pageUrl}">`,
      `<link rel="alternate" hreflang="es" href="${siteUrl}${pg.path}">`,
      `<link rel="alternate" hreflang="en" href="${siteUrl}en/${pg.path}">`,
      `<link rel="alternate" hreflang="x-default" href="${siteUrl}${pg.path}">`,
      `<meta property="og:url" content="${pageUrl}">`
    );
  }
  lines.push(`<meta property="og:image" content="${imageUrl}">`, `<meta name="twitter:image" content="${imageUrl}">`);
  if (pg.event) {
    lines.push(
      `<script type="application/ld+json">`,
      ...JSON.stringify(event, null, 2).split("\n").map((line) => `  ${line}`),
      `</script>`
    );
  }
  return lines.map((line) => `    ${line}`).join("\n");
}

function setHead(html, lang, pg) {
  const t = (path) => lookup(lang, path);
  const other = lang === "es" ? "en" : "es";
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
  // The home page takes the site title/description; other pages carry their
  // own through data-i18n, which localizeText has already filled in.
  if (pg.event) {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeText(t("title"))}</title>`)
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeAttr(t("description"))}$2`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escapeAttr(t("description"))}$2`)
      .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${escapeAttr(t("description"))}$2`);
  }
  html = html
    .replace(
      /(<meta property="og:image:alt" content=")[^"]*(")/,
      `$1${escapeAttr(lang === "es" ? "Avalonia Conf Online 2026, 2 de diciembre" : "Avalonia Conf Online 2026, December 2")}$2`
    )
    .replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${lang === "es" ? "es_ES" : "en_US"}$2`)
    .replace(/(<meta property="og:locale:alternate" content=")[^"]*(")/, `$1${lang === "es" ? "en_US" : "es_ES"}$2`)
    .replace(
      /(<!-- site-url:start[^>]*-->)[\s\S]*?(\s*<!-- site-url:end -->)/,
      (all, start, end) => `${start}\n${headBlock(lang, pg)}${end}`
    );

  // Language switch: a real link to the other page, labelled with its code.
  html = html.replace(/<a class="lang-switch"[^>]*>\s*<span data-language-label>[^<]*<\/span>/, (block) => {
    let tag = block.match(/^<a[^>]*>/)[0];
    tag = setAttr(tag, "href", lang === "es" ? `en/${pg.path}` : `../${pg.path}`);
    tag = setAttr(tag, "hreflang", other);
    tag = setAttr(tag, "aria-label", lookup(lang, "languageButton"));
    return block.replace(/^<a[^>]*>/, tag).replace(/(<span data-language-label>)[^<]*/, `$1${other.toUpperCase()}`);
  });
  return html.replace(/(<span class="sr-only" data-menu-label>)[^<]*/, `$1${escapeText(lookup(lang, "menuButton"))}`);
}

// Shared files (assets, scripts, calendars) gain ../ inside en/. Links to
// pages ("./", "./#cfp", "conduct.html") stay as they are, so they lead to
// the English pages next to this one. Fragments and absolute URLs untouched.
function rebase(html) {
  return html.replace(
    /\s(href|src)="(?!#|https?:|mailto:|data:|\.\.\/|\/|\.\/|[\w-]+\.html)([^"]+)"/g,
    (all, attr, url) => ` ${attr}="../${url}"`
  );
}

// Scripts and styles are referenced as file.js?v=<content hash>, so a browser
// can never pair a fresh page with a stale cached script (or the reverse).
const ASSETS = ["styles.css", "content.js", "script.js", "world.js"];
const version = Object.fromEntries(
  ASSETS.map((file) => [file, createHash("sha256").update(read(file)).digest("hex").slice(0, 10)])
);
function stampAssets(html) {
  return html.replace(/(\s(?:href|src)=")(styles\.css|content\.js|script\.js|world\.js)(?:\?v=[0-9a-f]+)?"/g, (all, lead, file) => `${lead}${file}?v=${version[file]}"`);
}

function page(lang, pg) {
  let html = read(pg.file);
  html = stampAssets(html);
  html = localizeText(html, lang);
  html = applyPhase(html, lang, lang === "en" ? "../" : "");
  html = html.replace(/<a href="[^"]*" data-conduct-email>[^<]*<\/a>/g, () => {
    const email = escapeAttr(site.conductEmail);
    return `<a href="mailto:${email}" data-conduct-email>${email}</a>`;
  });
  if (lang === "en") html = rebase(html);
  return setHead(html, lang, pg);
}

/* ------------------------------------------------------------------- 404 */

// Hosts serve 404.html for any missing path, at any depth, so its links are
// root-relative (under site.url's path when the site lives in a subfolder).
function notFoundPage() {
  const base = siteUrl ? new URL(siteUrl).pathname : "/";
  const es = copy.es.notFound;
  const en = copy.en.notFound;
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="color-scheme" content="dark light">
    <title>${escapeText(es.title)} · ${escapeText(en.title)} | Avalonia Conf Online 2026</title>
    <link rel="icon" href="${base}assets/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="stylesheet" href="${base}styles.css?v=${version["styles.css"]}">
  </head>
  <body class="doc-page">
    <main id="main">
      <article class="wrap doc">
        <div class="doc-card doc-intro">
          <p class="tag tag-plain">404</p>
          <h1>${escapeText(es.title)}</h1>
          <p class="lead">${escapeText(es.body)}</p>
          <p><a class="button button-primary" href="${base}">${escapeText(es.home)}</a></p>
        </div>
        <div class="doc-card" lang="en">
          <h2>${escapeText(en.title)}</h2>
          <p>${escapeText(en.body)}</p>
          <p><a class="button button-ghost" href="${base}en/">${escapeText(en.home)}</a></p>
        </div>
      </article>
    </main>
  </body>
</html>
`;
}

/* ------------------------------------------------------------------ ical */

const icsDate = (iso) => iso.slice(0, 19).replace(/[-:]/g, "");
const icsText = (text) => String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// RFC 5545 folds content lines at 75 octets.
function fold(line) {
  const out = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char) > (out.length ? 74 : 75)) {
      out.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

function calendar(lang) {
  const t = (path) => lookup(lang, path);
  const pageUrl = siteUrl && (lang === "en" ? `${siteUrl}en/` : siteUrl);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const description = [t("calendar.description"), pageUrl].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Avalonia Conf//Avalonia Conf Online 2026//${lang.toUpperCase()}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Madrid",
    "BEGIN:STANDARD",
    "DTSTART:19961027T030000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19970330T020000",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    // One UID for both languages: it is the same event.
    "UID:avalonia-conf-online-2026@avaloniaconf",
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Madrid:${icsDate(site.eventStart)}`,
    `DTEND;TZID=Europe/Madrid:${icsDate(site.eventEnd)}`,
    `SUMMARY:${icsText(t("calendar.summary"))}`,
    `DESCRIPTION:${icsText(description)}`,
    "LOCATION:Online",
    ...(pageUrl ? [`URL:${pageUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

for (const pg of PAGES) {
  write(pg.file, page("es", pg));
  write(`en/${pg.file}`, page("en", pg));
}
write("calendar.ics", calendar("es"));
write("calendar-en.ics", calendar("en"));

// tools/ holds build sources, not pages. Crawlers only read robots.txt at a
// domain root, so this matters once the site has its own domain.
const basePath = siteUrl ? new URL(siteUrl).pathname : "/";
write("robots.txt", `User-agent: *\nDisallow: ${basePath}tools/\n${siteUrl ? `\nSitemap: ${siteUrl}sitemap.xml\n` : ""}`);
write("404.html", notFoundPage());

if (siteUrl) {
  write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.flatMap((pg) => ["", "en/"].map((prefix) => [prefix, pg.path]))
  .map(
    ([prefix, path]) => `  <url>
    <loc>${siteUrl}${prefix}${path}</loc>
    <xhtml:link rel="alternate" hreflang="es" href="${siteUrl}${path}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}en/${path}"/>
  </url>`
  )
  .join("\n")}
</urlset>
`
  );
} else {
  console.log("\nsite.url is empty in content.js: canonical, hreflang, og:url, absolute images,");
  console.log("sitemap.xml and the Sitemap line in robots.txt are skipped until it is set.");
}
console.log(`static text uses the "${phase}" phase`);
