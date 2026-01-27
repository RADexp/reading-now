import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SHEET_CSV_URL =
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
  progress: 12, // kolumna M
  review: 13, // kolumna N
});

const REVIEW_OUTPUT_DIR = "recenzje";
const REVIEW_KEYWORDS = "recenzja, opinia";

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

function slugify(...parts) {
  const combined = parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!combined) {
    return "";
  }

  return combined
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
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
  let label = displayText;

  if (normalized.includes("pol")) {
    flag = "🇵🇱";
    label = "polski";
  } else if (normalized.includes("ang") || normalized.includes("eng")) {
    flag = "🇬🇧";
    label = "angielski";
  } else if (normalized.includes("hiszp") || normalized.includes("span")) {
    flag = "🇪🇸";
    label = "hiszpański";
  } else if (normalized.includes("niem") || normalized.includes("ger")) {
    flag = "🇩🇪";
    label = "niemiecki";
  } else if (normalized.includes("franc") || normalized.includes("fr")) {
    flag = "🇫🇷";
    label = "francuski";
  }

  return {
    flag,
    label,
    originalLabel: displayText,
  };
}

function escapeHtml(value) {
  const safeValue = value === undefined || value === null ? "" : value.toString();
  return safeValue
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineMarkdown(text) {
  let output = text;

  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/(^|[^*])\*(?!\s)([^*]+?)(?<!\s)\*/g, "$1<em>$2</em>");
  output = output.replace(/`([^`]+?)`/g, "<code>$1</code>");

  output = output.replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
    const sanitized = sanitizeExternalLink(url);
    if (!sanitized) {
      return match;
    }
    return `<a href="${sanitized}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  return output;
}

function renderMarkdown(text) {
  if (!text) {
    return "";
  }

  const escaped = escapeHtml(text);
  const lines = escaped.split(/\r?\n/);
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }
    const paragraph = applyInlineMarkdown(paragraphLines.join("<br>"));
    blocks.push(`<p>${paragraph}</p>`);
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length === 0) {
      return;
    }
    const items = listItems
      .map((item) => `<li>${applyInlineMarkdown(item)}</li>`)
      .join("");
    blocks.push(`<ul>${items}</ul>`);
    listItems = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks.join("\n");
}

function getYouTubeId(urlString) {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.replace(/^\//, "");
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.replace("/embed/", "");
      }

      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.replace("/shorts/", "");
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function extractYouTubeEmbed(text) {
  if (!text) {
    return { cleanedText: "", embedHtml: "" };
  }

  const urlRegex = /https?:\/\/[^\s)]+/g;
  const matches = text.match(urlRegex) || [];
  let foundUrl = null;
  let videoId = null;

  for (const candidate of matches) {
    const id = getYouTubeId(candidate);
    if (id) {
      foundUrl = candidate;
      videoId = id;
      break;
    }
  }

  if (!videoId) {
    return { cleanedText: text, embedHtml: "" };
  }

  const cleanedText = text.replace(foundUrl, "").trim();
  const embedHtml = `
    <div class="review-video" aria-label="YouTube">
      <div class="review-video-frame">
        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    </div>
  `;

  return { cleanedText, embedHtml };
}

function buildRatingStars(ratingValue) {
  if (ratingValue === undefined || ratingValue === null) {
    return "";
  }

  const numericRating = Number.parseFloat(ratingValue);
  if (!Number.isFinite(numericRating)) {
    return "";
  }

  const roundedRating = Math.round(numericRating * 4) / 4;
  const normalizedRating = Math.max(0, Math.min(5, roundedRating));

  if (normalizedRating === 0) {
    return "";
  }

  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    const starFill = Math.max(0, Math.min(1, normalizedRating - (i - 1)));
    const fillPercent = Math.round(starFill * 100);
    stars.push(`
      <span class="rating-star" aria-hidden="true">
        <span class="rating-star-base">☆</span>
        <span class="rating-star-fill" style="--star-fill: ${fillPercent}%">★</span>
      </span>
    `);
  }

  return `<div class="book-rating" aria-label="Ocena: ${normalizedRating} na 5">${stars.join("")}</div>`;
}

