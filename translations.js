(function () {
  const LANGUAGE_STORAGE_KEY = "radek-czyta-language";

  const LANGUAGE_METADATA = {
    pl: { label: "PL", flag: "🇵🇱" },
    en: { label: "EN", flag: "🇬🇧" },
  };

  const translations = {
    pl: {
      meta: { htmlLang: "pl", locale: "pl-PL" },
      languageNames: {
        pl: "polski",
        en: "angielski",
        es: "hiszpański",
        de: "niemiecki",
        fr: "francuski",
      },
      pageTitles: {
        home: "Radek czyta",
        about: "O mnie – Radek czyta",
      },
      common: {
        logoText: "Radek czyta",
        tagline:
          "Lista książek, które właśnie pochłaniam, czekają w kolejce lub już są na półce przeczytane.",
        logoLinkAria: "Strona główna Radek czyta",
        logoAlt: "Ilustracja logo Radek czyta",
      },
      navigation: {
        about: "O mnie",
        books: "Lista książek",
      },
      home: {
        sections: {
          reading: "Teraz czytam",
          next: "Następne",
          finished: "Przeczytane",
        },
        carousel: {
          prev: "Poprzednie książki",
          next: "Następne książki",
        },
        empty: "Brak książek w tej sekcji.",
        status: {
          loading: "Ładuję dane z arkusza...",
          sheetEmpty: "Arkusz nie zawiera żadnych danych.",
          noData: "Brak danych do wyświetlenia.",
          fetchError:
            "Nie udało się pobrać danych z arkusza. Spróbuj odświeżyć stronę później.",
        },
      },
      insta: {
        themeToggle: {
          ariaDark: "Przełącz na ciemny motyw",
          ariaLight: "Przełącz na jasny motyw",
        },
      },
      about: {
        heading: "O mnie",
        paragraph1:
          "Hej, nazywam się Radek Grabarek i na tej stronie pokazuję listę książek jakie ostatnio czytałem, czytam lub planuję przeczytać. Bardzo lubię książki, choć często brakuje mi na nie czasu. Ale tak chyba mają wszystkie mole ksiażkowe, prawda?",
        paragraph2:
          'Dla relaksu wybieram science fiction – szczególnie historie osadzone w kosmosie. Fascynują mnie astronomia, astronautyka i inżynieria kosmiczna, więc sięgam też po książki popularnonaukowe w tych tematach. Z pasji do kosmosu prowadzę też kanał YouTube <a href="https://www.youtube.com/@wnms" target="_blank" rel="noopener noreferrer"><em>We Need More Space</em></a>, gdzie opowiadam o misjach kosmicznych i dzielę się recenzjami niektórych tytułów.',
        paragraph3:
          "Od czasu do czasu sięgam również po książki o marketingu, biznesie online czy rozwoju osobistym – wybieram jednak te rzetelne, praktyczne pozycje, a nie \u201ccoacherskie\u201d poradniki.",
        paragraph4:
          "Jak widać jestem z tych, którzy czytają po kilka książek na raz, ale zwykle jest to tylko jedna książka z danego gatunku.",
        footer: "Dzięki za odwiedziny!",
      },
      footers: {
        home: "Aktualizowane automatycznie z Google Sheets.",
        about: "Dzięki za odwiedziny!",
      },
      placeholders: {
        untitled: "(bez tytułu)",
      },
      languageToggle: {
        aria: ({ targetLanguageName }) => `Zmień język na ${targetLanguageName}`,
        title: ({ targetLanguageName }) => `Zmień język na ${targetLanguageName}`,
      },
      dynamic: {
        ratingAria: ({ value }) => `Ocena: ${value} na 5`,
        ratingTitle: ({ value }) => `Ocena: ${value} / 5`,
        coverAlt: ({ title }) => `Okładka: ${title}`,
        coverAltFallback: "Okładka książki",
        linkAria: ({ title }) => `${title} – otwiera się w nowej karcie`,
        linkTitle: ({ title }) => `${title} (otwiera się w nowej karcie)`,
        consumptionLabel: ({ details }) => `Sposób lektury – ${details}`,
        consumptionFormat: ({ label }) => `format: ${label}`,
        consumptionLanguage: ({ label }) => `język: ${label}`,
        languageAria: ({ label }) => `Język: ${label}`,
        progressLabel: ({ value }) => `Progres czytania: ${value}%`,
        statusUpdated: ({ date }) => `Zaktualizowano: ${date}.`,
        statusHttpError: ({ status }) => `Nie udało się pobrać danych (status ${status}).`,
      },
    },
    en: {
      meta: { htmlLang: "en", locale: "en-GB" },
      languageNames: {
        pl: "Polish",
        en: "English",
        es: "Spanish",
        de: "German",
        fr: "French",
      },
      pageTitles: {
        home: "Radek reads",
        about: "About – Radek reads",
      },
      common: {
        logoText: "Radek reads",
        tagline:
          "A list of books I'm currently devouring, queued up, or already finished.",
        logoLinkAria: "Radek reads home page",
        logoAlt: "Radek reads logo illustration",
      },
      navigation: {
        about: "About me",
        books: "Book list",
      },
      home: {
        sections: {
          reading: "Currently reading",
          next: "Up next",
          finished: "Finished",
        },
        carousel: {
          prev: "Previous books",
          next: "Next books",
        },
        empty: "No books in this section.",
        status: {
          loading: "Loading data from the sheet...",
          sheetEmpty: "The sheet does not contain any data.",
          noData: "No data to display.",
          fetchError:
            "Couldn't fetch data from the sheet. Please refresh the page later.",
        },
      },
      insta: {
        themeToggle: {
          ariaDark: "Switch to dark theme",
          ariaLight: "Switch to light theme",
        },
      },
      about: {
        heading: "About me",
        paragraph1:
          "Hi, I'm Radek Grabarek and on this page I share a list of books I've recently read, am reading or plan to pick up. I love books, even if I often run out of time for them. But that's what bookworms are like, right?",
        paragraph2:
          `To unwind I reach for science fiction—especially stories set in space. I'm fascinated by astronomy, astronautics and space engineering, so I also read popular science books on those topics. Driven by this passion I run the YouTube channel <a href="https://www.youtube.com/@wnms" target="_blank" rel="noopener noreferrer"><em>We Need More Space</em></a>, where I talk about space missions and share reviews of selected titles.`,
        paragraph3:
          "From time to time I also reach for books about marketing, online business or personal development—I go for reliable, practical titles rather than fluffy \"coach\" guides.",
        paragraph4:
          "As you can see, I'm the kind of reader who juggles several books at once, though usually just one per genre.",
        footer: "Thanks for visiting!",
      },
      footers: {
        home: "Automatically updated from Google Sheets.",
        about: "Thanks for visiting!",
      },
      placeholders: {
        untitled: "(no title)",
      },
      languageToggle: {
        aria: ({ targetLanguageName }) => `Switch language to ${targetLanguageName}`,
        title: ({ targetLanguageName }) => `Switch language to ${targetLanguageName}`,
      },
      dynamic: {
        ratingAria: ({ value }) => `Rating: ${value} out of 5`,
        ratingTitle: ({ value }) => `Rating: ${value} / 5`,
        coverAlt: ({ title }) => `Cover: ${title}`,
        coverAltFallback: "Book cover",
        linkAria: ({ title }) => `${title} – opens in a new tab`,
        linkTitle: ({ title }) => `${title} (opens in a new tab)`,
        consumptionLabel: ({ details }) => `Reading format – ${details}`,
        consumptionFormat: ({ label }) => `format: ${label}`,
        consumptionLanguage: ({ label }) => `language: ${label}`,
        languageAria: ({ label }) => `Language: ${label}`,
        progressLabel: ({ value }) => `Reading progress: ${value}%`,
        statusUpdated: ({ date }) => `Updated: ${date}.`,
        statusHttpError: ({ status }) => `Failed to fetch data (status ${status}).`,
      },
    },
  };

  const listeners = new Set();
  const readyListeners = [];
  let initialized = false;
  let currentLanguage = null;
  let currentPage = null;
  let toggleAttached = false;

  function resolveLanguage(language) {
    if (!language) {
      return null;
    }
    const lower = language.toLowerCase();
    if (translations[lower]) {
      return lower;
    }
    const [shortCode] = lower.split("-");
    if (translations[shortCode]) {
      return shortCode;
    }
    return null;
  }

  function getStoredLanguage() {
    try {
      return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeLanguage(language) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      // ignore storage errors
    }
  }

  function detectBrowserLanguage() {
    const nav = window.navigator || {};
    const preferences = [];
    if (Array.isArray(nav.languages)) {
      preferences.push(...nav.languages);
    }
    if (nav.language) {
      preferences.push(nav.language);
    }
    if (nav.userLanguage) {
      preferences.push(nav.userLanguage);
    }
    for (const preference of preferences) {
      const resolved = resolveLanguage(preference);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }

  function getTranslationObject(language) {
    return translations[language] || translations.en;
  }

  function getFromObject(object, path) {
    if (!object) {
      return undefined;
    }
    const segments = path.split(".");
    let value = object;
    for (const segment of segments) {
      if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
        value = value[segment];
      } else {
        return undefined;
      }
    }
    return value;
  }

  function translateInternal(language, key, params) {
    const dictionary = getTranslationObject(language);
    const rawValue = getFromObject(dictionary, key);
    if (typeof rawValue === "function") {
      return rawValue(params || {});
    }
    return rawValue;
  }

  function translate(key, params) {
    return translateInternal(currentLanguage, key, params);
  }

  function formatNumber(value, options) {
    const locale = translateInternal(currentLanguage, "meta.locale") || currentLanguage;
    return Number(value).toLocaleString(locale, options);
  }

  function formatDateTime(date) {
    if (!(date instanceof Date)) {
      return "";
    }
    const locale = translateInternal(currentLanguage, "meta.locale") || currentLanguage;
    return date.toLocaleString(locale);
  }

  function setElementContent(element, key) {
    const mode = element.getAttribute("data-i18n-mode") || "text";
    const translation = translate(key);
    if (translation === undefined || translation === null) {
      return;
    }
    if (mode === "html") {
      element.innerHTML = translation;
    } else {
      element.textContent = translation;
    }
  }

  function applyAttributeTranslations(element, descriptor) {
    if (!descriptor) {
      return;
    }
    const pairs = descriptor
      .split(/[,;]+/)
      .map((pair) => pair.trim())
      .filter(Boolean);
    pairs.forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (!attr || !key) {
        return;
      }
      const translation = translate(key);
      if (translation === undefined || translation === null) {
        return;
      }
      element.setAttribute(attr, translation);
    });
  }

  function updatePageTitle() {
    if (!currentPage) {
      return;
    }
    const pageTitle = translate(`pageTitles.${currentPage}`);
    if (pageTitle) {
      document.title = pageTitle;
    }
  }

  function updateHtmlLang() {
    const htmlLang = translate("meta.htmlLang") || currentLanguage;
    document.documentElement.setAttribute("lang", htmlLang);
  }

  function applyTranslationsToDocument() {
    updateHtmlLang();
    updatePageTitle();
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) {
        return;
      }
      setElementContent(element, key);
    });
    const attributeElements = document.querySelectorAll("[data-i18n-attrs]");
    attributeElements.forEach((element) => {
      const descriptor = element.getAttribute("data-i18n-attrs");
      applyAttributeTranslations(element, descriptor);
    });
    updateLanguageToggle();
  }

  function getTargetLanguage() {
    const available = Object.keys(translations);
    if (available.length <= 1) {
      return currentLanguage;
    }
    const currentIndex = available.indexOf(currentLanguage);
    if (currentIndex === -1) {
      return available[0];
    }
    return available[(currentIndex + 1) % available.length];
  }

  function updateLanguageToggle() {
    const toggle = document.querySelector("[data-language-toggle]");
    if (!toggle) {
      return;
    }
    const targetLanguage = getTargetLanguage();
    const metadata = LANGUAGE_METADATA[targetLanguage] || {};
    const languageNames = translate("languageNames") || {};
    const targetLanguageName = languageNames[targetLanguage] || targetLanguage;
    const ariaLabel = translate("languageToggle.aria", { targetLanguageName });
    const title = translate("languageToggle.title", { targetLanguageName });

    toggle.setAttribute("data-target-language", targetLanguage);
    if (ariaLabel) {
      toggle.setAttribute("aria-label", ariaLabel);
    }
    if (title) {
      toggle.setAttribute("title", title);
    }

    const flagElement = toggle.querySelector("[data-language-toggle-flag]");
    const labelElement = toggle.querySelector("[data-language-toggle-label]");
    if (flagElement) {
      flagElement.textContent = metadata.flag || "";
    }
    if (labelElement) {
      labelElement.textContent = metadata.label || targetLanguage.toUpperCase();
    }

    if (!toggleAttached) {
      toggle.addEventListener("click", () => {
        const nextLanguage = getTargetLanguage();
        setLanguage(nextLanguage);
      });
      toggleAttached = true;
    }
  }

  function notifyListeners() {
    listeners.forEach((listener) => {
      try {
        listener(currentLanguage);
      } catch (error) {
        console.error(error);
      }
    });
  }

  function runReadyListeners() {
    initialized = true;
    while (readyListeners.length > 0) {
      const listener = readyListeners.shift();
      try {
        listener(currentLanguage);
      } catch (error) {
        console.error(error);
      }
    }
  }

  function setLanguage(language) {
    const resolved = resolveLanguage(language);
    if (!resolved || resolved === currentLanguage) {
      return;
    }
    currentLanguage = resolved;
    storeLanguage(currentLanguage);
    applyTranslationsToDocument();
    notifyListeners();
  }

  function init() {
    if (initialized) {
      return;
    }
    const stored = resolveLanguage(getStoredLanguage());
    const detected = detectBrowserLanguage();
    currentLanguage = stored || detected || "en";
    if (!translations[currentLanguage]) {
      currentLanguage = "en";
    }
    currentPage = document.body ? document.body.getAttribute("data-page") : null;
    applyTranslationsToDocument();
    runReadyListeners();
  }

  const I18N = {
    getCurrentLanguage() {
      return currentLanguage;
    },
    setLanguage,
    translate(key, params) {
      return translate(key, params);
    },
    translateFor(language, key, params) {
      const resolved = resolveLanguage(language) || currentLanguage;
      return translateInternal(resolved, key, params);
    },
    formatNumber,
    formatDateTime,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onReady(listener) {
      if (initialized) {
        listener(currentLanguage);
      } else {
        readyListeners.push(listener);
      }
    },
    getLocale() {
      return translateInternal(currentLanguage, "meta.locale") || currentLanguage;
    },
    getPlaceholder(key) {
      return translate(`placeholders.${key}`);
    },
    translateDynamic(key, params) {
      return translate(`dynamic.${key}`, params);
    },
    getTargetLanguage,
  };

  window.I18N = I18N;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
