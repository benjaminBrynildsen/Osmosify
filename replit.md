# Parent Reading Tracker + Mastery Flashcards

## Overview

A mobile-first educational web application designed for parents to track their children's reading progress. The app enables parents to upload photos of book pages, extract text via OCR, build vocabulary libraries per child, and run flashcard-based mastery sessions. Primary target device is Kindle Fire tablets.

**Core Features:**
- Multi-child profile management with individual settings
- Reading session uploads with OCR text extraction and cleanup
- Per-child word library tracking (new → learning → unlocked progression)
- Flashcard mastery sessions and history review tests
- Stop-word filtering and grade-level word filtering options
- **Book Library** with Open Library integration, custom cover uploads, and readiness scores
- **Purchase Links** for Amazon and Bookshop.org generated from book metadata
- **Community Contributions** allowing users to submit books for moderation approval

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack React Query for server state caching and synchronization
- **Styling:** Tailwind CSS with shadcn/ui component library (New York style, Radix UI primitives)
- **Design System:** Material Design 3 principles - mobile-first, touch-optimized with 48px minimum touch targets
- **Build Tool:** Vite with React plugin

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript (ESM modules)
- **API Pattern:** RESTful JSON API under `/api/*` prefix
- **Database ORM:** Drizzle ORM with PostgreSQL dialect
- **File Uploads:** Uppy with AWS S3 presigned URL flow via Google Cloud Storage integration

### Data Model
Three primary entities with relationships:
1. **Children** - Profile with settings (stop words, grade filter, mastery threshold, deck size)
2. **Reading Sessions** - Linked to child, stores book title, extracted/cleaned text, word counts
3. **Words** - Per-child vocabulary with status tracking (new/learning/mastered), occurrence counts, mastery progress

### Text Processing Pipeline
Server-side text processor (`server/textProcessor.ts`) handles:
- Stop word filtering (configurable per child)
- Word normalization and deduplication
- Frequency counting across sessions
- Grade-level vocabulary filtering

### Key Design Decisions

**Client-Server Separation:** Frontend in `/client/src`, backend in `/server`, shared types in `/shared/schema.ts`. Path aliases configured: `@/` for client, `@shared/` for shared code.

**Database Schema Location:** Single source of truth in `shared/schema.ts` using Drizzle with Zod integration for validation. Migrations output to `/migrations`.

**Component Architecture:** Reusable UI components in `/client/src/components`, page components in `/client/src/pages`. Custom components wrap shadcn/ui primitives with app-specific styling.

**API Request Pattern:** Centralized `apiRequest` helper in `lib/queryClient.ts` handles fetch with error throwing. React Query configured with infinite stale time for manual invalidation.

## External Dependencies

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **Drizzle Kit** for schema migrations (`npm run db:push`)

### Cloud Storage
- **Google Cloud Storage** for file uploads (page images)
- Replit sidecar integration at `http://127.0.0.1:1106` for credentials
- Presigned URL upload flow for direct browser-to-storage uploads

### UI Dependencies
- **Radix UI** - Accessible primitive components (dialogs, dropdowns, tabs, etc.)
- **Lucide React** - Icon library
- **date-fns** - Date formatting
- **Uppy** - File upload management with dashboard modal

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `PUBLIC_OBJECT_SEARCH_PATHS` - (Optional) Public storage paths configuration