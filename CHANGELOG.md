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

## [v1.02] - 2026-04-29
### Added
- **Global Search**: Centralized search bar in the sidebar that scans across Webinars, Mastery Lessons, and Application items (titles, notes, and tags).
- **Topic Tagging System**: Ability to add hashtags (e.g., #EVC, #Liquidity) to any item via the Update Modal. Tags are interactive and filterable.
- **Study Heatmap**: A contribution-style activity graph on the Dashboard visualizing daily study consistency.
- **Comprehension Trends**: Line charts tracking average understanding ratings over time to monitor progress.
- **Activity Logging**: Background system that records study events to power the analytics engine.
---

## [v1.03] - 2026-04-30
### Fixed
- **Code Audit & Stability**: Performed a comprehensive audit of `app.js`. Fixed critical SyntaxErrors caused by duplicate variable declarations and brace mismatches.
- **Webinar Tracker**: Fixed a logical bug where the tracker table appeared empty due to a missing `renderCurrentView` dispatcher function.
- **Search Logic**: Corrected an invalid element ID reference (`search-input` vs `search-filter`) that broke local filtering.
- **Global Handlers**: Resolved broken button mappings in the Update Modal by correctly exposing `saveChanges` to the global scope.
- **Reference Clean-up**: Added stubs for `loadFromServer` and `saveToServer` to prevent runtime errors and ensure smooth execution.

---

## Future Roadmap (Planned Features)

### 📱 User Experience
- **PWA Support**: Transform the dashboard into an installable app for mobile and desktop.
- **Knowledge Base**: A central "Trading Bible" view that aggregates all your saved Key Takeaways into one page.

### 💾 Data Management
- **One-Click Export**: Download your entire study journal (notes, ratings, dates) as a PDF or CSV file.
- **Local Server Sync**: Improved background persistence for multi-device usage.
