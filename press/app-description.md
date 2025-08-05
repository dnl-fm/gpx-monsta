# GPX Monster - App Descriptions

## One-liner
"Merge multi-day GPX tracks into single routes for easier planning"

## Short Description (Twitter/Social)
GPX Monster merges multiple GPX files into one continuous track. Perfect for route planning when you find multi-day trips online but need them as a single track. Runs locally in your browser - no uploads required.

## Medium Description (GitHub/Portfolio)
A browser-based tool that intelligently merges multiple GPX files into single continuous tracks. Built to solve the common problem of finding multi-day hiking/biking routes online that come as separate daily files, but you need them merged for route planning and modification. Features chronological sorting, interactive mapping, and comprehensive route statistics.

## Long Description (Website/Documentation)
GPX Monster is a browser-based GPX file processor designed for route planners who find multi-day trips online but need them as single continuous tracks. 

**The Problem:** Amazing multi-day routes are shared online as separate daily GPX files, making route planning and modification difficult.

**The Solution:** Drop multiple GPX files into GPX Monster and get a single merged track with intelligent chronological sorting, interactive route visualization, and downloadable results.

**Key Features:**
- Drag & drop interface for multiple GPX files
- Intelligent sorting (chronological if timestamped, filename-based otherwise)  
- Interactive route mapping with MapLibre GL
- Route statistics (distance, elevation gain/loss, elevation range)
- Metric/Imperial unit support
- Completely offline processing - no data uploads
- Works with GPX files from any source (Komoot, AllTrails, Garmin, etc.)

Perfect for hikers, bikers, and outdoor enthusiasts who want to plan their own variations of multi-day routes found online.

## Technical Summary
Browser-based GPX processor built with vanilla JavaScript, using DOMParser for GPX parsing and MapLibre GL for route visualization. Features intelligent timestamp detection for chronological sorting with filename-based fallback. All processing happens client-side with no server dependencies.

## Target Audience Tags
- Route planners
- Multi-day hikers  
- Bike touring enthusiasts
- GPS users
- Outdoor trip planners
- Hiking route researchers

## Use Case Examples
- "Found a 6-day Dolomites trek on a blog, but need it as one track for Gaia GPS"
- "Downloaded a bikepacking route from Komoot with daily stages, want to see the full elevation profile"
- "Planning a section hike of a long trail using separate daily GPX downloads"
- "Modifying a multi-day route but need to see the complete track first"

## Platform-Specific Descriptions

### Product Hunt
**Tagline:** "Merge multi-day GPX tracks for easier route planning"
**Description:** Turn scattered daily GPX files into single continuous tracks. Perfect for route planners who find multi-day trips online but need them merged for GPS devices and planning tools.

### Hacker News  
**Title:** "GPX Monster – Browser-based tool to merge multi-day GPX tracks"
**Description:** Built this to solve my own problem: finding cool multi-day routes online that come as separate daily files, but needing them as single tracks for route planning.

### Dev.to
**Title:** "Building GPX Monster: A Browser-Based Solution for Multi-Day Route Planning"
**Hook:** "Every time I found an amazing multi-day hiking route online, it came as 6 separate GPX files. Here's how I built a tool to merge them."