function renderReviewPage({
  title,
  author,
  genre,
  rating,
  coverUrl,
  format,
  language,
  reviewHtml,
  embedHtml,
  reviewSlug,
  preferredLink,
}) {
  const safeTitle = title || "(bez tytułu)";
  const safeAuthor = author || "";
  const safeGenre = genre || "";
  const safeCoverUrl = coverUrl || "";
  const safePreferredLink = preferredLink || "";

  const formatInfo = getFormatDisplay(format);
  const languageInfo = getLanguageDisplay(language);
  const consumptionParts = [];

  if (formatInfo) {
    consumptionParts.push(`
      <span class="book-meta-consumption-format">
        <span class="book-meta-consumption-icon" aria-hidden="true">${formatInfo.icon}</span>
        <span class="book-meta-consumption-label">${escapeHtml(formatInfo.label)}</span>
      </span>
    `);
  }

  if (languageInfo) {
    consumptionParts.push(`
      <span class="book-meta-language" aria-label="Język: ${escapeHtml(languageInfo.label)}">
        <span class="book-meta-language-flag" aria-hidden="true">${languageInfo.flag}</span>
        <span class="book-meta-language-label">${escapeHtml(languageInfo.label)}</span>
      </span>
    `);
  }

  const consumptionHtml =
    consumptionParts.length > 0
      ? `<span class="book-meta-consumption">${consumptionParts.join("")}</span>`
      : "";

  const ratingHtml = buildRatingStars(rating);
  const titleContent = safePreferredLink
    ? `<a class="book-title-link" href="${safePreferredLink}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        safeTitle
      )}</a>`
    : escapeHtml(safeTitle);

  const metaDescription = `${safeTitle} ${safeAuthor} – recenzja, opinia, wrażenia z lektury.`.trim();

  return `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(safeTitle)} – ${escapeHtml(safeAuthor)} | recenzja</title>
    <meta name="description" content="${escapeHtml(
      `${metaDescription} Słowa kluczowe: ${REVIEW_KEYWORDS}.`
    )}" />
    <link rel="icon" type="image/png" href="../favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="icon" href="../favicon.png" type="image/png" sizes="32x32" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body class="page-review" data-page="review" data-review-slug="${reviewSlug}">
    <header class="site-header">
      <div class="site-header-top">
        <div class="logo-container">
          <a class="logo-link" href="../" aria-label="Strona główna Radek czyta">
            <img
              src="../radek-czyta.png"
              width="180"
              height="180"
              alt="Ilustracja logo Radek czyta"
              class="logo-image"
              loading="lazy"
            />
          </a>
          <div class="logo-text-group">
            <a class="logo" href="../">Radek czyta</a>
            <p class="tagline">
              Lista książek, które właśnie pochłaniam, czekają w kolejce lub już są na półce
              przeczytane.
            </p>
          </div>
        </div>
        <nav class="site-nav">
          <a class="site-nav-link" href="../o-mnie/">O mnie</a>
        </nav>
      </div>
    </header>

    <main class="review-main">
      <section class="review-hero">
        <div class="book-card book-card--finished book-card--review">
          <div class="book-card-body">
            <div class="book-cover">
              ${
                safeCoverUrl
                  ? `<img src="${safeCoverUrl}" alt="Okładka: ${escapeHtml(
                      safeTitle
                    )}" loading="lazy" />`
                  : ""
              }
            </div>
            <div class="book-card-content">
              <h1 class="book-title">${titleContent}</h1>
              <p class="book-meta">
                ${
                  safeAuthor
                    ? `<span class="book-meta-author">${escapeHtml(safeAuthor)}</span>`
                    : ""
                }
                ${consumptionHtml}
                ${
                  safeGenre
                    ? `<span class="book-meta-genre">${escapeHtml(safeGenre)}</span>`
                    : ""
                }
              </p>
              ${ratingHtml}
            </div>
          </div>
        </div>
      </section>

      <section class="review-content">
        <div class="review-text">
          ${reviewHtml}
        </div>
        ${embedHtml}
      </section>
    </main>

    <footer class="site-footer">
      <p class="site-footer-text">Aktualizowane automatycznie z Google Sheets.</p>
    </footer>
  </body>
</html>`;
}

async function generateReviews() {
  const sheetUrl = process.env.SHEET_CSV_URL || DEFAULT_SHEET_CSV_URL;
  const response = await fetch(sheetUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet (status ${response.status}).`);
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText).filter((row) => row.some((cell) => cell && cell.trim() !== ""));

  if (rows.length <= 1) {
    throw new Error("Sheet has no data rows.");
  }

  const dataRows = rows.slice(1);
  const outputRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const outputDir = path.join(outputRoot, REVIEW_OUTPUT_DIR);

  await fs.mkdir(outputDir, { recursive: true });

  const generated = [];
  const writeTasks = [];

  dataRows.forEach((row, index) => {
    const title = getCellValue(row, SHEET_COLUMN_INDEXES.title);
    const author = getCellValue(row, SHEET_COLUMN_INDEXES.author);
    const genre = getCellValue(row, SHEET_COLUMN_INDEXES.genre);
    const coverUrl = getCellValue(row, SHEET_COLUMN_INDEXES.coverUrl);
    const rating = getCellValue(row, SHEET_COLUMN_INDEXES.rating);
    const format = getCellValue(row, SHEET_COLUMN_INDEXES.format);
    const language = getCellValue(row, SHEET_COLUMN_INDEXES.language);
    const polishLink = getCellValue(row, SHEET_COLUMN_INDEXES.polishLink);
    const englishLink = getCellValue(row, SHEET_COLUMN_INDEXES.englishLink);
    const reviewText = getCellValue(row, SHEET_COLUMN_INDEXES.review);

    if (!reviewText) {
      return;
    }

    if (!title || !author) {
      console.warn(`Skipping row ${index + 2}: missing title or author for review.`);
      return;
    }

    const reviewSlug = slugify(title, author);
    if (!reviewSlug) {
      console.warn(`Skipping row ${index + 2}: unable to create slug.`);
      return;
    }

    const preferredLink = getPreferredBookLink({
      languageValue: language,
      polishLink,
      englishLink,
    });

    const { cleanedText, embedHtml } = extractYouTubeEmbed(reviewText);
    const reviewHtml = renderMarkdown(cleanedText);

    const html = renderReviewPage({
      title,
      author,
      genre,
      rating,
      coverUrl,
      format,
      language,
      reviewHtml,
      embedHtml,
      reviewSlug,
      preferredLink,
    });

    const outputFile = path.join(outputDir, `${reviewSlug}.html`);
    generated.push({ slug: reviewSlug, outputFile });
    writeTasks.push(fs.writeFile(outputFile, html));
  });

  await Promise.all(writeTasks);

  console.log(`Generated ${generated.length} review page(s) in ${REVIEW_OUTPUT_DIR}/`);
  generated.forEach(({ slug, outputFile }) => {
    console.log(`- ${slug}: ${path.relative(outputRoot, outputFile)}`);
  });
}

generateReviews().catch((error) => {
  console.error(error);
  process.exit(1);
});
