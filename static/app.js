class PlantAnalyzer {
    constructor() {
        this.selectedImages = [];
        this.cameraStream = null;
        this.currentResults = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.restoreResults();
    }

    setupEventListeners() {
        const fileUpload = document.getElementById('file-upload');
        const batchInput = document.getElementById('batchInput');
        
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        }
        
        if (batchInput) {
            batchInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        }
        
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const dropZones = document.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('border-primary');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('border-primary');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('border-primary');
                this.handleFileSelect(e.dataTransfer.files);
            });
        });
    }

    handleFileSelect(files) {
        this.selectedImages = Array.from(files).filter(file => file.type.startsWith('image/'));
        this.clearResults();
        this.showImagePreview();
        this.updateAnalyzeButton();
        
        if (this.selectedImages.length > 0) {
            setTimeout(() => {
                const btn = document.getElementById('analyzeBtn');
                if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }

    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            
            const video = document.getElementById('cameraPreview');
            video.srcObject = this.cameraStream;
            video.play();
            this.updateCameraUI(true);
        } catch (err) {
            this.showNotification('Camera access denied', 'error');
        }
    }

    capturePhoto() {
        const video = document.getElementById('cameraPreview');
        const canvas = document.getElementById('cameraCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob(blob => {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            this.selectedImages = [file];
            this.clearResults();
            this.showImagePreview();
            this.updateAnalyzeButton();
            this.showNotification('Photo captured!', 'success');
            this.stopCamera();
        });
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.updateCameraUI(false);
        }
    }

    updateCameraUI(active) {
        const video = document.getElementById('cameraPreview');
        const captureBtn = document.getElementById('captureBtn');
        const stopBtn = document.getElementById('stopBtn');
        const cameraIcon = document.getElementById('cameraIcon');
        
        if (video) video.style.display = active ? 'block' : 'none';
        if (captureBtn) captureBtn.style.display = active ? 'inline-flex' : 'none';
        if (stopBtn) stopBtn.style.display = active ? 'inline-flex' : 'none';
        if (cameraIcon) cameraIcon.style.display = active ? 'none' : 'flex';
    }

    async analyzeImages() {
        if (this.selectedImages.length === 0) {
            this.showNotification('Please select images first', 'error');
            return;
        }

        const formData = new FormData();
        this.selectedImages.forEach(file => formData.append('images', file));

        try {
            this.setAnalyzing(true);
            
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            this.currentResults = data.results;
            this.saveResults(data.results);
            this.displayResults(data.results);
            this.showNotification('Analysis completed!', 'success');
            
            setTimeout(() => {
                const section = document.getElementById('resultsSection');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification(error.message || 'Analysis failed', 'error');
        } finally {
            this.setAnalyzing(false);
        }
    }

    setAnalyzing(analyzing) {
        const btn = document.getElementById('analyzeBtn');
        if (!btn) return;
        
        if (analyzing) {
            btn.innerHTML = '<span class="material-icons animate-spin">hourglass_empty</span>Analyzing...';
            btn.disabled = true;
            btn.classList.add('bg-slate-400', 'cursor-not-allowed');
            btn.classList.remove('bg-primary', 'hover:bg-green-600');
        } else {
            btn.innerHTML = '<span class="material-icons">science</span>Analyze Images';
            this.updateAnalyzeButton();
        }
    }

    updateAnalyzeButton() {
        const btn = document.getElementById('analyzeBtn');
        if (!btn) return;
        
        const hasImages = this.selectedImages.length > 0;
        
        if (hasImages) {
            btn.disabled = false;
            btn.className = 'w-full flex justify-center items-center gap-2 rounded-lg bg-primary px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-green-600 transition-colors cursor-pointer';
        } else {
            btn.disabled = true;
            btn.className = 'w-full flex justify-center items-center gap-2 rounded-lg bg-slate-400 dark:bg-slate-600 px-6 py-4 text-sm font-semibold text-white dark:text-slate-300 cursor-not-allowed';
        }
        
        const batchPreview = document.getElementById('batchPreview');
        if (batchPreview && hasImages) {
            this.showBatchPreview();
        }
    }

    displayResults(results) {
        const container = document.getElementById('resultsContainer');
        const section = document.getElementById('resultsSection');
        
        if (!container || !section) return;
        
        container.innerHTML = '';
        results.forEach(result => container.appendChild(this.createResultCard(result)));
        section.style.display = 'block';
    }

    createResultCard(result) {
        const div = document.createElement('div');
        div.className = 'border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4 shadow-sm';
        
        if (result.error) {
            div.innerHTML = `
                <h3 class="font-semibold text-red-600">${this.escapeHtml(result.filename)}</h3>
                <p class="text-red-500">Error: ${this.escapeHtml(result.error)}</p>
            `;
            return div;
        }

        const severity = (result.parsed.severity || '').toLowerCase();
        const severityColor = severity === 'severe' ? 'text-red-600' : 
                             severity === 'moderate' ? 'text-yellow-600' : 'text-green-600';
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="font-semibold text-lg">${this.escapeHtml(result.filename)}</h3>
                ${result.id ? `
                <button onclick="analyzer.exportSingleReport('${this.escapeHtml(result.id)}')" 
                        class="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    <span class="material-icons text-sm">download</span> Export PDF
                </button>
                ` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div class="flex items-center gap-2">
                    <span class="material-icons text-primary">eco</span>
                    <span class="font-medium">Plant:</span> 
                    <span>${this.escapeHtml(result.parsed.plant_type || 'Unknown')}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-icons text-primary">favorite</span>
                    <span class="font-medium">Status:</span> 
                    <span class="${(result.parsed.health_status || '').toLowerCase() === 'healthy' ? 'text-green-600' : 'text-red-600'}">
                        ${this.escapeHtml(result.parsed.health_status || 'Unknown')}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-icons text-primary">bug_report</span>
                    <span class="font-medium">Disease:</span> 
                    <span>${this.escapeHtml(result.parsed.disease_name || 'None')}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-icons text-primary">warning</span>
                    <span class="font-medium">Severity:</span> 
                    <span class="${severityColor}">${this.escapeHtml(result.parsed.severity || 'N/A')}</span>
                </div>
            </div>
            <div class="space-y-3">
                <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-primary">search</span>
                        <span class="font-medium">Symptoms:</span>
                    </div>
                    <div class="text-sm">${this.formatText(result.parsed.symptoms || 'No symptoms')}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-primary">medical_services</span>
                        <span class="font-medium">Treatment:</span>
                    </div>
                    <div class="text-sm">${this.formatText(result.parsed.treatment || 'No treatment needed')}</div>
                </div>
                ${result.parsed.medicines ? `
                <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-blue-600">medication</span>
                        <span class="font-medium">Medicines:</span>
                    </div>
                    <div class="text-sm">${this.formatText(result.parsed.medicines)}</div>
                </div>
                ` : ''}
                ${result.parsed.cost_estimate ? `
                <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-icons text-green-600">currency_rupee</span>
                        <span class="font-medium">Cost:</span>
                    </div>
                    <p class="text-green-600 text-2xl font-bold">${this.escapeHtml(result.parsed.cost_estimate)}</p>
                </div>
                ` : ''}
            </div>
        `;
        return div;
    }

    formatText(text) {
        if (!text) return '';
        
        const lines = text.split('\n').filter(line => line.trim());
        let html = '<div class="space-y-2">';
        
        lines.forEach(line => {
            line = line.trim();
            if (line) {
                const isStep = /^(\d+[.)]|[-•])/.test(line);
                line = line.replace(/^(\d+[.)]|[-•])\s*/, '');
                
                if (isStep) {
                    html += `
                        <div class="flex gap-2 items-start">
                            <span class="material-icons text-primary text-sm mt-0.5">check_circle</span>
                            <span>${this.escapeHtml(line)}</span>
                        </div>
                    `;
                } else {
                    html += `<p>${this.escapeHtml(line)}</p>`;
                }
            }
        });
        
        html += '</div>';
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    showImagePreview() {
        const preview = document.getElementById('imagePreview');
        const container = document.getElementById('previewContainer');
        
        if (!preview || !container) return;
        
        if (this.selectedImages.length === 0) {
            preview.classList.add('hidden');
            return;
        }
        
        preview.classList.remove('hidden');
        container.innerHTML = '';
        
        this.selectedImages.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'relative group';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'w-full h-32 object-cover rounded-lg border-2 border-gray-200';
            img.alt = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<span class="material-icons text-sm">close</span>';
            removeBtn.className = 'absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700';
            removeBtn.onclick = () => this.removeImage(index);
            
            div.appendChild(img);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    }

    showBatchPreview() {
        const preview = document.getElementById('batchPreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        
        this.selectedImages.forEach((file, index) => {
            const container = document.createElement('div');
            container.className = 'relative inline-block m-2';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'border rounded-lg shadow-sm';
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.objectFit = 'cover';
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<span class="material-icons text-sm">close</span>';
            removeBtn.className = 'absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700';
            removeBtn.onclick = () => this.removeImage(index);
            
            container.appendChild(img);
            container.appendChild(removeBtn);
            preview.appendChild(container);
        });
    }

    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.showImagePreview();
        this.showBatchPreview();
        this.updateAnalyzeButton();
    }

    async showHistory() {
        try {
            const response = await fetch('/history', { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Failed to load history');
            
            const history = await response.json();
            const container = document.getElementById('historyContainer');
            const modal = document.getElementById('historyModal');
            
            if (!container || !modal) return;
            
            container.innerHTML = history.length === 0 
                ? '<p class="text-center py-8 text-gray-500">No history found</p>'
                : history.map(item => this.createHistoryItem(item)).join('');
            
            modal.classList.remove('hidden');
        } catch (error) {
            this.showNotification('Failed to load history', 'error');
        }
    }

    createHistoryItem(item) {
        const date = new Date(item.timestamp).toLocaleString();
        return `
            <div class="border-b border-gray-200 pb-4 mb-4 last:border-b-0">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-lg">${this.escapeHtml(item.image_name)}</h4>
                        <p class="text-sm text-gray-500 mb-2">${date}</p>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div><span class="font-medium">Plant:</span> ${this.escapeHtml(item.plant_type)}</div>
                            <div><span class="font-medium">Status:</span> ${this.escapeHtml(item.health_status)}</div>
                            <div><span class="font-medium">Disease:</span> ${this.escapeHtml(item.disease_name || 'None')}</div>
                            <div><span class="font-medium">Severity:</span> ${this.escapeHtml(item.severity || 'N/A')}</div>
                        </div>
                    </div>
                    <button onclick="analyzer.exportSingleReport('${this.escapeHtml(item.id)}')" 
                            class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 ml-4">
                        Export
                    </button>
                </div>
            </div>
        `;
    }

    hideHistory() {
        const modal = document.getElementById('historyModal');
        if (modal) modal.classList.add('hidden');
    }

    async exportSingleReport(analysisId) {
        if (!analysisId || !/^[a-f0-9-]{36}$/.test(analysisId)) {
            this.showNotification('Please login to export', 'error');
            return;
        }
        window.open(`/export/${encodeURIComponent(analysisId)}`, '_blank');
    }

    exportAllResults() {
        const hasIds = this.currentResults.some(r => r.id);
        if (!hasIds) {
            this.showNotification('Please login to export', 'error');
            return;
        }
        this.currentResults.forEach(result => {
            if (result.id) this.exportSingleReport(result.id);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`;
        notification.textContent = String(message).substring(0, 200);
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    saveResults(results) {
        try {
            sessionStorage.setItem('plantAnalysisResults', JSON.stringify(results));
        } catch (e) {
            console.error('Failed to save results:', e);
        }
    }

    restoreResults() {
        try {
            const saved = sessionStorage.getItem('plantAnalysisResults');
            if (saved) {
                const results = JSON.parse(saved);
                this.currentResults = results;
                this.displayResults(results);
            }
        } catch (e) {
            console.error('Failed to restore results:', e);
        }
    }

    clearResults() {
        try {
            sessionStorage.removeItem('plantAnalysisResults');
            this.currentResults = [];
            const section = document.getElementById('resultsSection');
            if (section) section.style.display = 'none';
        } catch (e) {
            console.error('Failed to clear results:', e);
        }
    }

    showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-primary', 'text-primary');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        
        const selectedTab = document.getElementById(tabName + 'Tab');
        if (selectedTab) selectedTab.classList.remove('hidden');
        
        if (event && event.target) {
            event.target.classList.remove('border-transparent', 'text-gray-500');
            event.target.classList.add('border-primary', 'text-primary');
        }
        
        this.selectedImages = [];
        this.updateAnalyzeButton();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.analyzer = new PlantAnalyzer();
});

// Global functions
function showTab(tabName) {
    if (window.analyzer) window.analyzer.showTab(tabName);
}

function startCamera() {
    if (window.analyzer) window.analyzer.startCamera();
}

function capturePhoto() {
    if (window.analyzer) window.analyzer.capturePhoto();
}

function stopCamera() {
    if (window.analyzer) window.analyzer.stopCamera();
}

function analyzeImages() {
    if (window.analyzer) window.analyzer.analyzeImages();
}

function showHistory() {
    if (window.analyzer) window.analyzer.showHistory();
}

function hideHistory() {
    if (window.analyzer) window.analyzer.hideHistory();
}

function exportAllResults() {
    if (window.analyzer) window.analyzer.exportAllResults();
}
