-- TradeWorker Directory Database Schema
-- Run this SQL in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  trade TEXT NOT NULL,
  bio TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
  years_experience INTEGER DEFAULT 0 CHECK (years_experience >= 0),
  profile_image TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_from DECIMAL(10,2) CHECK (price_from >= 0),
  price_to DECIMAL(10,2) CHECK (price_to >= price_from),
  price_unit TEXT DEFAULT 'per job',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'email', 'phone', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workers_trade ON workers(trade);
CREATE INDEX IF NOT EXISTS idx_workers_verified ON workers(verified);
CREATE INDEX IF NOT EXISTS idx_workers_rating ON workers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_services_worker_id ON services(worker_id);
CREATE INDEX IF NOT EXISTS idx_leads_worker_id ON leads(worker_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access

-- Workers: Anyone can read verified workers
CREATE POLICY "Public workers are viewable by everyone"
  ON workers FOR SELECT
  USING (verified = true);

-- Services: Anyone can read services of verified workers
CREATE POLICY "Services are viewable by everyone"
  ON services FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE verified = true
    )
  );

-- Leads: Anyone can insert leads (for tracking)
CREATE POLICY "Anyone can insert leads"
  ON leads FOR INSERT
  WITH CHECK (true);

-- Leads: Anyone can count leads (for display)
CREATE POLICY "Anyone can view lead counts"
  ON leads FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO workers (name, trade, bio, phone, email, location, rating, reviews_count, years_experience, verified) VALUES
  ('John Smith', 'tiler', 'Professional tiler with 15 years of experience specializing in residential and commercial projects. Expert in bathroom renovations, kitchen backsplashes, and large-scale commercial tiling.', '+61412345678', 'john.smith@example.com', 'Sydney, NSW', 4.8, 127, 15, true),
  ('Sarah Johnson', 'plumber', 'Licensed plumber with a focus on customer satisfaction. Specializing in emergency repairs, new installations, and renovation work. Available 24/7 for urgent plumbing issues.', '+61423456789', 'sarah.johnson@example.com', 'Melbourne, VIC', 4.9, 89, 10, true),
  ('Mike Davis', 'electrician', 'Certified electrician with expertise in residential and commercial electrical work. From simple repairs to complete rewiring, solar installations, and smart home setups.', '+61434567890', 'mike.davis@example.com', 'Brisbane, QLD', 4.7, 156, 12, true),
  ('Emma Wilson', 'tiler', 'Detail-oriented tiler specializing in high-end residential projects. Known for precision work and creative tile patterns. Portfolio includes luxury homes and boutique hotels.', '+61445678901', 'emma.wilson@example.com', 'Perth, WA', 4.9, 64, 8, true),
  ('David Brown', 'plumber', 'Master plumber with commercial and residential experience. Expert in complex pipe systems, gas fitting, and sustainable plumbing solutions. Fully insured and licensed.', '+61456789012', 'david.brown@example.com', 'Adelaide, SA', 4.6, 203, 18, true),
  ('Lisa Chen', 'electrician', 'Specialized in energy-efficient electrical solutions and smart home technology. Licensed Level 2 electrician qualified for complex installations and meter work.', '+61467890123', 'lisa.chen@example.com', 'Sydney, NSW', 4.8, 91, 7, true);

