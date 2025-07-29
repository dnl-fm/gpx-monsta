# GPX Monster - Browser Version

A browser-based GPX file processor that can merge multiple GPX files or normalize individual files. This is the web version of the Deno-based GPX Monster tool.

## Features

- **Merge Mode**: Combine multiple GPX files into a single chronologically-ordered track
- **Normalize Mode**: Process individual GPX files to extract and organize track points
- **Drag & Drop Interface**: Easy file upload with visual feedback
- **File Filtering**: Process only specific files by name
- **Progress Tracking**: Real-time processing progress and detailed logging
- **Offline Processing**: All processing happens in your browser - no data is sent to servers

## Usage

### Getting Started

1. Open `index.html` in a modern web browser
2. Drag and drop GPX files onto the upload area, or click to browse files
3. Select processing mode:
   - **Merge Files**: Combines all files into one chronologically-ordered track
   - **Normalize Individual Files**: Creates cleaned individual track files
4. Optionally filter files by entering comma-separated names (e.g., "Day_1,Day_2")
5. Click "Process Files" to start processing
6. Download the resulting GPX files when processing completes

### File Requirements

- Files must have `.gpx` extension
- Files should contain valid GPX XML with track points (`<trkpt>` elements)
- Only track points are processed (waypoints and routes are ignored for route continuity)

### Sample Data

The `data/` folder contains 6 sample Transdolomiti GPX files for testing:
- Transdolomiti_Day_1.gpx through Transdolomiti_Day_6.gpx

## Browser Compatibility

Requires a modern browser with support for:
- ES2020 JavaScript modules
- File API and FileReader
- DOMParser
- Drag and Drop API

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Technical Details

### Architecture

- **index.html**: Main application interface
- **main.js**: Application logic and UI interactions
- **gpx-processor.js**: Core GPX parsing and generation logic
- **styles.css**: Application styling

### Key Functions

- `normalizeGPXData()`: Parses GPX XML using DOMParser and extracts track points
- `generateGPX()`: Creates merged GPX with chronologically sorted points
- `generateSingleTrackGPX()`: Creates normalized single-track GPX from one file
- `processFiles()`: Main processing function with progress tracking

### Differences from Deno Version

- Uses browser DOMParser instead of JSR XML parser
- File I/O through File API instead of Deno filesystem API
- Web-based interface instead of command-line arguments
- Client-side processing with download links instead of file writing

## Development

To modify or extend the application:

1. Edit the source files directly
2. Test in browser by opening `index.html`
3. For TypeScript development, use the provided `tsconfig.json`

No build process is required - the application runs directly in the browser.

## Troubleshooting

**Files won't upload**: Ensure files have `.gpx` extension and contain valid XML

**Processing fails**: Check the processing log for detailed error messages

**Invalid coordinates**: Points with missing or invalid lat/lon coordinates are automatically skipped

**No download buttons**: Ensure processing completed successfully - check the log for errors