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

function setStatusMessage(text, type = "info") {
  if (!statusElement) {
    return;
  }
  if (!text) {
    statusElement.hidden = true;
    return;
  }
  statusElement.hidden = false;
  statusElement.textContent = text;
  statusElement.classList.toggle("is-error", type === "error");
}

function setLastUpdated(text) {
  if (!lastUpdatedElement) {
    return;
  }
  if (!text) {
    lastUpdatedElement.textContent = "";
    lastUpdatedElement.hidden = true;
    return;
  }
  lastUpdatedElement.hidden = false;
  lastUpdatedElement.textContent = text;
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
        // Skip the next \n in Windows-style line endings
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
  if (normalized.includes("czytam")) {
    return "reading";
  }
  if (normalized.includes("planuje")) {
    return "next";
  }
  if (normalized.includes("przeczyt")) {
    return "finished";
  }
  return null;
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

  const localizedRating = normalizedRating.toLocaleString("pl-PL", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const ratingElement = document.createElement("div");
  ratingElement.className = "book-rating";
  ratingElement.setAttribute("role", "img");
  ratingElement.setAttribute(
    "aria-label",
    `Ocena: ${localizedRating} na 5`
  );
  ratingElement.setAttribute("title", `Ocena: ${localizedRating} / 5`);

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
  let readable = displayText;

  if (normalized.includes("pol")) {
    flag = "🇵🇱";
    readable = "polski";
  } else if (normalized.includes("ang") || normalized.includes("eng")) {
    flag = "🇬🇧";
    readable = "angielski";
  } else if (normalized.includes("hiszp") || normalized.includes("span")) {
    flag = "🇪🇸";
    readable = "hiszpański";
  } else if (normalized.includes("niem") || normalized.includes("ger")) {
    flag = "🇩🇪";
    readable = "niemiecki";
  } else if (normalized.includes("franc") || normalized.includes("fr")) {
    flag = "🇫🇷";
    readable = "francuski";
  }

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
    ariaParts.push(`format: ${formatInfo.label}`);
  }

  if (languageInfo) {
    const languageSpan = document.createElement("span");
    languageSpan.className = "book-meta-language";
    languageSpan.setAttribute(
      "aria-label",
      `Język: ${languageInfo.label}`
    );

    if (languageInfo.flag) {
      const flagSpan = document.createElement("span");
      flagSpan.className = "book-meta-language-flag";
      flagSpan.textContent = languageInfo.flag;
      flagSpan.setAttribute("aria-hidden", "true");
      languageSpan.appendChild(flagSpan);
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "book-meta-language-label";
    labelSpan.textContent = languageInfo.flag
      ? languageInfo.label
      : languageInfo.originalLabel;
    languageSpan.appendChild(labelSpan);

    container.appendChild(languageSpan);
    ariaParts.push(`język: ${languageInfo.label}`);
  }

  if (ariaParts.length > 0) {
    container.setAttribute("aria-label", `Sposób lektury – ${ariaParts.join(", ")}`);
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

function createBookCard(
  {
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

  if (typeof variant === "string") {
    const trimmedVariant = variant.trim();
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
    coverImage.alt = title ? `Okładka: ${title}` : "Okładka książki";
    coverImage.loading = "lazy";

    coverWrapper.appendChild(coverImage);
    bodyElement.appendChild(coverWrapper);
  }

  const contentElement = document.createElement("div");
  contentElement.className = "book-card-content";

  const titleElement = document.createElement("h3");
  titleElement.className = "book-title";
  const bookTitle = title || "(bez tytułu)";
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
    titleLink.setAttribute(
      "aria-label",
      `${bookTitle} – otwiera się w nowej karcie`
    );
    titleLink.title = `${bookTitle} (otwiera się w nowej karcie)`;
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
    setStatusMessage("Ładuję dane z arkusza...");
    setLastUpdated("");
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Nie udało się pobrać danych (status ${response.status}).`);
    }
    const csvText = await response.text();
    const rows = parseCSV(csvText).filter((row) =>
      row.some((cell) => cell && cell.trim() !== "")
    );

    if (rows.length === 0) {
      throw new Error("Arkusz nie zawiera żadnych danych.");
    }

    // Zakładamy, że pierwszy wiersz to nagłówki.
    const dataRows = rows.slice(1);

    const columnIndexes = SHEET_COLUMN_INDEXES;

    let itemsLoaded = 0;

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

      const card = createBookCard(
        {
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
        { variant: bucket }
      );
      lists[bucket].appendChild(card);
      itemsLoaded += 1;
    });

    ["reading", "next", "finished"].forEach((key) => toggleEmptyMessage(key));

    if (itemsLoaded > 0) {
      setStatusMessage("");
      setLastUpdated(`Zaktualizowano: ${new Date().toLocaleString("pl-PL")}.`);
    } else {
      setStatusMessage("Brak danych do wyświetlenia.");
      setLastUpdated("");
    }
  } catch (error) {
    console.error(error);
    setStatusMessage(
      "Nie udało się pobrać danych z arkusza. Spróbuj odświeżyć stronę później.",
      "error"
    );
    setLastUpdated("");
    ["reading", "next", "finished"].forEach((key) => toggleEmptyMessage(key));
  }
}

loadBooks();
