# CreatorFlow

CreatorFlow is an app for social media creators. This is the baseline: sign up, sign in and an empty dashboard. Features are built on top of it.

## Features

- **Auth**: sign up, sign in and sign out (Supabase Auth).
- **Dashboard**: an empty welcome page.

## Tech Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- React Router, Zustand
- Supabase (Auth + Postgres)
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

2. **Reset the database.** In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. The baseline has no app tables; this removes tables left by earlier versions of the app and deletes their data. Login accounts are not touched.

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
