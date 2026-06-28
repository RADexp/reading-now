# Prompt startowy: budowa "Radek Czyta" v2 od zera (Notion API + nowy frontend)

> Skopiuj treść poniżej (od "## Cel projektu") do nowej rozmowy, żeby zacząć budowę serwisu od zera.

## Cel projektu

Buduję od zera wersję 2.0 osobistego serwisu do śledzenia czytanych książek i recenzji ("Radek Czyta" / radekreads.pl).

**Wersja 1 (obecna, działająca)**: statyczna strona HTML/JS/CSS bez build systemu, hostowana na GitHub Pages. Dane o książkach pochodzą z publicznego Google Sheet (eksport CSV), pobieranego po stronie klienta przy każdym wejściu na stronę. Treści recenzji generowane są jako statyczne pliki HTML z plików Markdown (skrypt Node.js `generate-reviews.mjs`) lub z kolumny w arkuszu.

**Wersja 2 (do zbudowania w tej rozmowie)**:
- Źródłem danych jest **Notion** — baza/strony zaciągane przez **Notion API** (zamiast Google Sheet CSV).
- Frontend jest **całkowicie nowy** — stack/framework jeszcze nie wybrany, zdecydujemy to w tej rozmowie wspólnie (zapytaj mnie o preferencje: SSG/SSR, hosting, język).
- **Cel tego promptu**: przenieść 1:1 logikę biznesową obecnego serwisu (reguły, model danych, transformacje), żeby nic z dotychczasowego zachowania się nie zgubiło. Warstwa wizualna/CSS ma być zaprojektowana od nowa — nie kopiuj starego UI.

Poniżej pełna specyfikacja logiki, wyodrębniona z obecnego kodu (`script.js`, `scripts/generate-reviews.mjs`, `translations.js`).

---

## 1. Model danych książki

Obecnie każda książka to wiersz arkusza z 13 kolumnami (C–N). W Notion docelowo to strona w bazie "Books" z właściwościami:

| Pole | Typ obecny (Sheet) | Sugerowany typ w Notion | Opis |
|---|---|---|---|
| title | tekst | Title | Tytuł książki |
| author | tekst | Rich text / Select | Autor |
| genre | tekst | Select / Multi-select | Gatunek |
| status | tekst wolny (keyword matching) | **Select** z 3 wartościami: `reading` / `next` / `finished` | Status czytania |
| format | tekst wolny | Select (`papier`/`ebook`/`audiobook`) | Format książki |
| language | tekst wolny | Select (`polski`/`angielski`/`hiszpański`/`niemiecki`/`francuski`) | Język wydania |
| rating | liczba 0–5 (krok 0.25) | Number | Ocena |
| coverUrl | URL | URL / Files & media | Okładka |
| polishLink | URL | URL | Link do księgarni PL |
| englishLink | URL | URL | Link do księgarni EN |
| progress | liczba 0–100 | Number | Procent przeczytania (tylko dla "reading") |
| review | markdown / treść strony | treść strony Notion (page content / blocks) | Recenzja |

**Ważna zmiana względem v1**: status nie jest już wolnym tekstem dopasowywanym po słowach kluczowych — w Notion to z góry zdefiniowany Select z 3 opcjami. Logika keyword-matching (patrz pkt 2) **odpada**, ale trzeba zachować te same 3 kubełki w UI: "w trakcie" / "w kolejce" / "przeczytane".

## 2. Logika bucketowania statusu (do zachowania jako koncepcja, nie jako kod)

W v1: dopasowanie po najdłużej zgodnym słowie kluczowym (greedy):
```
reading:  ["czytam", "czyt", "reading", "current"]
next:     ["planuje", "plan", "nast", "next", "queue"]
finished: ["przeczyt", "skoń", "finished", "read"]
```
Książka bez dopasowania = pomijana.

W v2: ponieważ status to Select w Notion, ten keyword-matching nie jest potrzebny — wystarczy bezpośrednie mapowanie wartości Select na 3 sekcje strony głównej. **Zachowaj jednak fakt, że muszą istnieć właśnie te 3 sekcje** i że książka z nieprawidłowym/pustym statusem powinna być pomijana (lub trafiać do osobnej kategorii "bez statusu" — do decyzji).

## 3. Logika recenzji

**Priorytet źródła treści w v1**: plik Markdown w `Wsad/` (dopasowywany fuzzy matchingiem tytuł+autor, Levenshtein distance, progi: tytuł ≥0.7, autor ≥0.6, łącznie ≥0.7, próg niejednoznaczności 0.05) > kolumna `review` z arkusza.

**W v2**: recenzja to natywna treść strony książki w Notion (rich text / blocks), pobierana przez API — **fuzzy matching nie jest już potrzebny**, bo recenzja jest właściwością tej samej strony co metadane książki (jeden obiekt, nie dwa źródła do scalania).

**Do zachowania (renderowanie treści)**:
- Nagłówki (h1–h6), listy nieuporządkowane, pogrubienie, kursywa, kod inline, linki (`target="_blank" rel="noopener noreferrer"`, walidacja URL).
- **Wykrywanie linku YouTube w treści recenzji** i automatyczne zamienianie go na responsywny embed (obsługa formatów `youtu.be/{id}`, `youtube.com/watch?v={id}`, `/embed/{id}`, `/shorts/{id}`), z usunięciem surowego linku z tekstu.
- Uwaga: jeśli Notion API zwraca už ustrukturyzowane blocks (heading, bulleted_list_item, paragraph, itd.), renderowanie markdown-to-HTML może się znacząco uprościć — Notion już parsuje te elementy. Zachować trzeba tylko logikę wykrywania YouTube (Notion sam też potrafi mieć video embed jako blok — sprawdzić czy lepiej używać natywnego bloku video w Notion zamiast linku w tekście).

