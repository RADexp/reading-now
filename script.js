const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjjjgtBTUiSTuLiJQ_rP4m7uYffLK_uvkF2Dt1_NildFjEHUcilVUysEQRBH-iWJC1dA-Rtpx8tVn8/pub?gid=2028690260&single=true&output=csv";

const SHEET_COLUMN_INDEXES = Object.freeze({
  title: 2, // kolumna C
  author: 3, // kolumna D
  genre: 4, // kolumna E
  status: 5, // kolumna F
  format: 6, // kolumna G
  language: 7, // kolumna H
  rating: 8, // kolumna I
  coverUrl: 9, // kolumna J
  polishLink: 10, // kolumna K
  englishLink: 11, // kolumna L
});

const STATUS_KEYWORDS = Object.freeze({
  reading: ["czytam", "czyt", "reading", "current"],
  next: ["planuje", "plan", "nast", "next", "queue"],
  finished: ["przeczyt", "skoń", "finished", "read"],
});

const I18N = window.I18N;
const pageVariant =
  (typeof document !== "undefined" && document.body && document.body.dataset
    ? document.body.dataset.page
    : null) || "home";
const isInstaPage = pageVariant === "insta";

const lists = {
  reading: document.getElementById("reading-list"),
  next: document.getElementById("next-list"),
  finished: document.getElementById("finished-list"),
};

const emptyMessages = {
  reading: document.querySelector('[data-for="reading-list"]'),
  next: document.querySelector('[data-for="next-list"]'),
  finished: document.querySelector('[data-for="finished-list"]'),
};

const statusElement = document.getElementById("status-message");
const lastUpdatedElement = document.getElementById("last-updated");

const state = {
  books: [],
  status: { key: null, params: {}, type: "info" },
  lastUpdated: null,
};

function applyStatus() {
  if (!statusElement) {
    return;
  }
  const { key, params, type } = state.status;
  if (!key) {
    statusElement.hidden = true;
    statusElement.textContent = "";
    statusElement.classList.remove("is-error");
    return;
  }
  const message = I18N.translate(key, params);
  if (!message) {
    statusElement.hidden = true;
    statusElement.textContent = "";
    statusElement.classList.remove("is-error");
    return;
  }
  statusElement.hidden = false;
  statusElement.textContent = message;
  statusElement.classList.toggle("is-error", type === "error");
}

function showStatus(key, params = {}, type = "info") {
  state.status = { key, params, type };
  applyStatus();
}

function clearStatus() {
  state.status = { key: null, params: {}, type: "info" };
  applyStatus();
}

function applyLastUpdated() {
  if (!lastUpdatedElement) {
    return;
  }
  if (!state.lastUpdated) {
    lastUpdatedElement.textContent = "";
    lastUpdatedElement.hidden = true;
    return;
  }
  const formatted = I18N.formatDateTime(state.lastUpdated);
  if (!formatted) {
    lastUpdatedElement.textContent = "";
    lastUpdatedElement.hidden = true;
    return;
  }
  const label = I18N.translateDynamic("statusUpdated", { date: formatted });
  if (!label) {
    lastUpdatedElement.textContent = "";
    lastUpdatedElement.hidden = true;
    return;
  }
  lastUpdatedElement.hidden = false;
  lastUpdatedElement.textContent = label;
}

