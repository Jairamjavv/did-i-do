/**
 * Free Public Metadata API Service for Books, Movies, Series, and Games.
 * Pure browser-compatible CORS fetch with no custom headers to avoid preflight issues.
 */

export interface MetadataSuggestion {
  id: string;
  title: string;
  creatorOrMeta?: string;
  totalUnits?: number;
  unitName?: string;
  rating?: number;
  notes?: string;
  year?: string | number;
  source: 'Open Library' | 'TVMaze' | 'Wikipedia' | 'Google Books' | 'CheapShark';
}

/**
 * Clean HTML tags and entities from string
 */
function cleanHtml(raw: string = ''): string {
  return raw
    .replace(/<[^>]*>?/gm, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Safe fetch with abort timeout (default 4 seconds) and standard CORS GET (NO custom headers)
 */
async function safeFetchJson(url: string, timeoutMs: number = 4000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Fetch metadata suggestions based on query and category
 */
export async function searchMetadata(
  query: string,
  category: string
): Promise<MetadataSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const suggestions: MetadataSuggestion[] = [];

  try {
    // ----------------------------------------------------
    // 1. BOOKS: Open Library (Primary) + Google Books (Fallback)
    // ----------------------------------------------------
    if (category === 'books') {
      const olData = await safeFetchJson(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=6`
      );

      if (olData && olData.docs && Array.isArray(olData.docs) && olData.docs.length > 0) {
        for (const doc of olData.docs.slice(0, 6)) {
          const author = doc.author_name ? doc.author_name[0] : (doc.publisher ? doc.publisher[0] : '');
          const pages = doc.number_of_pages_median || doc.number_of_pages || undefined;
          const noteSnippet = doc.first_sentence ? doc.first_sentence[0] : (doc.subject ? doc.subject.slice(0, 3).join(', ') : '');

          suggestions.push({
            id: `ol-${doc.key || doc.title}-${Math.random().toString(36).substr(2, 4)}`,
            title: doc.title,
            creatorOrMeta: author,
            totalUnits: pages,
            unitName: 'pages',
            year: doc.first_publish_year,
            notes: noteSnippet ? cleanHtml(noteSnippet) : '',
            source: 'Open Library',
          });
        }
      } else {
        // Fallback: Google Books
        const gbData = await safeFetchJson(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmed)}&maxResults=6`
        );
        if (gbData && gbData.items && Array.isArray(gbData.items)) {
          for (const item of gbData.items) {
            const v = item.volumeInfo || {};
            suggestions.push({
              id: `gb-${item.id || v.title}-${Math.random().toString(36).substr(2, 4)}`,
              title: v.title || trimmed,
              creatorOrMeta: v.authors ? v.authors.join(', ') : (v.publisher || ''),
              totalUnits: v.pageCount || undefined,
              unitName: 'pages',
              year: v.publishedDate ? v.publishedDate.split('-')[0] : undefined,
              notes: v.description ? cleanHtml(v.description.slice(0, 200) + '...') : '',
              source: 'Google Books',
            });
          }
        }
      }
    }

    // ----------------------------------------------------
    // 2. SERIES / TV SHOWS: TVMaze API
    // ----------------------------------------------------
    else if (category === 'series' || category === 'shows') {
      const tvData = await safeFetchJson(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`
      );

      if (tvData && Array.isArray(tvData)) {
        for (const item of tvData.slice(0, 6)) {
          const s = item.show;
          const network = s.network?.name || s.webChannel?.name || (s.genres ? s.genres.join(', ') : '');
          const ratingScaled = s.rating?.average ? Math.min(5, Math.max(1, Math.round((s.rating.average / 10) * 5))) : undefined;

          suggestions.push({
            id: `tvm-${s.id || s.name}-${Math.random().toString(36).substr(2, 4)}`,
            title: s.name,
            creatorOrMeta: network,
            unitName: 'episodes',
            year: s.premiered ? s.premiered.split('-')[0] : undefined,
            rating: ratingScaled,
            notes: s.summary ? cleanHtml(s.summary) : '',
            source: 'TVMaze',
          });
        }
      }
    }

    // ----------------------------------------------------
    // 3. MOVIES: Wikipedia OpenSearch (CORS origin=*) + TVMaze Fallback
    // ----------------------------------------------------
    else if (category === 'movies') {
      const wikiData = await safeFetchJson(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(trimmed + ' film')}&limit=6&namespace=0&format=json&origin=*`
      );

      if (wikiData && Array.isArray(wikiData) && wikiData[1] && wikiData[1].length > 0) {
        const titles = wikiData[1];
        const descriptions = wikiData[2] || [];

        for (let i = 0; i < titles.length; i++) {
          const rawTitle = titles[i];
          const cleanTitle = rawTitle.replace(/ \((film|movie|20\d\d film|19\d\d film)\)$/i, '');
          const desc = descriptions[i] || '';

          suggestions.push({
            id: `wiki-mov-${i}-${Math.random().toString(36).substr(2, 4)}`,
            title: cleanTitle,
            creatorOrMeta: desc ? cleanHtml(desc) : 'Film',
            unitName: 'mins',
            notes: desc ? cleanHtml(desc) : '',
            source: 'Wikipedia',
          });
        }
      } else {
        // Fallback search TVMaze for movie/specials
        const tvFallback = await safeFetchJson(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`
        );
        if (tvFallback && Array.isArray(tvFallback)) {
          for (const item of tvFallback.slice(0, 4)) {
            const s = item.show;
            suggestions.push({
              id: `tvm-mov-${s.id}-${Math.random().toString(36).substr(2, 4)}`,
              title: s.name,
              creatorOrMeta: s.network?.name || s.webChannel?.name || 'Film / Special',
              unitName: 'mins',
              year: s.premiered ? s.premiered.split('-')[0] : undefined,
              notes: s.summary ? cleanHtml(s.summary) : '',
              source: 'TVMaze',
            });
          }
        }
      }
    }

    // ----------------------------------------------------
    // 4. GAMES: Wikipedia OpenSearch (CORS origin=*) + CheapShark Fallback
    // ----------------------------------------------------
    else if (category === 'games') {
      const wikiData = await safeFetchJson(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(trimmed + ' video game')}&limit=6&namespace=0&format=json&origin=*`
      );

      if (wikiData && Array.isArray(wikiData) && wikiData[1] && wikiData[1].length > 0) {
        const titles = wikiData[1];
        const descriptions = wikiData[2] || [];

        for (let i = 0; i < titles.length; i++) {
          const rawTitle = titles[i];
          const cleanTitle = rawTitle.replace(/ \((video game|\d{4} video game|game)\)$/i, '');
          const desc = descriptions[i] || '';

          suggestions.push({
            id: `wiki-game-${i}-${Math.random().toString(36).substr(2, 4)}`,
            title: cleanTitle,
            creatorOrMeta: desc ? cleanHtml(desc) : 'Video Game',
            unitName: 'hours',
            notes: desc ? cleanHtml(desc) : '',
            source: 'Wikipedia',
          });
        }
      } else {
        // Fallback: CheapShark Games
        const csData = await safeFetchJson(
          `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(trimmed)}&limit=6`
        );
        if (csData && Array.isArray(csData)) {
          for (const g of csData.slice(0, 5)) {
            suggestions.push({
              id: `cs-${g.gameID || g.external}-${Math.random().toString(36).substr(2, 4)}`,
              title: g.external || trimmed,
              creatorOrMeta: 'Video Game',
              unitName: 'hours',
              source: 'CheapShark',
            });
          }
        }
      }
    }

    // ----------------------------------------------------
    // 5. UNIVERSAL / CUSTOM CATEGORIES: Wikipedia OpenSearch
    // ----------------------------------------------------
    else {
      const wikiData = await safeFetchJson(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(trimmed)}&limit=6&namespace=0&format=json&origin=*`
      );

      if (wikiData && Array.isArray(wikiData) && wikiData[1]) {
        const titles = wikiData[1];
        const descriptions = wikiData[2] || [];

        for (let i = 0; i < titles.length; i++) {
          suggestions.push({
            id: `wiki-gen-${i}-${Math.random().toString(36).substr(2, 4)}`,
            title: titles[i],
            creatorOrMeta: descriptions[i] ? cleanHtml(descriptions[i]) : '',
            unitName: 'units',
            notes: descriptions[i] ? cleanHtml(descriptions[i]) : '',
            source: 'Wikipedia',
          });
        }
      }
    }
  } catch (err) {
    console.warn('Metadata search notice:', err);
  }

  return suggestions;
}
