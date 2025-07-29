import { GPXProcessor } from './gpx-processor.js';

class GPXMonsterApp {
    constructor() {
        this.files = [];
        this.processor = null;
        this.initializeElements();
        this.setupEventListeners();
        this.initializeProcessor();
        this.initializeMap();
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
        this.mapOverlay = document.getElementById('mapOverlay');
        this.mapContainer = document.querySelector('.map-container');
        this.browseLink = document.getElementById('browseLink');
        this.clearBtn = document.getElementById('clearBtn');
        this.controlsPanel = document.getElementById('controlsPanel');
        this.leftPanel = document.querySelector('.left-panel');
        this.map = null;
        this.currentPolyline = null;
        this.currentMarkers = [];
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
        
        // Prevent default drag behaviors on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    initializeProcessor() {
        this.processor = new GPXProcessor((_message) => {
            // Minimal UI - no logging
        });
    }

    initializeMap() {
        // Initialize empty map
        this.map = L.map('map', {
            center: [46.5, 11.5], // Center on Dolomites region
            zoom: 8
        });
        
        // Add CartoDB Positron (light grayscale) map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // Show overlay initially
        this.mapOverlay.style.display = 'flex';
    }



    handleDrop(e) {
        e.preventDefault();
        this.mapContainer.classList.remove('map-dragover');
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
            return;
        }

        // Add new files, avoid duplicates
        files.forEach(file => {
            if (!this.files.some(f => f.name === file.name && f.size === file.size)) {
                this.files.push(file);
            }
        });

        this.updateFileList();
        this.autoProcessFiles();
    }

    updateFileList() {
        // Show/hide empty state and controls
        if (this.files.length === 0) {
            this.emptyState.style.display = 'flex';
            this.controlsPanel.style.display = 'none';
            return;
        } else {
            this.emptyState.style.display = 'none';
            this.controlsPanel.style.display = 'block';
        }

        // Clear existing file items (but keep empty state)
        const existingItems = this.fileList.querySelectorAll('.file-item');
        existingItems.forEach(item => item.remove());

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="file-remove">×</button>
            `;
            
            // Add event listener to remove button
            const removeBtn = fileItem.querySelector('.file-remove');
            removeBtn.addEventListener('click', () => this.removeFile(index));
            
            this.fileList.appendChild(fileItem);
        });
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
        this.files = [];
        this.fileInput.value = '';
        this.updateFileList();
        this.hideResults();
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

        try {
            const { results, outputs, coordinates } = await this.processor.processFiles(
                this.files,
                'merge',
                [],
                (progress, status) => {
                    this.updateProgress(progress, status);
                }
            );

            this.hideProgress();
            this.showResults(results, outputs, coordinates);

        } catch (error) {
            this.hideProgress();
            alert(`Processing failed: ${error.message}`);
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

    showResults(_results, outputs, coordinates = []) {
        // Create download buttons
        this.downloadButtons.innerHTML = '';
        outputs.forEach(output => {
            const button = document.createElement('a');
            button.className = 'download-btn';
            button.textContent = `Download ${output.name}`;
            button.href = this.createDownloadUrl(output.content);
            button.download = output.name;
            this.downloadButtons.appendChild(button);
        });
        
        this.resultsSection.style.display = 'block';

        // Show map with route
        if (coordinates && coordinates.length > 0) {
            this.showMap(coordinates);
        }
    }

    showMap(coordinates) {
        // Hide the overlay
        this.mapOverlay.style.display = 'none';
        
        // Clear existing layers
        this.clearMapLayers();

        // Create polyline from coordinates
        this.currentPolyline = L.polyline(coordinates, {
            color: '#e91e63',
            weight: 4,
            opacity: 0.9
        }).addTo(this.map);

        // Add start and end markers
        if (coordinates.length > 0) {
            const startPoint = coordinates[0];
            const endPoint = coordinates[coordinates.length - 1];
            
            const startMarker = L.marker(startPoint)
                .bindPopup('Start');
            const endMarker = L.marker(endPoint)
                .bindPopup('End');
                
            this.currentMarkers.push(startMarker, endMarker);
            
            startMarker.addTo(this.map);
            if (coordinates.length > 1) {
                endMarker.addTo(this.map);
            }
        }

        // Fit map to show entire route
        this.map.fitBounds(this.currentPolyline.getBounds(), { padding: [20, 20] });
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
        this.mapOverlay.style.display = 'flex';
        
        // Clear map layers but keep the map
        this.clearMapLayers();
    }

    clearMapLayers() {
        if (this.map) {
            // Remove current polyline and markers
            if (this.currentPolyline) {
                this.map.removeLayer(this.currentPolyline);
                this.currentPolyline = null;
            }
            
            this.currentMarkers.forEach(marker => {
                this.map.removeLayer(marker);
            });
            this.currentMarkers = [];
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
});

// Make app globally available for button onclick handlers
globalThis.app = app;