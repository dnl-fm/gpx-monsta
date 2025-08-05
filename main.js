import { GPXProcessor } from './gpx-processor.js';

class GPXMonsterApp {
    constructor() {
        this.files = [];
        this.processor = null;
        this.isImperial = false;
        this.currentStats = null;
        this.sortingInfo = null;
        this.fileTimestampInfo = null;
        this.initializeElements();
        this.setupEventListeners();
        this.initializeProcessor();
        this.loadUnitPreference();
        this.initializePostHog();
        this.mapLibraryLoaded = false;
        this.mapInitialized = false;
        
        // Show overlay initially since map is not loaded yet
        this.mapOverlay.style.display = 'flex';
    }

    initializeElements() {
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.emptyState = document.getElementById('emptyState');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.downloadButtons = document.getElementById('downloadButtons');
        this.resultsSection = document.getElementById('resultsSection');
        this.statsSection = document.getElementById('statsSection');
        this.unitToggle = document.getElementById('unitToggle');
        this.mapOverlay = document.getElementById('mapOverlay');
        this.mapContainer = document.querySelector('.map-container');
        this.browseLink = document.getElementById('browseLink');
        this.clearBtn = document.getElementById('clearBtn');
        this.controlsPanel = document.getElementById('controlsPanel');
        this.leftPanel = document.querySelector('.left-panel');
        this.map = null;
        this.trackSourceId = 'gpx-track';
        this.trackLayerId = 'gpx-track-layer';
        this.startMarkerId = 'start-marker';
        this.endMarkerId = 'end-marker';
    }

    setupEventListeners() {
        // File upload events
        this.browseLink.addEventListener('click', () => this.fileInput.click());
        this.mapOverlay.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop events for left panel only
        this.leftPanel.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.leftPanel.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.leftPanel.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Control buttons
        this.clearBtn.addEventListener('click', () => this.clearFiles());
        
        // Unit toggle
        this.unitToggle.addEventListener('change', () => this.handleUnitToggle());
        
        // Prevent default drag behaviors on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    initializeProcessor() {
        this.processor = new GPXProcessor((_message) => {
            // Minimal UI - no logging
        });
    }

    async loadMapLibrary() {
        if (this.mapLibraryLoaded) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            // Load CSS first
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css';
            document.head.appendChild(cssLink);
            
            // Load JavaScript
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js';
            script.onload = () => {
                this.mapLibraryLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async initializeMap() {
        if (this.mapInitialized) return;
        
        try {
            await this.loadMapLibrary();
            
            // Initialize MapLibre GL map with a simplified version of MapTiler Basic style
            this.map = new maplibregl.Map({
                container: 'map',
                style: {
                    version: 8,
                    name: "Basic",
                    sources: {
                        "osm": {
                            type: "raster",
                            tiles: [
                                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            ],
                            tileSize: 256,
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }
                    },
                    layers: [
                        {
                            id: "osm",
                            type: "raster",
                            source: "osm"
                        }
                    ]
                },
                center: [11.5, 46.5], // Center on Dolomites region [lng, lat]
                zoom: 8
            });
            
            this.mapInitialized = true;
            
            // Track map initialization
            this.trackEvent('map_initialized');
            
        } catch (error) {
            console.error('Failed to load map library:', error);
            this.trackEvent('map_initialization_failed', { error: error.message });
        }
    }

    // Unit conversion functions
    convertDistance(km, toImperial = false) {
        if (toImperial) {
            return Math.round(km * 0.621371 * 100) / 100; // km to miles
        }
        return km;
    }

    convertElevation(meters, toImperial = false) {
        if (toImperial) {
            return Math.round(meters * 3.28084); // meters to feet
        }
        return meters;
    }

    getDistanceUnit(imperial = false) {
        return imperial ? 'mi' : 'km';
    }

    getElevationUnit(imperial = false) {
        return imperial ? 'ft' : 'm';
    }

    // Number formatting function
    formatNumber(number) {
        return new Intl.NumberFormat().format(number);
    }

    // PostHog Analytics initialization
    initializePostHog() {
        // Check if PostHog is available
        if (typeof posthog !== 'undefined' && posthog) {
            // Track initial page view (handled automatically by PostHog)
            posthog.capture('gpx_monster_app_loaded');
        }
    }

    // Analytics tracking methods
    trackEvent(eventName, properties = {}) {
        if (typeof posthog !== 'undefined' && posthog) {
            posthog.capture(eventName, properties);
        }
    }

    // localStorage functions
    loadUnitPreference() {
        const saved = localStorage.getItem('gpx-monster-units');
        this.isImperial = saved === 'imperial';
        this.unitToggle.checked = this.isImperial;
    }

    // Sort files by day number to ensure consistent processing order
    sortFilesByDay() {
        this.files.sort((a, b) => {
            const dayA = parseInt(a.name.match(/Day_?(\d+)/)?.[1] || '0');
            const dayB = parseInt(b.name.match(/Day_?(\d+)/)?.[1] || '0');
            return dayA - dayB;
        });
    }

    // Setup drag and drop events for file items
    setupFileDragEvents(fileItem, index) {
        fileItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index.toString());
            fileItem.classList.add('dragging');
        });

