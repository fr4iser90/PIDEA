-- This application is designed for a single administrative user/owner.
-- All content and configurations are managed by this single owner.
-- Public visitors do not have accounts and only view the presented content.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SITE OWNER (Single Admin User)
-- This table stores the credentials and basic info for the single site owner.
CREATE TABLE IF NOT EXISTS site_owner (
    id VARCHAR(255) PRIMARY KEY DEFAULT 'me' CHECK (id = 'me'), -- Enforces that the only ID is 'me'
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    source_username VARCHAR(255), -- Optional: For GitHub/GitLab integration if the owner links their account
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- THEMES
-- Themes are  and can be selected by the site owner for the portfolio.
CREATE TABLE IF NOT EXISTS themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    style_properties JSONB NOT NULL,
    custom_css TEXT,
    custom_js TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SECTIONS
-- Sections are predefined content blocks/types that the owner can use to build their page.
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL, -- e.g., 'hero', 'about', 'projects_list', 'contact_form'
    title VARCHAR(128) NOT NULL,    -- Default title for this section type
    type VARCHAR(32) NOT NULL DEFAULT 'text', -- Underlying type, e.g., 'text', 'gallery', 'custom_html'
    content JSONB,                  -- Default or template content for this section type
    display_order INTEGER NOT NULL DEFAULT 0, -- Default order if used in a generic list of section types
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    theme_id INTEGER REFERENCES themes(id) ON DELETE SET NULL, -- Optional: a default theme association
    section_metadata JSONB,         -- Additional metadata about the section type
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROJECTS
-- These are the projects showcased by the site owner. They inherently belong to the owner.
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'WIP' CHECK (status IN ('ACTIVE', 'WIP', 'ARCHIVED', 'DEPRECATED')),
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'github', 'gitlab')),
    source_username VARCHAR(255),
    source_repo VARCHAR(255),
    source_url VARCHAR(255),
    live_url VARCHAR(255),
    homepage_url VARCHAR(255),
    thumbnail_url VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    language VARCHAR(50),
    topics TEXT[],
    default_branch VARCHAR(50),
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 📄 Beschreibungen
    own_description TEXT,
    short_description TEXT,
    highlight TEXT,
    learnings TEXT,
    challenges TEXT,
    role TEXT,
    custom_tags TEXT[],
    use_own_description BOOLEAN DEFAULT FALSE,
    use_short_description BOOLEAN DEFAULT FALSE,

    -- 📽 Medien
    video_url VARCHAR(255),
    video_host VARCHAR(50),
    gallery_urls TEXT[],
    gif_urls TEXT[],

    -- 🧠 Inhalte für Modal
    testimonials TEXT[],
    deployment_notes TEXT,
    achievements TEXT[],
    duration TEXT,
    timeline JSONB,
    releases JSONB,
    changelog TEXT,

    -- 🔧 Technik & Details
    tech_stack JSONB,
    ci_tools TEXT[],
    uptime_percentage NUMERIC(5,2),
    bug_count INTEGER,
    analytics JSONB,

    -- 👥 Beteiligung
    is_open_source BOOLEAN DEFAULT FALSE,
    contribution_notes TEXT,
    owner_type TEXT,
    partners TEXT[],
    sponsors TEXT[],
    team TEXT[],
    team_roles JSONB,

    -- 🌍 Internationalisierung
    translations JSONB,

    -- 🔗 Weitere
    related_projects TEXT[],
    demo_credentials JSONB,
    roadmap JSONB,
    license TEXT,
    blog_url VARCHAR(255),

    -- 🎨 UI Konfiguration
    ui_config JSONB DEFAULT '{}'::jsonb  -- Speichert UI-spezifische Einstellungen wie Sichtbarkeit von Feldern
);