**Recenzja widoczna jest tylko dla książek ze statusem "finished" i tylko jeśli treść recenzji istnieje** (niepusta).

## 4. Reguły pomocnicze do zachowania 1:1

- **Slugify** (tytuł + autor → slug URL): normalizacja Unicode (NFD, usunięcie znaków diakrytycznych), lowercase, zamiana znaków niealfanumerycznych na myślniki, redukcja wielokrotnych myślników, przycięcie krawędzi. Używane do generowania trwałych, czytelnych adresów URL recenzji (np. `/recenzje/dune-frank-herbert`). W v2 może to być Notion page ID lub własny slug zapisany jako property — do decyzji.
- **Walidacja i sanityzacja linków zewnętrznych**: tylko `http:`/`https:` przez `new URL()`, odrzucenie pozostałych protokołów, zwrot znormalizowanego href albo `null`.
- **Reguła wyboru "preferowanego linku do księgarni"** zależnie od języka książki:
  1. Jeśli język zawiera "ang"/"eng" → preferuj link angielski.
  2. Jeśli język zawiera "pol" → preferuj link polski.
  3. Fallback: link polski, potem angielski, potem `null` jeśli żadnego nie ma.
- **Ocena (rating)**: zaokrąglenie do najbliższej 0.25 (`Math.round(value * 4) / 4`), clamp do zakresu 0–5, wartość 0 traktowana jako "brak oceny" (nie wyświetlamy gwiazdek).
- **Progres czytania**: parse jako integer, clamp 0–100, brak/niepoprawna wartość → `null`. Wyświetlany tylko dla książek w sekcji "w trakcie".
- **Ikony formatu** (dopasowanie po znormalizowanym tekście): `audio*` → 🎧, `ebook`/`e-book` → 📱, `papier`/`druk`/`paper` → 📕.
- **Flagi/etykiety języka**: `pol*` → 🇵🇱, `ang*`/`eng*` → 🇬🇧, `hisz*`/`span*` → 🇪🇸, `niem*`/`ger*` → 🇩🇪, `franc*`/`fr*` → 🇫🇷.

## 5. Obsługa błędów i fallbacków

Zachować analogiczne stany do v1:
- Błąd pobierania danych z Notion API (sieć/HTTP) → komunikat błędu w UI.
- Pusta baza Notion (brak książek) → komunikat "brak danych".
- Książka bez okładki → karta bez obrazka (nie placeholder z gradientem koniecznie, do decyzji wizualnej).
- Książka bez oceny/linku/progresu → po prostu nie renderuj danego elementu (nie pokazuj "0" czy myślnika).
- Brak treści recenzji → nie pokazuj linku "przeczytaj recenzję".

## 6. Internacjonalizacja (i18n)

Zachować jako **wymaganie funkcjonalne** (kod do zaprojektowania na nowo, nie kopiować `translations.js` 1:1):
- Wsparcie PL/EN z przełącznikiem w UI.
- Zapamiętywanie wyboru języka po stronie klienta (np. localStorage) między wizytami.
- Wykrywanie domyślnego języka przeglądarki jako fallback, gdy użytkownik nie ustawił preferencji.
- Treści dynamiczne (np. etykiety ocen, progresu) sparametryzowane, nie hardkodowane per-element.

## 7. Co NIE jest częścią tej specyfikacji (zaprojektujemy razem w tej rozmowie)

- Wybór stacku frontendowego (framework, SSG/SSR/CSR, język).
- Wygląd, CSS, layout, responsywność, motywy kolorystyczne.
- Hosting i deployment (GitHub Pages było rozwiązaniem dla v1 — może się zmienić).
- Sposób autoryzacji do Notion API (sekrety, zmienne środowiskowe, czy fetch odbywa się build-time czy w runtime przez backend/serverless function — Notion API wymaga tokena, nie może być wołane bezpośrednio z klienta jak publiczny Sheet CSV).
- Struktura strony "O mnie" i wariantu "insta" — te są proste i statyczne, nie wymagają specyfikacji logiki, ale powinny zostać odtworzone funkcjonalnie.

## 8. Pytania, które chcę przemyślić na starcie tej rozmowy

Zanim zaczniemy kodować, zapytaj mnie o:
1. Struktura bazy Notion: jedna baza "Books" gdzie treść strony = recenzja, czy osobna relacja/baza dla recenzji?
2. Czy recenzje nadal piszę jako pliki Markdown gdzieś lokalnie, czy w pełni edytuję bezpośrednio w Notion (sugeruję: w pełni w Notion, to upraszcza i usuwa potrzebę fuzzy matchingu)?
3. Sposób pobierania danych: build-time fetch (np. generowanie statycznej strony przy każdym build/deployu) vs runtime API call z backendu/funkcji serverless (Notion token nie może trafić do klienta)?
4. Gdzie hostować nowy frontend (GitHub Pages nie wystarczy, jeśli potrzebny będzie backend do trzymania tokena Notion)?
5. Czy zachowujemy URL-e recenzji w obecnym formacie (`/recenzje/{slug}`) dla SEO, czy mogą się zmienić?

---

**Podsumowanie**: to nie jest projekt wymagający migracji kodu — to przepisanie logiki opisanej wyżej w nowej architekturze. Najważniejsze, żeby zachować: 3 kubełki statusu, reguły wyboru linku/oceny/progresu/ikon, walidację linków, wykrywanie YouTube w recenzji, dwujęzyczność z zapamiętywaniem wyboru, oraz fakt że recenzja pokazuje się tylko dla "finished" + niepusta treść.