function setLastUpdated(date) {
  state.lastUpdated = date instanceof Date ? date : null;
  applyLastUpdated();
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\"") {
      const nextChar = text[i + 1];
      if (insideQuotes && nextChar === "\"") {
        current += "\"";
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function normalizeText(value) {
  if (!value) {
    return "";
  }
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeStatus(value) {
  return normalizeText(value);
}

function bucketForStatus(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) {
    return null;
  }

  let bestMatchBucket = null;
  let bestMatchLength = 0;

  for (const [bucket, keywords] of Object.entries(STATUS_KEYWORDS)) {
    keywords.forEach((keyword) => {
      if (!keyword) {
        return;
      }

      if (normalized.includes(keyword)) {
        const keywordLength = keyword.length;
        if (keywordLength > bestMatchLength) {
          bestMatchBucket = bucket;
          bestMatchLength = keywordLength;
        }
      }
    });
  }

  return bestMatchBucket;
}

function createRatingElement(ratingValue) {
  if (ratingValue === undefined || ratingValue === null) {
    return null;
  }

  const numericRating = Number.parseFloat(ratingValue);
  if (!Number.isFinite(numericRating)) {
    return null;
  }

  const roundedRating = Math.round(numericRating * 4) / 4;
  const normalizedRating = Math.max(0, Math.min(5, roundedRating));

  if (normalizedRating === 0) {
    return null;
  }

  const fractionalPart = normalizedRating - Math.trunc(normalizedRating);
  let fractionDigits = 0;
  if (fractionalPart === 0.5) {
    fractionDigits = 1;
  } else if (fractionalPart !== 0) {
    fractionDigits = 2;
  }

  const localizedRating = I18N.formatNumber(normalizedRating, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const ratingElement = document.createElement("div");
  ratingElement.className = "book-rating";
  ratingElement.setAttribute("role", "img");

  const ariaLabel = I18N.translateDynamic("ratingAria", { value: localizedRating });
  const title = I18N.translateDynamic("ratingTitle", { value: localizedRating });
  if (ariaLabel) {
    ratingElement.setAttribute("aria-label", ariaLabel);
  }
  if (title) {
    ratingElement.setAttribute("title", title);
  }

  for (let i = 1; i <= 5; i += 1) {
    const star = document.createElement("span");
    star.className = "rating-star";
    star.setAttribute("aria-hidden", "true");

    const baseStar = document.createElement("span");
    baseStar.className = "rating-star-base";
    baseStar.textContent = "☆";

    const fillStar = document.createElement("span");
    fillStar.className = "rating-star-fill";
    fillStar.textContent = "★";

    const starFill = Math.max(0, Math.min(1, normalizedRating - (i - 1)));
    const fillPercent = Math.round(starFill * 100);
    fillStar.style.setProperty("--star-fill", `${fillPercent}%`);

    star.append(baseStar, fillStar);
    ratingElement.appendChild(star);
  }

  return ratingElement;
}

function sanitizeExternalLink(value) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.toString().trim();
  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch (error) {
    return null;
  }
}

function getPreferredBookLink({ languageValue, polishLink, englishLink }) {
  const sanitizedPolishLink = sanitizeExternalLink(polishLink);
  const sanitizedEnglishLink = sanitizeExternalLink(englishLink);

  if (!sanitizedPolishLink && !sanitizedEnglishLink) {
    return null;
  }

  const normalizedLanguage = normalizeText(languageValue);
  const prefersEnglish = normalizedLanguage.includes("ang") || normalizedLanguage.includes("eng");
  const prefersPolish = normalizedLanguage.includes("pol");

  if (prefersEnglish && sanitizedEnglishLink) {
    return sanitizedEnglishLink;
  }

  if (prefersPolish && sanitizedPolishLink) {
    return sanitizedPolishLink;
  }

  if (sanitizedPolishLink) {
    return sanitizedPolishLink;
  }

  return sanitizedEnglishLink;
}

function getFormatDisplay(formatValue) {
  if (!formatValue) {
    return null;
  }

  const displayText = formatValue.toString().trim();
  if (!displayText) {
    return null;
  }

  const normalized = normalizeText(displayText);
  if (!normalized) {
    return null;
  }

  let icon = "";
  if (normalized.includes("audio")) {
    icon = "🎧";
  } else if (normalized.includes("ebook") || normalized.includes("e-book")) {
    icon = "📱";
  } else if (
    normalized.includes("papier") ||
    normalized.includes("druk") ||
    normalized.includes("paper")
  ) {
    icon = "📕";
  }

  if (!icon) {
    return null;
  }

  return {
    icon,
    label: displayText,
  };
}

function getLanguageDisplay(languageValue) {
  if (!languageValue) {
    return null;
  }

  const displayText = languageValue.toString().trim();
  if (!displayText) {
    return null;
  }

  const normalized = normalizeText(displayText);
  if (!normalized) {
    return null;
  }

  let flag = "";
  let code = null;

  if (normalized.includes("pol")) {
    flag = "🇵🇱";
    code = "pl";
  } else if (normalized.includes("ang") || normalized.includes("eng")) {
    flag = "🇬🇧";
    code = "en";
  } else if (normalized.includes("hiszp") || normalized.includes("span")) {
    flag = "🇪🇸";
    code = "es";
  } else if (normalized.includes("niem") || normalized.includes("ger")) {
    flag = "🇩🇪";
    code = "de";
  } else if (normalized.includes("franc") || normalized.includes("fr")) {
    flag = "🇫🇷";
    code = "fr";
  }

  const languageNames = I18N.translate("languageNames") || {};
  const readable = (code && languageNames[code]) || displayText;

  return {
    flag,
    label: readable,
    originalLabel: displayText,
  };
}

function createConsumptionElement(formatValue, languageValue) {
  const formatInfo = getFormatDisplay(formatValue);
  const languageInfo = getLanguageDisplay(languageValue);

  if (!formatInfo && !languageInfo) {
    return null;
  }

  const container = document.createElement("span");
  container.className = "book-meta-consumption";

  const ariaParts = [];

  if (formatInfo) {
    const formatSpan = document.createElement("span");
    formatSpan.className = "book-meta-consumption-format";

    const iconSpan = document.createElement("span");
    iconSpan.className = "book-meta-consumption-icon";
    iconSpan.textContent = formatInfo.icon;

    const labelSpan = document.createElement("span");
    labelSpan.className = "book-meta-consumption-label";
    labelSpan.textContent = formatInfo.label;

    formatSpan.append(iconSpan, labelSpan);
    container.appendChild(formatSpan);

    const ariaText = I18N.translateDynamic("consumptionFormat", { label: formatInfo.label });
    if (ariaText) {
      ariaParts.push(ariaText);
    }
  }

  if (languageInfo) {
    const languageSpan = document.createElement("span");
    languageSpan.className = "book-meta-language";

    const labelText = languageInfo.flag ? languageInfo.label : languageInfo.originalLabel;
    const ariaLabel = I18N.translateDynamic("languageAria", { label: labelText });
    if (ariaLabel) {
      languageSpan.setAttribute("aria-label", ariaLabel);
    }

    if (languageInfo.flag) {
      const flagSpan = document.createElement("span");
      flagSpan.className = "book-meta-language-flag";
      flagSpan.textContent = languageInfo.flag;
      flagSpan.setAttribute("aria-hidden", "true");
      languageSpan.appendChild(flagSpan);
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "book-meta-language-label";
    labelSpan.textContent = labelText;
    languageSpan.appendChild(labelSpan);

    container.appendChild(languageSpan);

    const ariaText = I18N.translateDynamic("consumptionLanguage", { label: labelText });
    if (ariaText) {
      ariaParts.push(ariaText);
    }
  }

  if (ariaParts.length > 0) {
    const details = ariaParts.join(", ");
    const combined = I18N.translateDynamic("consumptionLabel", { details });
    if (combined) {
      container.setAttribute("aria-label", combined);
    }
  }

  return container;
}

function getCellValue(row, index) {
  if (!row || index === undefined || index === null || index < 0) {
    return "";
  }
  const value = row[index];
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return "";
  }
  return value.toString().trim();
}

function createInstaBadge(label, modifier, { icon, ariaLabel } = {}) {
  if (!label) {
    return null;
  }

  const text = label.toString().trim();
  if (!text) {
    return null;
  }

  const badge = document.createElement("span");
  badge.className = "insta-book-badge";

  if (modifier) {
    badge.classList.add(`insta-book-badge--${modifier}`);
  }

  if (ariaLabel) {
    badge.setAttribute("aria-label", ariaLabel);
  }

  if (icon) {
    const iconSpan = document.createElement("span");
    iconSpan.className = "insta-book-badge-icon";
    iconSpan.textContent = icon;
    iconSpan.setAttribute("aria-hidden", "true");
    badge.appendChild(iconSpan);
  }

  const labelSpan = document.createElement("span");
  labelSpan.className = "insta-book-badge-label";
  labelSpan.textContent = text;
  badge.appendChild(labelSpan);

  return badge;
}

function createInstaBookCard(
  { title, coverUrl, format, language, genre },
  { variant } = {}
) {
  const item = document.createElement("li");
  item.className = "insta-book-card";

  if (variant) {
    item.classList.add(`insta-book-card--${variant}`);
  }

  if (coverUrl) {
    const coverWrapper = document.createElement("div");
    coverWrapper.className = "insta-book-cover";

    const coverImage = document.createElement("img");
    coverImage.src = coverUrl;
    const fallbackTitle = I18N.getPlaceholder("untitled") || "";
    const bookTitle = title || fallbackTitle || "";
    const coverAlt = title
      ? I18N.translateDynamic("coverAlt", { title: bookTitle })
      : I18N.translateDynamic("coverAltFallback");
    if (coverAlt) {
      coverImage.alt = coverAlt;
    }
    coverImage.loading = "lazy";
    coverWrapper.appendChild(coverImage);
    item.appendChild(coverWrapper);
  }

  const metaElement = document.createElement("div");
  metaElement.className = "insta-book-meta";

  const formatInfo = getFormatDisplay(format);
  if (formatInfo) {
    const ariaText = I18N.translateDynamic("consumptionFormat", { label: formatInfo.label });
    const badge = createInstaBadge(formatInfo.label, "format", {
      icon: formatInfo.icon,
      ariaLabel: ariaText,
    });
    if (badge) {
      metaElement.appendChild(badge);
    }
  }

  const languageInfo = getLanguageDisplay(language);
  if (languageInfo) {
    const labelText = languageInfo.flag ? languageInfo.label : languageInfo.originalLabel;
    const ariaText = I18N.translateDynamic("languageAria", { label: labelText });
    const badge = createInstaBadge(labelText, "language", {
      icon: languageInfo.flag,
      ariaLabel: ariaText,
    });
    if (badge) {
      metaElement.appendChild(badge);
    }
  }

  const genreBadge = createInstaBadge(genre, "genre");
  if (genreBadge) {
    metaElement.appendChild(genreBadge);
  }

  if (metaElement.childElementCount > 0) {
    item.appendChild(metaElement);
  }

  if (!coverUrl && metaElement.childElementCount === 0) {
    return null;
  }

  return item;
}

function createBookCard(
  {
    bucket,
    title,
    author,
    genre,
    rating,
    coverUrl,
    polishLink,
    englishLink,
    format,
    language,
  },
  { variant } = {}
) {
  const item = document.createElement("li");
  item.className = "book-card";

  const effectiveVariant = variant || bucket;
  if (typeof effectiveVariant === "string") {
    const trimmedVariant = effectiveVariant.trim();
    if (trimmedVariant) {
      item.classList.add(`book-card--${trimmedVariant}`);
    }
  }

  const bodyElement = document.createElement("div");
  bodyElement.className = "book-card-body";

  if (coverUrl) {
    const coverWrapper = document.createElement("div");
    coverWrapper.className = "book-cover";

    const coverImage = document.createElement("img");
    coverImage.src = coverUrl;
    const fallbackTitle = I18N.getPlaceholder("untitled") || "";
    const bookTitle = title || fallbackTitle || "";
    const coverAlt = title
      ? I18N.translateDynamic("coverAlt", { title: bookTitle })
      : I18N.translateDynamic("coverAltFallback");
    if (coverAlt) {
      coverImage.alt = coverAlt;
    }
    coverImage.loading = "lazy";

    coverWrapper.appendChild(coverImage);
    bodyElement.appendChild(coverWrapper);
  }

  const contentElement = document.createElement("div");
  contentElement.className = "book-card-content";

  const titleElement = document.createElement("h3");
  titleElement.className = "book-title";
  const fallbackTitle = I18N.getPlaceholder("untitled") || "";
  const bookTitle = title || fallbackTitle || "";
  const preferredLink = getPreferredBookLink({
    languageValue: language,
    polishLink,
    englishLink,
  });

  if (preferredLink) {
    const titleLink = document.createElement("a");
    titleLink.className = "book-title-link";
    titleLink.href = preferredLink;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.textContent = bookTitle;

    const ariaLabel = I18N.translateDynamic("linkAria", { title: bookTitle });
    const titleText = I18N.translateDynamic("linkTitle", { title: bookTitle });
    if (ariaLabel) {
      titleLink.setAttribute("aria-label", ariaLabel);
    }
    if (titleText) {
      titleLink.title = titleText;
    }

    titleElement.appendChild(titleLink);
  } else {
    titleElement.textContent = bookTitle;
  }

  contentElement.appendChild(titleElement);

  const metaElement = document.createElement("p");
  metaElement.className = "book-meta";

  if (author) {
    const authorSpan = document.createElement("span");
    authorSpan.className = "book-meta-author";
    authorSpan.textContent = author;
    metaElement.appendChild(authorSpan);
  }

  const consumptionElement = createConsumptionElement(format, language);
  if (consumptionElement) {
    metaElement.appendChild(consumptionElement);
  }

  if (genre) {
    const genreSpan = document.createElement("span");
    genreSpan.className = "book-meta-genre";
    genreSpan.textContent = genre;
    metaElement.appendChild(genreSpan);
  }

  if (metaElement.childElementCount > 0) {
    contentElement.appendChild(metaElement);
  }

  const ratingElement = createRatingElement(rating);
  if (ratingElement) {
    contentElement.appendChild(ratingElement);
  }

  bodyElement.appendChild(contentElement);
  item.appendChild(bodyElement);

  return item;
}

function clearLists() {
  Object.values(lists).forEach((list) => {
    if (list) {
      list.replaceChildren();
    }
  });
}

function renderBooks() {
  clearLists();
  const grouped = {
    reading: [],
    next: [],
    finished: [],
  };

  state.books.forEach((book) => {
    if (grouped[book.bucket]) {
      grouped[book.bucket].push(book);
    }
  });

  Object.entries(grouped).forEach(([bucket, items]) => {
    const list = lists[bucket];
    if (!list || items.length === 0) {
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const card = isInstaPage
        ? createInstaBookCard(item, { variant: bucket })
        : createBookCard(item, { variant: bucket });
      if (card) {
        fragment.appendChild(card);
      }
    });
    list.appendChild(fragment);
  });

  ["reading", "next", "finished"].forEach((key) => toggleEmptyMessage(key));
}

function toggleEmptyMessage(listKey) {
  const list = lists[listKey];
  const message = emptyMessages[listKey];
  if (!list || !message) {
    return;
  }
  if (list.children.length === 0) {
    message.hidden = false;
  } else {
    message.hidden = true;
  }
}

async function loadBooks() {
  try {
    showStatus("home.status.loading");
    setLastUpdated(null);
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      const error = new Error("HTTP_ERROR");
      error.status = response.status;
      throw error;
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText).filter((row) => row.some((cell) => cell && cell.trim() !== ""));

    if (rows.length === 0) {
      const error = new Error("EMPTY_SHEET");
      error.code = "EMPTY_SHEET";
      throw error;
    }

    const dataRows = rows.slice(1);
    const columnIndexes = SHEET_COLUMN_INDEXES;

    const items = [];

    dataRows.forEach((row) => {
      const title = getCellValue(row, columnIndexes.title);
      const author = getCellValue(row, columnIndexes.author);
      const genre = getCellValue(row, columnIndexes.genre);
      const status = getCellValue(row, columnIndexes.status);
      const coverUrl = getCellValue(row, columnIndexes.coverUrl);
      const rating = getCellValue(row, columnIndexes.rating);
      const format = getCellValue(row, columnIndexes.format);
      const language = getCellValue(row, columnIndexes.language);
      const polishLink = getCellValue(row, columnIndexes.polishLink);
      const englishLink = getCellValue(row, columnIndexes.englishLink);

      const bucket = bucketForStatus(status);
      if (!bucket || !lists[bucket]) {
        return;
      }

      items.push({
        bucket,
        title,
        author,
        genre,
        rating,
        coverUrl,
        polishLink,
        englishLink,
        format,
        language,
      });
    });

    state.books = items;
    renderBooks();

    if (items.length > 0) {
      clearStatus();
      setLastUpdated(new Date());
    } else {
      showStatus("home.status.noData");
      setLastUpdated(null);
    }
  } catch (error) {
    console.error(error);
    state.books = [];
    renderBooks();
    setLastUpdated(null);
    if (error && error.status) {
      showStatus("dynamic.statusHttpError", { status: error.status }, "error");
    } else if (error && error.code === "EMPTY_SHEET") {
      showStatus("home.status.sheetEmpty", {}, "error");
    } else {
      showStatus("home.status.fetchError", {}, "error");
    }
  }
}

if (I18N) {
  I18N.onReady(() => {
    applyStatus();
    applyLastUpdated();
    loadBooks();
  });

  I18N.onChange(() => {
    applyStatus();
    applyLastUpdated();
    renderBooks();
  });
} else {
  loadBooks();
}
