# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GPX Monster is a TypeScript/Deno utility for processing GPX (GPS Exchange Format) files. It can merge multiple GPX files into a single track or normalize individual GPX files by extracting only track points and maintaining proper chronological order.

## Commands

### Running the Tool
```bash
# Merge all GPX files in a folder
deno run -A main.ts ./data merged.gpx

# Normalize individual files (creates *_normalized.gpx files)
deno run -A main.ts ./data --normalize

# Merge specific files only
deno run -A main.ts ./data day1_day2.gpx --files Day_1,Day_2
```

### Development Commands
```bash
# Run with type checking
deno run --allow-read --allow-write main.ts

# Check types
deno check main.ts

# Format code
deno fmt

# Lint code
deno lint
```

## Architecture

- **main.ts**: Single-file application containing all functionality
- **data/**: Directory containing sample Transdolomiti GPX files (6 days)
- No external dependencies except Deno standard library and JSR XML parser

### Core Functions

- `normalizeGPXData()`: Parses GPX XML and extracts track points with validation
- `generateGPX()`: Creates merged GPX with chronologically sorted points across files
- `generateSingleTrackGPX()`: Creates normalized single-track GPX from one file
- `processGPXFiles()`: Main processing function handling file operations

### Data Flow

1. Walks directory for .gpx files
2. Parses XML using `jsr:@libs/xml@7/parse`
3. Extracts only track points (ignores waypoints/routes) 
4. Validates coordinates and handles missing data
5. Sorts points chronologically
6. Outputs merged or individual normalized GPX files

## Key Design Decisions

- Only processes track points to maintain route continuity
- Files are processed in day order (Day_1, Day_2, etc.)
- Invalid coordinates are skipped with warnings
- Single track with one segment for merged output
- Preserves elevation and timestamp data when available