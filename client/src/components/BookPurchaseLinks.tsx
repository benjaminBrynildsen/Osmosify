import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { SiAmazon } from "react-icons/si";
import type { Book } from "@shared/schema";

interface BookPurchaseLinksProps {
  book: Book;
}

function generateAmazonUrl(book: Book): string {
  if (book.amazonUrl) return book.amazonUrl;
  if (book.isbn) {
    return `https://www.amazon.com/s?k=${encodeURIComponent(book.isbn)}&i=stripbooks`;
  }
  const searchQuery = book.author 
    ? `${book.title} ${book.author}` 
    : book.title;
  return `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&i=stripbooks`;
}

function generateBookshopUrl(book: Book): string {
  if (book.bookshopUrl) return book.bookshopUrl;
  if (book.isbn) {
    return `https://bookshop.org/search?keywords=${encodeURIComponent(book.isbn)}`;
  }
  const searchQuery = book.author 
    ? `${book.title} ${book.author}` 
    : book.title;
  return `https://bookshop.org/search?keywords=${encodeURIComponent(searchQuery)}`;
}

export function BookPurchaseLinks({ book }: BookPurchaseLinksProps) {
  const amazonUrl = generateAmazonUrl(book);
  const bookshopUrl = generateBookshopUrl(book);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Get this book:</p>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.open(amazonUrl, "_blank", "noopener,noreferrer")}
          data-testid="button-amazon-link"
        >
          <SiAmazon className="h-4 w-4" />
          Amazon
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.open(bookshopUrl, "_blank", "noopener,noreferrer")}
          data-testid="button-bookshop-link"
        >
          <ExternalLink className="h-4 w-4" />
          Bookshop.org
        </Button>
      </div>
    </div>
  );
}