        fileItem.addEventListener('dragend', () => {
            fileItem.classList.remove('dragging');
            // Remove drag-over class from all items
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        fileItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileItem.classList.add('drag-over');
        });

        fileItem.addEventListener('dragleave', (e) => {
            if (!fileItem.contains(e.relatedTarget)) {
                fileItem.classList.remove('drag-over');
            }
        });

        fileItem.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent bubbling to parent drag handlers
            
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIndex = parseInt(fileItem.dataset.index);
            
            
            if (draggedIndex !== targetIndex) {
                this.reorderFiles(draggedIndex, targetIndex);
            }
            
            fileItem.classList.remove('drag-over');
        });
    }

    // Reorder files array and update UI
    reorderFiles(fromIndex, toIndex) {
        // Move the file in the array
        const [movedFile] = this.files.splice(fromIndex, 1);
        this.files.splice(toIndex, 0, movedFile);
        
        // Update the file list display
        this.updateFileList();
        
        // Reprocess the route with new order
        this.autoProcessFiles();
    }

    saveUnitPreference() {
        localStorage.setItem('gpx-monster-units', this.isImperial ? 'imperial' : 'metric');
    }

    handleUnitToggle() {
        this.isImperial = this.unitToggle.checked;
        this.saveUnitPreference();
        
        // Track unit preference change
        this.trackEvent('unit_preference_changed', {
            unit_system: this.isImperial ? 'imperial' : 'metric'
        });
        
        // Update displayed stats if they exist
        if (this.currentStats) {
            this.showStats(this.currentStats);
        }
    }



    handleDrop(e) {
        e.preventDefault();
        this.mapContainer.classList.remove('map-dragover');
        
        // Check if this is an internal file reordering operation
        const draggedIndex = e.dataTransfer.getData('text/plain');
        if (draggedIndex !== '') {
            // This is an internal drag operation, don't handle as file drop
            return;
        }
        
        // Handle external file drops
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.name.toLowerCase().endsWith('.gpx')
        );
        this.handleFileSelect(files);
    }

    handleFileSelect(fileList) {
        const files = Array.from(fileList).filter(file => 
            file.name.toLowerCase().endsWith('.gpx')
        );
        
        if (files.length === 0) {
            alert('Please select GPX files only.');
            this.trackEvent('file_upload_failed', { reason: 'no_gpx_files' });
            return;
        }

        // Track file upload event
        this.trackEvent('files_uploaded', { 
            file_count: files.length,
            total_files: this.files.length + files.length
        });

        // Initialize map on first file upload
        if (!this.mapInitialized) {
            this.initializeMap();
        }

        // Add new files, avoid duplicates
        files.forEach(file => {
            if (!this.files.some(f => f.name === file.name && f.size === file.size)) {
                this.files.push(file);
            }
        });

        // Sort files by day number to ensure consistent chronological order
        this.sortFilesByDay();

        this.updateFileList();
        this.autoProcessFiles();
    }

    updateFileList() {
        // Clear existing file items, add-more items, and timestamp notifications (but keep empty state)
        const existingItems = this.fileList.querySelectorAll('.file-item, .add-more-item, .timestamp-notification');
        existingItems.forEach(item => item.remove());
        
        // Show/hide empty state and controls
        if (this.files.length === 0) {
            this.emptyState.style.display = 'flex';
            this.controlsPanel.style.display = 'none';
            return;
        } else {
            this.emptyState.style.display = 'none';
            this.controlsPanel.style.display = 'block';
        }

        // Add notification before files if sorting was applied
        if (this.sortingInfo && this.files.length > 0) {
            const notification = document.createElement('div');
            notification.className = 'timestamp-notification';
            
            let message = '';
            let icon = '';
            
            if (this.sortingInfo.type === 'chronological') {
                message = 'Sorted chronologically by timestamps';
                icon = `<svg class="notification-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12,6 12,12 16,14"></polyline>
                </svg>`;
            } else if (this.sortingInfo.hasMixedTimestamps) {
                message = 'Not all files have timestamps - sorted by filename. You can reorder files manually by dragging.';
                icon = `<svg class="notification-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v3l2 2"></path>
                    <path d="M12 21a9 9 0 1 1 0-18c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                </svg>`;
                notification.classList.add('warning');
            }
            
            if (message) {
                notification.innerHTML = `
                    <div class="notification-content">
                        ${icon}
                        <span>${message}</span>
                    </div>
                `;
                this.fileList.appendChild(notification);
            }
        }

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = true;
            fileItem.dataset.index = index;
            
            // Check if this file has timestamps
            const hasTimestamps = this.fileTimestampInfo && this.fileTimestampInfo[file.name];
            const timestampIndicator = hasTimestamps ? 
                `<span class="timestamp-indicator">
                    <svg class="timestamp-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                    <span class="timestamp-label">has timestamp</span>
                </span>` : '';
            
            fileItem.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)} ${timestampIndicator}</div>
                </div>
                <button class="file-remove">×</button>
            `;
            
            // Add drag and drop event listeners
            this.setupFileDragEvents(fileItem, index);
            
            // Add event listener to remove button
            const removeBtn = fileItem.querySelector('.file-remove');
            removeBtn.addEventListener('click', () => this.removeFile(index));
            
            this.fileList.appendChild(fileItem);
        });

        // Add "Add More Files" item after all file items
        this.createAddMoreItem();
    }

    createAddMoreItem() {
        const addMoreItem = document.createElement('div');
        addMoreItem.className = 'add-more-item';
        
        addMoreItem.innerHTML = `
            <div class="add-more-content">
                <p class="add-more-text">Add more GPX files or <span class="browse-link">browse files</span></p>
                <p class="small-text">Additional tracks will be merged with existing ones</p>
            </div>
        `;
        
        // Add click event to the entire item and the browse link
        addMoreItem.addEventListener('click', () => this.fileInput.click());
        const browseLink = addMoreItem.querySelector('.browse-link');
        browseLink.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent double firing
            this.fileInput.click();
        });
        
        this.fileList.appendChild(addMoreItem);
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFileList();
        
        if (this.files.length === 0) {
            this.hideResults();
        } else {
            this.autoProcessFiles();
        }
    }

    clearFiles() {
        const fileCount = this.files.length;
        this.files = [];
        this.fileInput.value = '';
        this.updateFileList();
        this.hideResults();
        this.clearMapLayers();
        this.mapOverlay.style.display = 'flex';
        
        // Track clear action
        this.trackEvent('files_cleared', { file_count: fileCount });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.leftPanel.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (!this.leftPanel.contains(e.relatedTarget)) {
            this.leftPanel.classList.remove('drag-over');
        }
    }

    async autoProcessFiles() {
        if (this.files.length === 0) {
            this.hideResults();
            return;
        }
        
        this.showProgress();
        this.hideResults();

        // Track processing start
        this.trackEvent('gpx_processing_started', { 
            file_count: this.files.length,
            mode: 'merge'
        });

        try {
            const { results, outputs, coordinates, stats, sortingInfo, fileOrder, fileTimestampInfo } = await this.processor.processFiles(
                this.files,
                'merge',
                [],
                (progress, status) => {
                    this.updateProgress(progress, status);
                }
            );

            this.hideProgress();
            await this.showResults(results, outputs, coordinates, stats, sortingInfo, fileOrder, fileTimestampInfo);

            // Track successful processing
            this.trackEvent('gpx_processing_completed', {
                file_count: this.files.length,
                total_distance: stats?.totalDistance,
                elevation_gain: stats?.elevationGain,
                has_timestamps: sortingInfo?.type === 'chronological'
            });

        } catch (error) {
            this.hideProgress();
            alert(`Processing failed: ${error.message}`);
            
            // Track processing error
            this.trackEvent('gpx_processing_failed', {
                file_count: this.files.length,
                error_message: error.message
            });
        }
    }


    showProgress() {
        this.progressSection.style.display = 'block';
        this.updateProgress(0, 'Starting...');
    }

    hideProgress() {
        this.progressSection.style.display = 'none';
    }

    updateProgress(progress, status) {
        this.progressFill.style.width = `${progress}%`;
        if (this.progressText) {
            this.progressText.textContent = status || `${Math.round(progress)}% complete`;
        }
    }

    async showResults(_results, outputs, coordinates = [], stats = null, sortingInfo = null, fileOrder = null, fileTimestampInfo = null) {
        // Reorder files if chronological sorting was used
        if (sortingInfo && sortingInfo.type === 'chronological' && fileOrder && fileOrder.length > 0) {
            const originalFiles = [...this.files];
            this.files = [];
            
            // Add files in chronological order
            for (const fileName of fileOrder) {
                const file = originalFiles.find(f => f.name === fileName);
                if (file) {
                    this.files.push(file);
                }
            }
            
            // Add any remaining files that weren't in the chronological order
            for (const file of originalFiles) {
                if (!this.files.includes(file)) {
                    this.files.push(file);
                }
            }
        }
        
        // Set notification info and timestamp info, then update file list
        this.sortingInfo = sortingInfo;
        this.fileTimestampInfo = fileTimestampInfo;
        this.updateFileList();

        // Show statistics if available
        if (stats) {
            this.currentStats = stats; // Store stats for unit conversion
            this.showStats(stats);
        }
        
        // Create download buttons
        this.downloadButtons.innerHTML = '';
        outputs.forEach((output, index) => {
            const button = document.createElement('a');
            button.className = 'download-btn';
            button.textContent = `Download`;
            button.href = this.createDownloadUrl(output.content);
            
            // Generate timestamp on click to ensure uniqueness
            button.addEventListener('click', (e) => {
                const timestamp = Math.floor(Date.now() / 1000);
                button.download = `gpxmonster-com-track-${timestamp}.gpx`;
                
                // Track download event
                this.trackEvent('gpx_file_downloaded', {
                    file_count: this.files.length,
                    total_distance: this.currentStats?.totalDistance,
                    is_imperial_units: this.isImperial
                });
            });
            
            // Set initial filename (will be updated on click)
            const initialTimestamp = Math.floor(Date.now() / 1000) + index;
            button.download = `gpxmonster-com-track-${initialTimestamp}.gpx`;
            
            this.downloadButtons.appendChild(button);
        });
        
        this.resultsSection.style.display = 'block';

        // Show map with route
        if (coordinates && coordinates.length > 0) {
            await this.showMap(coordinates);
        }
    }

    showStats(stats) {
        const distance = this.convertDistance(stats.totalDistance, this.isImperial);
        const elevationGain = this.convertElevation(stats.elevationGain, this.isImperial);
        const elevationLoss = this.convertElevation(stats.elevationLoss, this.isImperial);
        
        const distanceUnit = this.getDistanceUnit(this.isImperial);
        const elevationUnit = this.getElevationUnit(this.isImperial);
        
        document.getElementById('statDistance').textContent = `${this.formatNumber(distance)} ${distanceUnit}`;
        document.getElementById('statElevationGain').textContent = `${this.formatNumber(elevationGain)} ${elevationUnit}`;
        document.getElementById('statElevationLoss').textContent = `${this.formatNumber(elevationLoss)} ${elevationUnit}`;
        
        if (stats.minElevation !== null && stats.maxElevation !== null) {
            const minElevation = this.convertElevation(stats.minElevation, this.isImperial);
            const maxElevation = this.convertElevation(stats.maxElevation, this.isImperial);
            document.getElementById('statElevationRange').textContent = `${this.formatNumber(minElevation)}–${this.formatNumber(maxElevation)} ${elevationUnit}`;
        } else {
            document.getElementById('statElevationRange').textContent = 'N/A';
        }
        
        this.statsSection.style.display = 'block';
    }

    async showMap(coordinates) {
        // Ensure map is initialized before showing
        if (!this.mapInitialized) {
            await this.initializeMap();
        }
        
        // Hide the overlay
        this.mapOverlay.style.display = 'none';
        
        // Clear existing layers
        this.clearMapLayers();

        if (coordinates.length === 0) return;

        // Convert coordinates to GeoJSON LineString format [lng, lat]
        const lineCoordinates = coordinates.map(coord => [coord[1], coord[0]]);
        
        // Add track source and layer
        this.map.addSource(this.trackSourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: lineCoordinates
                }
            }
        });

        this.map.addLayer({
            id: this.trackLayerId,
            type: 'line',
            source: this.trackSourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#e91e63',
                'line-width': 4,
                'line-opacity': 0.9
            }
        });

        // Add start and end markers
        if (coordinates.length > 0) {
            const startPoint = coordinates[0];
            const endPoint = coordinates[coordinates.length - 1];
            
            // Start marker
            new maplibregl.Marker({ color: '#22c55e' })
                .setLngLat([startPoint[1], startPoint[0]])
                .setPopup(new maplibregl.Popup().setText('Start'))
                .addTo(this.map);
                
            // End marker (if different from start)
            if (coordinates.length > 1) {
                new maplibregl.Marker({ color: '#ef4444' })
                    .setLngLat([endPoint[1], endPoint[0]])
                    .setPopup(new maplibregl.Popup().setText('End'))
                    .addTo(this.map);
            }
        }

        // Fit map to show entire route
        const bounds = new maplibregl.LngLatBounds();
        lineCoordinates.forEach(coord => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: 20 });
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.statsSection.style.display = 'none';
        this.sortingInfo = null;
        this.fileTimestampInfo = null;
        this.currentStats = null; // Clear stored stats
        this.mapOverlay.style.display = 'flex';
        
        // Clear map layers but keep the map
        this.clearMapLayers();
    }

    clearMapLayers() {
        if (this.map) {
            // Remove track layer and source if they exist
            if (this.map.getLayer(this.trackLayerId)) {
                this.map.removeLayer(this.trackLayerId);
            }
            if (this.map.getSource(this.trackSourceId)) {
                this.map.removeSource(this.trackSourceId);
            }
            
            // Remove all markers
            const markers = document.querySelectorAll('.maplibregl-marker');
            markers.forEach(marker => marker.remove());
        }
    }


    createDownloadUrl(content) {
        const blob = new Blob([content], { type: 'application/gpx+xml' });
        return URL.createObjectURL(blob);
    }


    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GPXMonsterApp();
    // Make app globally available for button onclick handlers
    globalThis.app = app;
});