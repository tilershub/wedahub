# TradeWorker Directory

A modern, production-ready trade worker directory platform built with Astro, React, and Supabase. Find and connect with verified trade professionals including tilers, plumbers, and electricians.

## Features

- 🔍 **Browse by Trade** - Directory pages for different trades
- 👤 **Professional Profiles** - Detailed worker profiles with services and ratings
- 💬 **WhatsApp Integration** - Direct contact via WhatsApp with lead tracking
- 📊 **Lead Analytics** - Track how many people contact each professional
- 🔒 **Verified Professionals** - Badge system for verified workers
- 📱 **Responsive Design** - Mobile-first, fully responsive UI
- ⚡ **Fast Performance** - Built with Astro for optimal performance
- 🎨 **Modern UI** - Tailwind CSS for beautiful, consistent design

## Tech Stack

- **Framework**: [Astro](https://astro.build/) v4
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Lead Tracking**: Custom React component with real-time updates

## Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── WorkerCard.astro
│   │   ├── ServiceCard.astro
│   │   ├── WhatsAppButton.jsx
│   │   └── FilterBar.astro
│   ├── layouts/         # Layout components
│   │   └── Layout.astro
│   ├── pages/           # File-based routing
│   │   ├── index.astro
│   │   ├── tilers/
│   │   │   ├── index.astro
│   │   │   └── [id].astro
│   │   ├── plumbers/
│   │   │   ├── index.astro
│   │   │   └── [id].astro
│   │   └── electricians/
│   │       ├── index.astro
│   │       └── [id].astro
│   ├── lib/             # Utilities and helpers
│   │   └── supabase.js
│   └── styles/          # Global styles
│       └── global.css
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([create one here](https://supabase.com))

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd tradeworker-directory
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**

Create a new Supabase project and set up the following tables:

**Workers Table:**
```sql
CREATE TABLE workers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  trade TEXT NOT NULL,
  bio TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  years_experience INTEGER DEFAULT 0,
  profile_image TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Services Table:**
```sql
CREATE TABLE services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_from DECIMAL(10,2),
  price_to DECIMAL(10,2),
  price_unit TEXT DEFAULT 'per job',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Leads Table:**
```sql
CREATE TABLE leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. **Configure environment variables**

Copy the example environment file:
```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:
```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these in your Supabase project settings under API.

5. **Seed sample data** (optional)

Insert sample workers for testing:
```sql
INSERT INTO workers (name, trade, bio, phone, email, location, rating, reviews_count, years_experience, verified) VALUES
('John Smith', 'tiler', 'Professional tiler with 15 years of experience in residential and commercial projects.', '+1234567890', 'john@example.com', 'Sydney, NSW', 4.8, 127, 15, true),
('Sarah Johnson', 'plumber', 'Licensed plumber specializing in emergency repairs and new installations.', '+1234567891', 'sarah@example.com', 'Melbourne, VIC', 4.9, 89, 10, true),
('Mike Davis', 'electrician', 'Certified electrician for all your electrical needs, from repairs to complete rewiring.', '+1234567892', 'mike@example.com', 'Brisbane, QLD', 4.7, 156, 12, true);
```

Insert sample services:
```sql
INSERT INTO services (worker_id, title, description, price_from, price_to, price_unit) VALUES
((SELECT id FROM workers WHERE name = 'John Smith'), 'Bathroom Tiling', 'Complete bathroom tiling including walls and floors', 2000, 5000, 'per bathroom'),
((SELECT id FROM workers WHERE name = 'John Smith'), 'Kitchen Backsplash', 'Professional kitchen backsplash installation', 800, 1500, 'per job');
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:4321`

### Build for Production

Build the static site:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Features Breakdown

### Worker Directory
- Browse workers by trade category
- Filter by location, rating, and experience
- Real-time search functionality
- Sortable results

### Worker Profiles
- Detailed professional information
- Service listings with pricing
- Contact information
- WhatsApp integration for direct messaging

### Lead Tracking
- Automatic lead tracking when users click WhatsApp
- Lead count display on profiles
- Database persistence for analytics

### Mobile Responsive
- Mobile-first design approach
- Touch-friendly interface
- Optimized for all screen sizes

## Customization

### Adding New Trade Categories

1. Create a new directory in `src/pages/` (e.g., `carpenters/`)
2. Add `index.astro` for the listing page
3. Add `[id].astro` for individual profiles
4. Update the navigation in `src/layouts/Layout.astro`
5. Add the trade card in `src/pages/index.astro`

### Styling

The project uses Tailwind CSS. Customize colors and themes in `tailwind.config.mjs`:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors
      }
    }
  }
}
```

### Database Schema

Modify the Supabase schema as needed. Update type definitions in `src/lib/supabase.js` to match your changes.

## Deployment

### Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Set environment variables in Netlify dashboard
4. Deploy!

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy!

### Deploy to Cloudflare Pages

1. Push your code to GitHub
2. Create a new Cloudflare Pages project
3. Set build command: `npm run build`
4. Set build output directory: `dist`
5. Add environment variables
6. Deploy!

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Security Considerations

- Never commit `.env` files to version control
- Use Row Level Security (RLS) in Supabase for production
- Validate all user inputs
- Sanitize phone numbers before WhatsApp integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Astro, React, and Supabase
