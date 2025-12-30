interface OpenLibrarySearchResult {
  docs: Array<{
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    isbn?: string[];
    first_publish_year?: number;
  }>;
  numFound: number;
}

interface OpenLibraryBookData {
  title: string;
  authors?: Array<{ name: string }>;
  covers?: number[];
  isbn_10?: string[];
  isbn_13?: string[];
  description?: string | { value: string };
}

const COVER_BASE_URL = "https://covers.openlibrary.org/b";

export async function searchBooks(query: string, limit = 10): Promise<OpenLibrarySearchResult["docs"]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}&fields=key,title,author_name,cover_i,isbn,first_publish_year`
    );
    
    if (!response.ok) {
      console.error("Open Library search failed:", response.status);
      return [];
    }
    
    const data: OpenLibrarySearchResult = await response.json();
    return data.docs || [];
  } catch (error) {
    console.error("Open Library search error:", error);
    return [];
  }
}

export async function getBookByISBN(isbn: string): Promise<OpenLibraryBookData | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, "");
    const response = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Open Library ISBN lookup error:", error);
    return null;
  }
}

export function getCoverUrl(coverId: number | undefined, size: "S" | "M" | "L" = "M"): string | null {
  if (!coverId) return null;
  return `${COVER_BASE_URL}/id/${coverId}-${size}.jpg`;
}

export function getCoverUrlByISBN(isbn: string | undefined, size: "S" | "M" | "L" = "M"): string | null {
  if (!isbn) return null;
  const cleanIsbn = isbn.replace(/[-\s]/g, "");
  return `${COVER_BASE_URL}/isbn/${cleanIsbn}-${size}.jpg`;
}

export async function fetchCoverForBook(
  title: string,
  author?: string,
  isbn?: string
): Promise<{ coverUrl: string | null; isbn: string | null }> {
  if (isbn) {
    const coverUrl = getCoverUrlByISBN(isbn, "L");
    if (coverUrl) {
      return { coverUrl, isbn };
    }
  }
  
  const searchQuery = author ? `${title} ${author}` : title;
  const results = await searchBooks(searchQuery, 5);
  
  for (const result of results) {
    if (result.cover_i) {
      const coverUrl = getCoverUrl(result.cover_i, "L");
      const foundIsbn = result.isbn?.[0] || null;
      return { coverUrl, isbn: foundIsbn };
    }
  }
  
  if (results.length > 0 && results[0].isbn?.[0]) {
    const coverUrl = getCoverUrlByISBN(results[0].isbn[0], "L");
    return { coverUrl, isbn: results[0].isbn[0] };
  }
  
  return { coverUrl: null, isbn: null };
}

export interface BookSearchResult {
  title: string;
  author: string | null;
  coverUrl: string | null;
  isbn: string | null;
  year: number | null;
}

export async function searchBooksForDisplay(query: string, limit = 10): Promise<BookSearchResult[]> {
  const results = await searchBooks(query, limit);
  
  return results.map(doc => ({
    title: doc.title,
    author: doc.author_name?.[0] || null,
    coverUrl: doc.cover_i ? getCoverUrl(doc.cover_i, "M") : 
              doc.isbn?.[0] ? getCoverUrlByISBN(doc.isbn[0], "M") : null,
    isbn: doc.isbn?.[0] || null,
    year: doc.first_publish_year || null,
  }));
}