-- Sample services
INSERT INTO services (worker_id, title, description, price_from, price_to, price_unit) VALUES
  -- John Smith (Tiler) services
  ((SELECT id FROM workers WHERE email = 'john.smith@example.com'), 'Bathroom Tiling', 'Complete bathroom tiling including walls, floors, and shower areas. High-quality finish guaranteed.', 2000, 5000, 'per bathroom'),
  ((SELECT id FROM workers WHERE email = 'john.smith@example.com'), 'Kitchen Backsplash', 'Professional kitchen backsplash installation with your choice of tiles. Expert pattern matching.', 800, 1500, 'per job'),
  ((SELECT id FROM workers WHERE email = 'john.smith@example.com'), 'Floor Tiling', 'Residential and commercial floor tiling. All tile types including ceramic, porcelain, and natural stone.', 50, 120, 'per m²'),
  
  -- Sarah Johnson (Plumber) services
  ((SELECT id FROM workers WHERE email = 'sarah.johnson@example.com'), 'Emergency Repairs', '24/7 emergency plumbing repairs. Burst pipes, leaks, blocked drains, and more.', 150, 500, 'per callout'),
  ((SELECT id FROM workers WHERE email = 'sarah.johnson@example.com'), 'Bathroom Renovation Plumbing', 'Complete plumbing for bathroom renovations. Installation of new fixtures, pipes, and drainage.', 1500, 4000, 'per bathroom'),
  ((SELECT id FROM workers WHERE email = 'sarah.johnson@example.com'), 'Hot Water System Installation', 'Professional installation of gas and electric hot water systems. All brands serviced.', 800, 2500, 'per installation'),
  
  -- Mike Davis (Electrician) services
  ((SELECT id FROM workers WHERE email = 'mike.davis@example.com'), 'Electrical Repairs', 'General electrical repairs including switches, outlets, lighting, and circuit issues.', 100, 400, 'per job'),
  ((SELECT id FROM workers WHERE email = 'mike.davis@example.com'), 'Complete Rewiring', 'Full house rewiring for older homes. Bringing electrical systems up to current safety standards.', 5000, 15000, 'per house'),
  ((SELECT id FROM workers WHERE email = 'mike.davis@example.com'), 'Solar Panel Installation', 'Professional solar panel and inverter installation. Grid-connected systems with battery options.', 6000, 12000, 'per system'),
  
  -- Emma Wilson (Tiler) services
  ((SELECT id FROM workers WHERE email = 'emma.wilson@example.com'), 'Luxury Bathroom Tiling', 'High-end bathroom tiling with premium materials. Specialist in marble, travertine, and custom patterns.', 3500, 8000, 'per bathroom'),
  ((SELECT id FROM workers WHERE email = 'emma.wilson@example.com'), 'Feature Wall Tiling', 'Stunning feature walls with decorative tiles. Perfect for living rooms, bedrooms, and entrances.', 1200, 3000, 'per wall'),
  
  -- David Brown (Plumber) services
  ((SELECT id FROM workers WHERE email = 'david.brown@example.com'), 'Gas Fitting', 'Licensed gas fitting for cooktops, ovens, heaters, and BBQs. Safety certified and compliant.', 200, 800, 'per fitting'),
  ((SELECT id FROM workers WHERE email = 'david.brown@example.com'), 'Commercial Plumbing', 'Complete plumbing solutions for commercial properties. New builds and renovations.', 5000, 20000, 'per project'),
  
  -- Lisa Chen (Electrician) services
  ((SELECT id FROM workers WHERE email = 'lisa.chen@example.com'), 'Smart Home Setup', 'Complete smart home electrical setup including lighting, thermostats, and automation systems.', 2000, 6000, 'per house'),
  ((SELECT id FROM workers WHERE email = 'lisa.chen@example.com'), 'LED Lighting Installation', 'Energy-efficient LED lighting installation for homes and businesses. Modern and sustainable solutions.', 500, 2000, 'per property');

-- Sample leads for testing
INSERT INTO leads (worker_id, source) 
SELECT id, 'whatsapp' FROM workers WHERE verified = true
UNION ALL
SELECT id, 'email' FROM workers WHERE verified = true LIMIT 3;

-- View to get workers with lead counts
CREATE OR REPLACE VIEW workers_with_stats AS
SELECT 
  w.*,
  COUNT(l.id) as total_leads
FROM workers w
LEFT JOIN leads l ON w.id = l.worker_id
GROUP BY w.id;

-- Grant permissions for the view
GRANT SELECT ON workers_with_stats TO anon, authenticated;

COMMIT;
