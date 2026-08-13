/**
 * Free Public Metadata API Service for Books, Movies, Series, and Games.
 * No API keys required. Enables instant live auto-fill suggestions.
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
  source: 'Open Library' | 'TVMaze' | 'Wikipedia' | 'Google Books';
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
 * Fetch metadata suggestions based on query and category
 */
export async function searchMetadata(
  query: string,
  category: string
): Promise<MetadataSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const headers = { 'User-Agent': 'DidIDoActivityTracker/1.0' };
  const suggestions: MetadataSuggestion[] = [];

  try {
    // 1. BOOKS: Open Library Search API
    if (category === 'books') {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=6`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.docs && Array.isArray(json.docs)) {
          for (const doc of json.docs.slice(0, 6)) {
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
        }
      }
    }

    // 2. SERIES / TV SHOWS: TVMaze API
    else if (category === 'series' || category === 'shows') {
      const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          for (const item of json.slice(0, 6)) {
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
    }

    // 3. MOVIES / FILMS: Wikipedia REST API & TVMaze Fallback
    else if (category === 'movies') {
      const res = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(trimmed + ' film')}&limit=6`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.pages && Array.isArray(json.pages)) {
          for (const p of json.pages.slice(0, 6)) {
            const cleanTitle = p.title.replace(/ \((film|movie|20\d\d film|19\d\d film)\)$/i, '');
            const cleanExcerpt = cleanHtml(p.excerpt || '');
            suggestions.push({
              id: `wiki-mov-${p.id || p.title}-${Math.random().toString(36).substr(2, 4)}`,
              title: cleanTitle,
              creatorOrMeta: p.description ? cleanHtml(p.description) : '',
              unitName: 'mins',
              notes: cleanExcerpt,
              source: 'Wikipedia',
            });
          }
        }
      }
    }

    // 4. GAMES: Wikipedia Search API + General Fallback
    else if (category === 'games') {
      const res = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(trimmed + ' video game')}&limit=6`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.pages && Array.isArray(json.pages)) {
          for (const p of json.pages.slice(0, 6)) {
            const cleanTitle = p.title.replace(/ \((video game|\d{4} video game|game)\)$/i, '');
            const cleanExcerpt = cleanHtml(p.excerpt || '');
            suggestions.push({
              id: `wiki-game-${p.id || p.title}-${Math.random().toString(36).substr(2, 4)}`,
              title: cleanTitle,
              creatorOrMeta: p.description ? cleanHtml(p.description) : '',
              unitName: 'hours',
              notes: cleanExcerpt,
              source: 'Wikipedia',
            });
          }
        }
      }
    }

    // 5. CUSTOM / GENERIC CATEGORIES: Universal Wikipedia Lookup
    else {
      const res = await fetch(
        `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(trimmed)}&limit=6`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.pages && Array.isArray(json.pages)) {
          for (const p of json.pages.slice(0, 6)) {
            suggestions.push({
              id: `wiki-gen-${p.id || p.title}-${Math.random().toString(36).substr(2, 4)}`,
              title: p.title,
              creatorOrMeta: p.description ? cleanHtml(p.description) : '',
              unitName: 'units',
              notes: cleanHtml(p.excerpt || ''),
              source: 'Wikipedia',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Metadata search notice:', err);
  }

  return suggestions;
}
