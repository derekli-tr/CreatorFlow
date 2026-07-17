# FreelanceFlow

FreelanceFlow is a comprehensive management dashboard designed specifically for freelancers to handle their daily operations seamlessly. From client management to project tracking, invoicing, and proposal generation, FreelanceFlow brings all your business needs into a single, intuitive platform.

## Features

- **Dashboard & Analytics**: Get a bird's-eye view of your business performance with insightful metrics and proposal funnels.
- **Client Management**: Maintain a detailed directory of your clients, track communication logs, and monitor lifetime revenue.
- **Project Tracking**: Manage your projects efficiently with built-in Kanban boards (powered by `@dnd-kit`).
- **Smart Calendar**: Schedule events, view your timeline, and use the built-in AI Assistant to quickly parse natural language requests into calendar events.
- **Proposals**: Create, edit, and manage professional proposals. Share them via portals or export them directly to PDF.
- **Invoicing**: Generate invoices, track payment statuses, and keep your cash flow organized.
- **Client Portal**: Dedicated portal pages for clients to view proposals, projects, and invoices.

## Tech Stack

FreelanceFlow is built with modern web technologies:

- **Frontend Framework**: React 19 + Vite
- **Styling**: TailwindCSS for rapid UI development
- **Routing**: React Router DOM
- **State Management**: Zustand
- **Form Handling & Validation**: React Hook Form + Zod
- **Backend & Real-time**: Supabase (Database, Auth, and Real-time Subscriptions)
- **Drag & Drop**: @dnd-kit
- **PDF Generation**: jsPDF + html2canvas
- **Icons**: Remix Icons (via web fonts/CSS)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lymonDa/FreelanceFlow.git
   cd FreelanceFlow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build, run:
```bash
npm run build
```
This will generate optimized static files in the `dist` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