-- POSTS
-- Flexible table for all types of blog posts (project updates,  posts, etc.)
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT '' CHECK (type IN ('', 'project', 'update', 'tutorial', 'news', 'review', 'interview', 'case-study')),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, -- Optional: Link to a project
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL, -- Optional: Link to a section
    
    -- 📝 Basic Content
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    content_markdown TEXT,
    excerpt TEXT, -- Short summary for previews
    
    -- 🖼 Media
    cover_image_url VARCHAR(255),
    cover_image_alt TEXT,
    gallery_urls TEXT[],
    video_url VARCHAR(255),
    video_host VARCHAR(50),
    audio_url VARCHAR(255),
    audio_duration INTEGER, -- Duration in seconds
    audio_transcript TEXT, -- For accessibility
    
    -- 📊 SEO & Stats
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT[],
    reading_time INTEGER, -- Estimated reading time in minutes
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    -- 🏷 Organization
    author TEXT,
    tags TEXT[],
    categories TEXT[],
    series TEXT, -- For multi-part posts
    related_posts INTEGER[], -- References to other posts
    
    -- 📅 Publishing
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- 🌍 Internationalization
    language VARCHAR(10) DEFAULT 'en',
    translations JSONB, -- Store translations for other languages
    
    -- 🔒 Access Control
    access_level VARCHAR(20) DEFAULT 'public' CHECK (access_level IN ('public', 'private', 'premium')),
    
    -- 📈 Analytics
    analytics JSONB, -- Store additional analytics data
    
    -- 🎨 Customization
    custom_css TEXT,
    custom_js TEXT,
    layout_variant VARCHAR(50) DEFAULT 'default',
    
    -- 📚 Tutorial Specific
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    estimated_completion_time INTEGER, -- In minutes
    prerequisites TEXT[], -- Required knowledge/skills
    learning_objectives TEXT[], -- What will be learned
    resources JSONB, -- Additional resources, links, downloads
    
    -- 📝 Content Management
    revision_history JSONB, -- Track changes and versions
    last_reviewed_at TIMESTAMPTZ,
    last_reviewed_by TEXT,
    content_status VARCHAR(20) DEFAULT 'draft' CHECK (content_status IN ('draft', 'review', 'approved', 'published', 'archived')),
    
    -- 🎯 Engagement
    target_audience TEXT[],
    engagement_metrics JSONB, -- Store likes, shares, comments details
    feedback JSONB, -- Store user feedback and ratings
    
    -- 🔄 Workflow
    assigned_to TEXT,
    review_notes TEXT,
    publication_schedule TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ
);

-- SKILLS
-- These are the skills showcased by the site owner. They inherently belong to the owner.
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    category VARCHAR(64) NOT NULL,
    description TEXT,
    items JSONB NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI GENERATED CONTENT
-- Stores content generated by AI, associated with the owner and optionally a page layout section.
CREATE TABLE IF NOT EXISTS ai_generated_content (
    id SERIAL PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL DEFAULT 'me' REFERENCES site_owner(id) ON DELETE CASCADE CHECK (owner_id = 'me'),
    source_url VARCHAR(2048),       -- URL of the source data if applicable
    source_type VARCHAR(50) NOT NULL, -- e.g., 'github_readme', 'linkedin_profile', 'manual_input'
    summary TEXT NOT NULL,          -- The AI-generated summary or content
    raw_data_input JSONB,           -- The raw input data provided to the AI
    generation_parameters JSONB,    -- Parameters used for the AI generation
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    path VARCHAR(1024) NOT NULL, -- z.B. "2024/06/01/xyz.jpg"
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE, -- für Ordnerstruktur
    is_folder BOOLEAN DEFAULT FALSE,
    size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags TEXT[],
    used_in JSONB, -- z.B. Referenzen auf Projekte, Posts etc.
    -- weitere Metadaten nach Bedarf
    UNIQUE (parent_id, name)
);

CREATE TABLE IF NOT EXISTS layouts (
    id SERIAL PRIMARY KEY,
    page VARCHAR(255) NOT NULL DEFAULT 'home',
    elements JSONB NOT NULL DEFAULT '[]',
    layout_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Legacy fields for backward compatibility (not used in new implementation)
    name VARCHAR(255),
    description TEXT,
    grid_config JSONB,
    layout_variant VARCHAR(50),
    sections_order JSONB,
    layout_type VARCHAR(50),
    show_sidebar BOOLEAN,
    sidebar_position VARCHAR(50),
    content JSONB
);

-- Index for efficient page-based queries
CREATE INDEX IF NOT EXISTS idx_layouts_page ON layouts(page);
