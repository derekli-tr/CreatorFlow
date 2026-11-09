# CreatorFlow

CreatorFlow is a simple deal tracker for social media creators. Every brand partnership is a **deal** with a brand, an offer amount and a platform, and it moves through a four-stage pipeline:

**Pitching → In Production → Awaiting Payment → Paid**

## Features

- **Dashboard**: open pipeline, awaiting payment, earned this month and total earned, deals by stage, deals waiting on payment and recently paid deals.
- **Pipeline**: a kanban board of deals by stage with column totals. Open a deal to edit its brand, amount or platform, or delete it. New deals start in Pitching. Moving deals between stages (drag and drop) is intentionally not implemented yet.
- **Analytics**: total earned, paid deals, average deal and close rate, a monthly earnings chart (3/6/12 months), earnings by platform and top brands.

## Tech Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- React Router, Zustand
- Supabase (Auth + Postgres)
- @dnd-kit/core (installed for the upcoming drag-and-drop feature)
- Remix Icons

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create the database.** In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the `deals` table with row-level security (each user only sees their own deals). Re-running it recreates the table and deletes its data.

   Optional: to load sample deals, sign up in the app, put your email in [`supabase/seed.sql`](supabase/seed.sql) and run it the same way.

3. **Set environment variables.** Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   The app runs at `http://localhost:5173`.

### Production build

```bash
npm run build
```

## License

MIT
