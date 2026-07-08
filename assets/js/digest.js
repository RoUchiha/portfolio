(() => {
  const PAGE_SIZE = 5;
  const listEl = document.getElementById("digest-list");
  const loadMoreBtn = document.getElementById("digest-load-more");
  const statusEl = document.getElementById("digest-status");

  if (!listEl) return;

  // In-memory cache: cursor -> page result, plus a flat de-duped list of rendered items.
  const pageCache = new Map();
  const renderedIds = new Set();
  let nextCursor = undefined; // undefined = not fetched yet, null = no more pages
  let loading = false;

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function inline(line) {
    return escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }

  function markdownToHtml(md) {
    const lines = md.split("\n");
    let html = "";
    let inList = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith("## ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<h4>${inline(line.slice(3))}</h4>`;
      } else if (line.startsWith("# ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<h3>${inline(line.slice(2))}</h3>`;
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${inline(line.slice(2))}</li>`;
      } else if (line === "") {
        if (inList) { html += "</ul>"; inList = false; }
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<p>${inline(line)}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  function formatDate(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function renderCard(item, { expanded }) {
    const card = document.createElement("article");
    card.className = "digest-card" + (expanded ? " is-expanded" : "");
    card.dataset.id = item.id;

    const sourcesHtml = (item.sources || [])
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noreferrer">${escapeHtml(s.title || s.url)}</a></li>`)
      .join("");

    card.innerHTML = `
      <button class="digest-card-header" type="button" aria-expanded="${expanded}">
        <span class="digest-date">${formatDate(item.digest_date)}</span>
        <span class="digest-title">${escapeHtml(item.title)}</span>
        <svg class="digest-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div class="digest-body" ${expanded ? "" : "hidden"}>
        ${markdownToHtml(item.summary_md)}
        ${sourcesHtml ? `<p class="digest-sources-label">Sources</p><ul class="digest-sources">${sourcesHtml}</ul>` : ""}
      </div>
    `;

    const header = card.querySelector(".digest-card-header");
    const bodyEl = card.querySelector(".digest-body");
    header.addEventListener("click", () => {
      const isOpen = !bodyEl.hasAttribute("hidden");
      if (isOpen) {
        bodyEl.setAttribute("hidden", "");
        header.setAttribute("aria-expanded", "false");
        card.classList.remove("is-expanded");
      } else {
        bodyEl.removeAttribute("hidden");
        header.setAttribute("aria-expanded", "true");
        card.classList.add("is-expanded");
      }
    });

    return card;
  }

  function appendItems(items, { firstPage }) {
    items.forEach((item, index) => {
      if (renderedIds.has(item.id)) return;
      renderedIds.add(item.id);
      const expanded = firstPage && index === 0;
      listEl.appendChild(renderCard(item, { expanded }));
    });
  }

  async function fetchPage(cursor) {
    const cacheKey = cursor || "__first__";
    if (pageCache.has(cacheKey)) {
      return pageCache.get(cacheKey);
    }
    const url = new URL("/api/digests", window.location.origin);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    pageCache.set(cacheKey, data);
    return data;
  }

  async function loadNext() {
    if (loading || nextCursor === null) return;
    loading = true;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Loading...";
    }
    if (statusEl) statusEl.textContent = "";

    try {
      const isFirst = nextCursor === undefined;
      const data = await fetchPage(isFirst ? undefined : nextCursor);
      appendItems(data.items, { firstPage: isFirst });
      nextCursor = data.nextCursor;

      if (isFirst && data.items.length === 0) {
        if (statusEl) statusEl.textContent = "No digests yet - check back tomorrow morning.";
      }

      if (loadMoreBtn) {
        if (nextCursor === null) {
          loadMoreBtn.style.display = "none";
        } else {
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = "Load older days";
        }
      }
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = "Couldn't load digests right now. Try again later.";
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = "Load older days";
      }
    } finally {
      loading = false;
    }
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadNext);
  }

  loadNext();
})();
