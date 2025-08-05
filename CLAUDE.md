# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GPX Monster is a dual-environment TypeScript/Deno utility and browser application for processing GPX (GPS Exchange Format) files. It can merge multiple GPX files or normalize individual files with intelligent timestamp-aware sorting.

## Commands

### Deno/Server Version
```bash
# Run development server with file watching
deno task dev
# or: deno run --allow-net --allow-read --allow-env --watch main.ts

# Start production server
deno task start
# or: deno run --allow-net --allow-read --allow-env main.ts

# Run tests
deno task test
# Run tests with file watching
deno task test:watch

# Type checking
deno task check
# or: deno check main.ts

# Format code
deno task fmt
# or: deno fmt

# Lint code  
deno task lint
# or: deno lint
```

### Browser Version
```bash
# Serve the web application locally
python3 -m http.server 8000
# then visit http://localhost:8000

# Or directly open index.html in a modern browser
open index.html
```

## Architecture

### Dual Environment Design
The project maintains both a Deno command-line tool and a browser-based web application:

**Deno Version (main.ts)**:
- HTTP server serving static files for the browser app
- Uses Deno Deploy-ready static file serving
- Security-focused file serving with allowlist

**Browser Version (index.html + main.js + gpx-processor.js)**:
- Complete client-side processing using DOMParser
- Interactive drag-and-drop interface with MapLibre GL mapping
- PostHog analytics integration for usage tracking
- Real-time progress feedback and visual file management

### Core Processing Pipeline
Both versions share the same processing logic but with different I/O adapters:

1. **File Input**: Command-line args vs File API
2. **GPX Parsing**: JSR XML parser vs DOMParser  
3. **Timestamp Detection**: Analyze all files for temporal data
4. **Intelligent Sorting**: 
   - Chronological (when all files have timestamps)
   - Filename fallback (when any file lacks timestamps)
5. **Track Processing**: Extract only track points, skip waypoints/routes
6. **Output Generation**: File writing vs download blob creation

### Key Components

**GPXProcessor class** (gpx-processor.js):
- `normalizeGPXData()`: Parses GPX XML and extracts track points with timestamp detection
- `generateGPX()`: Creates merged GPX with intelligent sorting logic
- `processFiles()`: Main processing orchestrator with progress callbacks
- `calculateDistance()`: Haversine formula for route statistics

**GPXMonsterApp class** (main.js):
- File management with drag-and-drop reordering
- Real-time map visualization using MapLibre GL
- PostHog event tracking for user interactions
- Smart UI updates based on timestamp availability

### Intelligent Sorting System
The application uses a sophisticated two-tier sorting approach:

**Chronological Mode**: When ALL files contain timestamps
- Sorts all track points by actual recording time across files
- Reorders files in UI to match chronological sequence  
- Shows blue notification to user
- Optimal for GPS tracks recorded at different times

**Filename Fallback Mode**: When ANY file lacks timestamps
- Uses consistent filename-based sorting for predictability
- Maintains original upload order
- Shows amber warning notification
- Allows manual drag-and-drop reordering

### Analytics Integration
PostHog analytics tracks key user interactions:
- File uploads, processing events, downloads
- Unit preference changes, error conditions
- Replace `ph_YOUR_PROJECT_API_KEY_HERE` in index.html with actual API key

### File Structure
- **index.html**: Main web application interface with PostHog analytics
- **main.js**: Browser app logic with MapLibre GL mapping and analytics
- **gpx-processor.js**: Core GPX processing shared between environments
- **main.ts**: Deno HTTP server for serving the web application  
- **styles.css**: Application styling with drag-and-drop visual feedback
- **data/**: Sample GPX files for testing both timestamp scenarios
- **tests/**: Deno test suite with fixtures

### Development Patterns
- Browser version requires no build process - runs directly in browser
- Deno version handles both CLI processing and web app serving
- Shared processing logic between environments for consistency
- Progressive enhancement with fallbacks for missing features
- Client-side processing for privacy (no data sent to servers)

## Testing
Test files are located in `tests/` with fixtures in `tests/fixtures/`. The test suite covers:
- GPX parsing with various timestamp scenarios
- Sorting logic validation  
- Error handling for invalid files
- Integration testing of the complete processing pipeline