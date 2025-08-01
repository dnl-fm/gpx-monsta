# GPX Monster - Browser Version

A professional browser-based GPX file processor that intelligently merges multiple GPX files or normalizes individual files. Features smart timestamp-aware sorting, visual file management, and comprehensive user feedback.

## Features

### Core Processing
- **Smart Merge Mode**: Intelligently combines multiple GPX files with chronological or filename-based sorting
- **Normalize Mode**: Process individual GPX files to extract and organize track points
- **Timestamp Detection**: Automatically detects which files contain timestamps for optimal sorting
- **Route Statistics**: Calculate distance, elevation gain/loss, and elevation range with metric/imperial units

### Advanced Sorting Logic
- **Chronological Sorting**: When all files have timestamps, sorts points by actual time for accurate temporal sequence
- **Filename Fallback**: When any file lacks timestamps, uses consistent filename-based sorting for predictability
- **Visual Indicators**: Clear notifications explain which sorting method is being used and why
- **Manual Reordering**: Drag-and-drop file reordering for user control when automatic sorting isn't optimal

### User Experience
- **Drag & Drop Interface**: Intuitive file upload with visual feedback and progress tracking
- **Interactive Map**: Real-time route visualization with MapLibre GL JS
- **Timestamp Indicators**: Green badges show which files contain timestamp data
- **Smart Notifications**: Context-aware messages explain sorting behavior and provide guidance
- **File Management**: Visual file list with size information and timestamp status
- **Offline Processing**: All processing happens locally in your browser - no data sent to servers

## Usage

### Getting Started

1. **Launch**: Open `index.html` in a modern web browser or serve via local HTTP server
2. **Upload Files**: 
   - Drag and drop GPX files onto the upload area
   - Or click "browse files" to select files manually
   - Files appear in the left panel with timestamp indicators
3. **Processing Mode**: Files are automatically processed in merge mode
4. **View Results**: 
   - Interactive map shows your combined route
   - Route statistics display distance, elevation, and other metrics
   - Download button provides the merged GPX file

### Understanding Sorting Behavior

GPX Monster uses intelligent sorting logic based on your file contents:

#### Chronological Sorting (Blue Notification)
- **When**: All uploaded files contain timestamp data
- **Behavior**: Points sorted by actual recording time across all files
- **Visual**: Blue notification: "Sorted chronologically by timestamps"
- **Files**: Reordered in the list to match chronological sequence
- **Best For**: GPS tracks recorded at different times/days

#### Filename Fallback (Amber Warning)
- **When**: Any uploaded file lacks timestamp data
- **Behavior**: All files processed in filename/upload order for consistency
- **Visual**: Amber notification: "Not all files have timestamps - sorted by filename. You can reorder files manually by dragging."
- **Files**: Maintain original upload order
- **Best For**: Route files, mixed data sources, or when you prefer predictable ordering

### File Management

- **Timestamp Indicators**: Files with timestamp data show green "has timestamp" badges
- **Manual Reordering**: Drag files up/down in the list to change processing order
- **File Removal**: Click the "×" button to remove individual files
- **Clear All**: Reset and start over with new files

### File Requirements

- Files must have `.gpx` extension
- Files should contain valid GPX XML with track points (`<trkpt>` elements)
- Only track points are processed (waypoints and routes are ignored for route continuity)

### Sample Data

The `data/` folder contains sample GPX files for testing different scenarios:

**Original Transdolomiti Files** (no timestamps):
- `Transdolomiti_Day_1.gpx` through `Transdolomiti_Day_6.gpx`
- These files demonstrate filename-based sorting behavior

**Timestamped Test Files**:
- `Day_1_timestamped.gpx` - Points from 10:00-11:00 AM
- `Day_2_timestamped.gpx` - Points from 09:00-10:00 AM (earlier than Day 1)
- `Day_3_timestamped.gpx` - Points from 11:00 AM-12:00 PM (latest)
- These files demonstrate chronological sorting (Day_2 → Day_1 → Day_3)

**Mixed Scenario File**:
- `Day_4_no_timestamp.gpx` - File without timestamps for testing fallback behavior

Upload any combination to see how the intelligent sorting logic responds!

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

- `normalizeGPXData()`: Parses GPX XML using DOMParser and extracts track points with timestamp detection
- `generateGPX()`: Creates merged GPX with intelligent sorting (chronological or filename-based)
- `generateSingleTrackGPX()`: Creates normalized single-track GPX from one file
- `processFiles()`: Main processing function with timestamp analysis and sorting logic
- `updateFileList()`: Dynamic UI updates with timestamp indicators and sorting notifications

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