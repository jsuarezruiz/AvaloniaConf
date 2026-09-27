(() => {
  document.documentElement.classList.add("js");

  const { site, copy } = window.AV;
  const CFP_CLOSE = new Date(site.cfpClose);
  const EVENT_START = new Date(site.eventStart);
  const EVENT_END = new Date(site.eventEnd);
  const PHASES = ["cfp", "selection", "live", "ended"];
  const STORAGE_KEY = "avalonia-conf-language";
  const THEME_KEY = "avalonia-conf-theme";
  const CHAPTER_COUNT = 6;
  const html = document.documentElement;
  // The language this HTML file was written in: "/" is Spanish, "/en/" English.
  const pageLang = html.getAttribute("lang") === "en" ? "en" : "es";
  const header = document.querySelector("[data-header]");
  const progressLine = document.querySelector(".progress-line");
  const menu = document.querySelector("[data-menu]");
  const menuButton = document.querySelector("[data-menu-button]");
  const menuLabel = document.querySelector("[data-menu-label]");
  const languageButton = document.querySelector("[data-language-button]");
  const languageLabel = document.querySelector("[data-language-label]");
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMenuQuery = window.matchMedia("(max-width: 860px)");
  const lightQuery = window.matchMedia("(prefers-color-scheme: light)");
  const themeButton = document.querySelector("[data-theme-button]");

  // Storage can throw (blocked site data, some embedded views). The language
  // preference is a convenience, so a failure must never stop the page.
  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* the preference is simply not remembered */
      }
    }
  };

  let activeLanguage = getInitialLanguage();
  let phase = currentPhase();

  function getInitialLanguage() {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get("lang");
    if (explicit) return explicit.toLowerCase().startsWith("en") ? "en" : "es";
    // A language-specific URL wins over any remembered preference.
    if (pageLang === "en") return "en";
    const saved = storage.get(STORAGE_KEY);
    if (saved) return saved === "en" ? "en" : "es";
    // Crawlers render with an English browser; adapting for them would put
    // English copy on the Spanish URL. People still get their language.
    if (/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)) return pageLang;
    const browser = navigator.languages?.[0] || navigator.language || pageLang;
    return browser.toLowerCase().startsWith("en") ? "en" : "es";
  }

  /* ------------------------------------------------------------------ phase
     cfp → selection → live → ended, from the dates in content.js.
     `?phase=live` previews a state without waiting for the calendar. */

  function currentPhase(now = Date.now()) {
    const forced = new URLSearchParams(window.location.search).get("phase");
    if (PHASES.includes(forced)) return forced;
    if (now < CFP_CLOSE.getTime()) return "cfp";
    if (now < EVENT_START.getTime()) return "selection";
    if (now < EVENT_END.getTime()) return "live";
    return "ended";
  }

  function get(path) {
    const value = path.split(".").reduce((node, key) => node?.[key], copy[activeLanguage]);
    if (value && typeof value === "object" && !Array.isArray(value) && phase in value) return value[phase];
    return value ?? "";
  }

  function setMeta() {
    html.lang = activeLanguage;
    // Pages with a title and description of their own mark them with
    // data-i18n / data-i18n-attr, which syncStaticCopy fills in.
    if (!document.querySelector("title[data-i18n]")) document.title = get("title");
    if (!document.querySelector('meta[name="description"][data-i18n-attr]')) {
      setMetaContent("description", get("description"));
      setMetaContent("og:description", get("description"), "property");
    }
  }

  function setMetaContent(name, content, attr = "name") {
    document.querySelector(`meta[${attr}="${name}"]`)?.setAttribute("content", content);
  }

  function syncStaticCopy() {
    // A key missing from content.js keeps the text already in the HTML rather
    // than blanking it (a stale cached file once left the hero buttons empty).
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const text = get(node.dataset.i18n);
      if (typeof text === "string" && text) node.textContent = text;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
      node.dataset.i18nAttr.split(",").forEach((pair) => {
        const [attr, path] = pair.split(":").map((part) => part.trim());
        const value = get(path);
        if (typeof value !== "string" || !value) return;
        node.setAttribute(attr, attr === "href" ? resolveHref(value) : value);
      });
    });

    if (languageButton && languageLabel) {
      const other = activeLanguage === "es" ? "en" : "es";
      languageLabel.textContent = other.toUpperCase();
      languageButton.setAttribute("aria-label", get("languageButton"));
      languageButton.setAttribute("hreflang", other);
      // Swapped in place, "the other language" is this page's own URL again.
      languageButton.setAttribute("href", activeLanguage === pageLang ? otherPageHref : thisPageHref);
    }

    if (menuLabel) {
      menuLabel.textContent = get(menu?.classList.contains("is-open") ? "menuClose" : "menuButton");
    }

    syncLocalTime();
    syncTheme();
  }

  // Files next to index.html are one level up when this is the /en/ page.
  const assetBase = pageLang === "en" ? "../" : "";
  const resolveHref = (href) => (/^(#|[a-z]+:|\/|\.\.\/)/i.test(href) ? href : assetBase + href);

  // The HTML links each page to its counterpart in the other language.
  const otherPageHref = languageButton?.getAttribute("href") || "";
  const thisPageHref = window.location.pathname.split("/").pop() || "./";

  /* ------------------------------------------------------------------ theme
     Follows the system until the visitor picks one; the pick is remembered
     and applied before first paint by the inline script in <head>. */

  const currentTheme = () => html.dataset.theme || (lightQuery.matches ? "light" : "dark");

  function syncTheme() {
    const theme = currentTheme();
    themeButton?.setAttribute("aria-label", get(theme === "light" ? "themeToDark" : "themeToLight"));
    // An explicit pick overrides both media-specific theme-color tags.
    if (html.dataset.theme) {
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute("content", theme === "light" ? "#eef3fa" : "#04070f");
      });
    }
  }

  function announceTheme() {
    syncTheme();
    document.dispatchEvent(new CustomEvent("av:theme", { detail: currentTheme() }));
  }

  themeButton?.addEventListener("click", () => {
    const next = currentTheme() === "light" ? "dark" : "light";
    html.dataset.theme = next;
    storage.set(THEME_KEY, next);
    announceTheme();
  });

  lightQuery.addEventListener?.("change", () => {
    if (!html.dataset.theme) announceTheme();
  });

  /* Buttons and markers whose meaning depends on the phase. */
  function syncPhase() {
    html.dataset.phase = phase;
    const calendar = resolveHref(get("calendarFile"));
    const primaryHref = {
      cfp: site.cfpUrl,
      selection: calendar,
      live: site.streamUrl || "#faq",
      ended: site.streamUrl || "#faq"
    }[phase];
    const external = /^https?:/.test(primaryHref);

    document.querySelectorAll('[data-cta="primary"]').forEach((link) => {
      link.setAttribute("href", primaryHref);
      if (external) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      } else {
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    });

    // After the CFP, adding to the calendar becomes the primary action, so a
    // second calendar button would only repeat it; on the day it is moot.
    document.querySelectorAll("[data-cfp-only]").forEach((node) => {
      node.hidden = phase !== "cfp";
    });

    const reached = { cfp: 0, selection: 1, live: 2, ended: 3 }[phase];
    document.querySelectorAll("[data-milestone]").forEach((node) => {
      const index = Number(node.dataset.milestone);
      node.classList.toggle("is-done", index < reached);
      node.classList.toggle("is-current", index === reached);
    });
  }

  /* -------------------------------------------------------------- local time
     09:00-17:00 CET restated in the visitor's zone; hidden for CET visitors. */

  function syncLocalTime() {
    const text = localRange();
    document.querySelectorAll("[data-local-time]").forEach((node) => {
      node.hidden = !text;
      node.textContent = text ? get("localTime").replace("{range}", text) : "";
    });
  }

  function localRange() {
    if (EVENT_START.getTimezoneOffset() === -60 && EVENT_END.getTimezoneOffset() === -60) return "";
    try {
      const locale = activeLanguage === "es" ? "es-ES" : "en-US";
      const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
      const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      const zone =
        new Intl.DateTimeFormat(locale, { timeZoneName: "short" })
          .formatToParts(EVENT_START)
          .find((part) => part.type === "timeZoneName")?.value || "";
      const sameDay = day.format(EVENT_START) === day.format(EVENT_END);
      const end = sameDay ? time.format(EVENT_END) : `${day.format(EVENT_END)}, ${time.format(EVENT_END)}`;
      return `${day.format(EVENT_START)}, ${time.format(EVENT_START)}–${end} ${zone}`.trim();
    } catch {
      return "";
    }
  }

  function applyLanguage() {
    setMeta();
    syncStaticCopy();
    syncPhase();
    conductor.markActiveChapter(true);
    // Strings the 3D world bakes into textures (stage screen).
    window.__avStrings = copy[activeLanguage].format.stage;
    document.dispatchEvent(new CustomEvent("av:lang"));
  }

  /* -------------------------------------------------------------------- menu */

  function setMenu(open, { restoreFocus = false } = {}) {
    menu?.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
    if (menuLabel) menuLabel.textContent = get(open ? "menuClose" : "menuButton");
    if (open) menu?.querySelector("a")?.focus();
    else if (restoreFocus) menuButton?.focus();
  }

  function bindMenu() {
    menuButton?.addEventListener("click", () => setMenu(!menu?.classList.contains("is-open")));

    menu?.addEventListener("click", (event) => {
      // A link navigates; a click on the overlay itself just dismisses it.
      if (event.target instanceof HTMLAnchorElement || event.target === menu) setMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (!menu?.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false, { restoreFocus: true });
        return;
      }
      // Keep Tab inside the open overlay: its links plus the close button.
      if (event.key === "Tab") {
        const stops = [menuButton, ...menu.querySelectorAll("a")].filter(Boolean);
        const index = stops.indexOf(document.activeElement);
        const next = event.shiftKey ? index - 1 : index + 1;
        if (index === -1 || next < 0 || next >= stops.length) {
          event.preventDefault();
          stops[(next + stops.length) % stops.length].focus();
        }
      }
    });

    mobileMenuQuery.addEventListener?.("change", (event) => {
      if (!event.matches) setMenu(false);
    });
  }

  function setupReveal() {
    const revealItems = document.querySelectorAll("[data-reveal]");
    if (reduceMotionQuery.matches) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, index) => {
            observer.unobserve(entry.target);
            window.setTimeout(() => entry.target.classList.add("is-visible"), index * 70);
          });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  /* ------------------------------------------------------------------------
     Scroll conductor: scrollY -> fractional chapter progress [0, 5].
     Exact and reversible; the 3D world reads window.__avProgress each frame.
     ------------------------------------------------------------------------ */

  const conductor = (() => {
    const sections = Array.from(document.querySelectorAll("[data-chapter]"));
    const railLinks = Array.from(document.querySelectorAll("[data-rail-link]"));
    const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
    let anchors = [];
    let activeChapter = -1;
    let scheduled = false;

    function measure() {
      anchors = sections.map((section) => section.offsetTop);
    }

    function progressFromScroll() {
      if (!anchors.length) return 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      let index = 0;
      while (index < anchors.length - 1 && y >= anchors[index + 1]) index += 1;
      const start = anchors[index];
      const end = index < anchors.length - 1 ? anchors[index + 1] : Math.max(max, start + 1);
      const t = Math.min(1, Math.max(0, (y - start) / Math.max(1, end - start)));
      return Math.min(CHAPTER_COUNT - 1, index + t);
    }

    function markActiveChapter(force) {
      const chapter = Math.max(0, Math.min(CHAPTER_COUNT - 1, Math.round(window.__avProgress || 0)));
      if (!force && chapter === activeChapter) return;
      activeChapter = chapter;

      railLinks.forEach((link, index) => link.classList.toggle("is-active", index === chapter));
      const sectionId = sections[chapter]?.id;
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${sectionId}`);
      });
    }

    function update() {
      const p = progressFromScroll();
      window.__avProgress = p;
      // Inline transform on the bar itself. A custom property on :root forced a
      // style recalc of the whole document on every scroll frame.
      if (progressLine) progressLine.style.transform = `scaleX(${(p / (CHAPTER_COUNT - 1)).toFixed(4)})`;
      header?.classList.toggle("is-scrolled", window.scrollY > 8);
      if (window.scrollY > 40) html.classList.add("scrolled");
      markActiveChapter(false);
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        update();
      });
    }

    function remeasure() {
      measure();
      update();
    }

    measure();
    update();
    markActiveChapter(true);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    window.addEventListener("load", remeasure);
    document.fonts?.ready?.then(remeasure);

    return { markActiveChapter, remeasure };
  })();

  /* ------------------------------------------------------------------------
     Countdown: to the start, then to the end while live, then retired. It
     also notices phase changes, so a page left open rolls over on its own.
     ------------------------------------------------------------------------ */

  function setupCountdown() {
    const countdown = document.querySelector("[data-live-countdown]");
    const fields = countdown && {
      days: countdown.querySelector("[data-countdown-days]"),
      hours: countdown.querySelector("[data-countdown-hours]"),
      minutes: countdown.querySelector("[data-countdown-minutes]"),
      seconds: countdown.querySelector("[data-countdown-seconds]")
    };

    const update = () => {
      const next = currentPhase();
      if (next !== phase) {
        phase = next;
        syncStaticCopy();
        syncPhase();
        conductor.remeasure();
      }
      if (!countdown) return;

      countdown.classList.toggle("is-live", phase === "live");
      countdown.classList.toggle("is-ended", phase === "ended");
      const target = phase === "live" ? EVENT_END : EVENT_START;
      const difference = Math.max(0, target.getTime() - Date.now());
      const values = {
        days: Math.floor(difference / 86400000),
        hours: Math.floor((difference % 86400000) / 3600000),
        minutes: Math.floor((difference % 3600000) / 60000),
        seconds: Math.floor((difference % 60000) / 1000)
      };

      Object.entries(values).forEach(([key, value]) => {
        fields[key].textContent = String(value).padStart(key === "days" ? 3 : 2, "0");
      });
    };

    update();
    window.setInterval(update, 1000);
  }

  bindMenu();
  languageButton?.addEventListener("click", (event) => {
    // Modified clicks open the other language's page; a plain click swaps in
    // place so the scroll position and the 3D world are kept.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    activeLanguage = activeLanguage === "es" ? "en" : "es";
    storage.set(STORAGE_KEY, activeLanguage);
    const url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", activeLanguage);
      window.history.replaceState(null, "", url);
    }
    setMenu(false);
    applyLanguage();
  });

  document.querySelectorAll("[data-conduct-email]").forEach((link) => {
    link.setAttribute("href", `mailto:${site.conductEmail}`);
    link.textContent = site.conductEmail;
  });

  applyLanguage();
  setupReveal();
  setupCountdown();
})();
