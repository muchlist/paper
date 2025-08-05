# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Hugo-based static blog built with the PaperMod theme. The blog is written in Indonesian and English, focusing on backend development, Golang, and software engineering topics.

## Development Commands

### Hugo Development
- `hugo server` - Start development server with live reload
- `hugo server -D` - Start server including draft posts
- `hugo` - Build the static site (output to `/public`)
- `hugo new content content/post/[name].md` - Create new blog post
- `make new/post name=[name]` - Create new post using Makefile
- `make help` - Show available Makefile commands

### Theme Management
- `git submodule init && git submodule update` - Initialize PaperMod theme submodule
- `make init` - Initialize git submodules (includes theme)

## Content Structure

### Blog Posts
- Posts are located in `/content/post/`
- Use front matter template from `/archetypes/post.md`
- Images stored in `/static/img/[post-name]/`
- Standard categories: Backend, Frontend, Mobile
- Common tags: Golang, Database, Best Practices, Optimization

### Post Front Matter Template
Posts follow a comprehensive front matter structure including:
- Title, date, draft status
- Categories and tags
- Author information
- Display settings (TOC, reading time, breadcrumbs)
- Social sharing configuration
- Cover image and edit links

### Multilingual Support
- Primary language: Indonesian
- English posts in `/content/en/post/`
- Separate English pagination file: `pagination.en.md`

## Site Configuration

### Hugo Configuration (`hugo.yaml`)
- Theme: PaperMod
- Base URL: https://blog.muchlis.dev/
- Dark theme by default with toggle enabled
- Google Analytics: G-F1ZZCKLSJF
- Search functionality enabled via Fuse.js
- Comments via Giscus integration

### Key Features
- Search functionality with JSON index generation
- Social sharing buttons (LinkedIn, X, Facebook, WhatsApp, Telegram)
- Code syntax highlighting with Monokai theme
- Responsive image handling with lazy loading
- Custom CSS and JavaScript assets

## Custom Components

### Shortcodes
- `zoom-image` - Clickable images with lazy loading support
- Located in `/layouts/shortcodes/`

### Custom Assets
- Custom CSS: `/assets/css/custom-styles.css`
- Click-to-zoom JavaScript: `/assets/js/clickable-image.js`
- Images optimization for web (WebP format preferred)

## Theme Customization

### PaperMod Theme
- Located in `/themes/PaperMod/` as git submodule
- Custom layouts in `/layouts/` override theme defaults
- Custom partials for comments (Giscus integration)
- Homepage info mode enabled with author introduction

### Navigation Menu
- Archives page
- Tags page  
- Search functionality
- External portfolio link (https://muchlis.dev)

## Content Guidelines

### Writing Style
- Technical blog posts about backend development
- Focus on Golang, databases, and system architecture
- Include practical examples and code snippets
- Use images to illustrate concepts (stored in `/static/img/`)

### Image Handling
- Store post images in `/static/img/[post-name]/`
- Use WebP format for optimization
- Include alt text and proper captions
- Implement zoom functionality via custom shortcode

## Deployment

The site builds to `/public/` directory and appears to be configured for static hosting. The public directory contains the generated site files.