-- Create species table to store all scraped species data
create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  inaturalist_id text unique,
  scientific_name text not null unique,
  common_names text[] default array[]::text[],
  description text,
  taxonomy jsonb,
  habitat text,
  distribution text,
  edibility text,
  toxicity text,
  conservation_status text,
  images jsonb default '[]'::jsonb,
  sources jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create research papers table
create table if not exists public.research_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text[] not null,
  abstract text,
  year integer,
  journal text,
  doi text unique,
  pdf_url text,
  external_url text,
  content text,
  keywords text[] default array[]::text[],
  source text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create junction table for species-paper relationships
create table if not exists public.species_papers (
  id uuid primary key default gen_random_uuid(),
  species_id uuid references public.species(id) on delete cascade,
  paper_id uuid references public.research_papers(id) on delete cascade,
  relevance_score float default 1.0,
  created_at timestamp with time zone default now(),
  unique(species_id, paper_id)
);

-- Create images table for better organization
create table if not exists public.species_images (
  id uuid primary key default gen_random_uuid(),
  species_id uuid references public.species(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  attribution text,
  license text,
  source text,
  is_primary boolean default false,
  created_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index if not exists idx_species_scientific_name on public.species(scientific_name);
create index if not exists idx_species_inaturalist_id on public.species(inaturalist_id);
create index if not exists idx_papers_doi on public.research_papers(doi);
create index if not exists idx_papers_year on public.research_papers(year);
create index if not exists idx_species_papers_species on public.species_papers(species_id);
create index if not exists idx_species_papers_paper on public.species_papers(paper_id);
create index if not exists idx_species_images_species on public.species_images(species_id);

-- Enable Row Level Security
alter table public.species enable row level security;
alter table public.research_papers enable row level security;
alter table public.species_papers enable row level security;
alter table public.species_images enable row level security;

-- Create policies for public read access (no auth required for viewing)
create policy "Allow public read access to species"
  on public.species for select
  using (true);

create policy "Allow public read access to papers"
  on public.research_papers for select
  using (true);

create policy "Allow public read access to species_papers"
  on public.species_papers for select
  using (true);

create policy "Allow public read access to species_images"
  on public.species_images for select
  using (true);

-- Create full-text search indexes
create index if not exists idx_species_search on public.species 
  using gin(to_tsvector('english', coalesce(scientific_name, '') || ' ' || coalesce(array_to_string(common_names, ' '), '') || ' ' || coalesce(description, '')));

create index if not exists idx_papers_search on public.research_papers 
  using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(array_to_string(authors, ' '), '')));
