# Mentfx Mastery Dashboard - Changelog & Roadmap

## [v1.01] - 2026-04-27
### Added
- **Application of Material Section**: A dedicated new tracking area for practical sessions and chart breakdowns from Discord. Includes 14 pre-loaded videos.
- **Dashboard Metrics**: New metric cards for "Study Progress" and "Latest Concept" specific to Application material.
- **Sidebar Progress Bar**: Added a third progress ring in the mini-dashboard for quick tracking of Application study.
- **Auto-Sync Logic**: Implemented a robust client-side sync that merges new official data into existing user progress without losing notes or ratings.
- **Webinar Expansion**: Updated source data to include Webinars 1 through 258 with links.

### Fixed
- **Monthly Grouping**: Corrected data for April/May 2024 (Webinars 148-150 moved to the correct month).
- **Missing Links**: Updated several previously empty webinar links (Webinars 68, 78, 82, 91, 125, 254).
- **GitHub Pages 404s**: Added environment detection to prevent API errors when running on static GitHub Pages.

---

## Future Roadmap (Planned Features)

### 🔍 Search & Discovery
- **Global Search**: Filter webinars and lessons by title, notes, or key takeaways.
- **Topic Tagging**: Label videos with tags like `#EVC`, `#Liquidity`, or `#Psychology` for categorized studying.

### 📊 Advanced Analytics
- **Study Heatmap**: Visualize study consistency with a contribution-style activity graph.
- **Comprehension Trends**: Line charts tracking your average understanding rating over time.

### 📱 User Experience
- **PWA Support**: Transform the dashboard into an installable app for mobile and desktop.
- **Knowledge Base**: A central "Trading Bible" view that aggregates all your saved Key Takeaways into one page.

### 💾 Data Management
- **One-Click Export**: Download your entire study journal (notes, ratings, dates) as a PDF or CSV file.
- **Local Server Sync**: Improved background persistence for multi-device usage.
