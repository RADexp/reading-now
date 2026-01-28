# reading-now

## Recenzje książek (statyczne HTML)

### Struktura
- `scripts/generate-reviews.mjs` — generator stron recenzji z danych Google Sheet.
- `recenzje/` — katalog docelowy na wygenerowane pliki `*.html`.
- `templates/review-template.html` — przykładowy template strony recenzji (HTML).

### Jak uruchomić generator (wersja dla osób nietechnicznych)

1. Otwórz Terminal.
   - macOS: aplikacja „Terminal”.
   - Windows: „PowerShell” lub „Wiersz polecenia”.
2. Przejdź do folderu z projektem (tam, gdzie jest ten plik README).
   Przykład:
   ```bash
   cd /workspace/reading-now
   ```
3. Uruchom generator:
   ```bash
   node scripts/generate-reviews.mjs
   ```
4. Po chwili zobaczysz informację, ile stron zostało wygenerowanych.
   Gotowe pliki znajdziesz w folderze `recenzje/`.

### Nowy tryb: recenzje z plików `.md` (folder `Wsad/`)

Jeśli chcesz dodać recenzję jako prosty plik tekstowy:

1. Utwórz plik `.md` w folderze `Wsad/`, np. `Wsad/moja-recenzja.md`.
2. Wklej treść w takim formacie:
   ```text
   Title: Tytuł książki
   Author: Imię i nazwisko
   Treść recenzji...
   ```
3. Uzupełnij dane tej książki w Google Sheet (okładka, ocena, linki itp.).
4. Uruchom generator:
   ```bash
   node scripts/generate-reviews.mjs
   ```
5. Wygenerowany plik znajdziesz w `recenzje/<slug>.html`.

Jeśli dopasowanie tytułu i autora do arkusza będzie niejednoznaczne,
generator wypisze komunikat i pominie taką recenzję.

Opcjonalnie możesz podać inny adres CSV z arkusza:

```bash
SHEET_CSV_URL="https://docs.google.com/spreadsheets/.../output=csv" node scripts/generate-reviews.mjs
```

### Minimalny zestaw kolumn wymaganych do generowania recenzji
- `Title` (kolumna C)
- `Author` (kolumna D)
- `Review` (kolumna N)

Dla pełnego mini-boxu na stronie recenzji i lepszego SEO zalecane są dodatkowo:
- `Genre` (kolumna E)
- `Status` (kolumna F)
- `Format` (kolumna G)
- `Language` (kolumna H)
- `Rating` (kolumna I)
- `CoverUrl` (kolumna J)
- `PolishLink` (kolumna K)
- `EnglishLink` (kolumna L)

### Jak dodać nową recenzję (krok po kroku)
1. Otwórz arkusz Google Sheet i wprowadź dane książki.
2. Uzupełnij pole `Review` (kolumna N) tekstem recenzji.
   - Markdown jest obsługiwany (pogrubienie, kursywa, linki, listy).
   - Jeśli w treści pojawi się pojedynczy link YouTube, generator automatycznie zamieni go
     na responsywny embed.
3. Upewnij się, że kolumny `Title` i `Author` są wypełnione — na ich podstawie powstaje slug.
4. Uruchom generator:
   ```bash
   node scripts/generate-reviews.mjs
   ```
5. Wygenerowany plik znajdziesz w `recenzje/<slug>.html`.

### Slug
Slug jest generowany automatycznie z `Title + Author`, np.:
```
Dune Frank Herbert -> dune-frank-herbert
```
# reading-now -> radekreads.pl 
