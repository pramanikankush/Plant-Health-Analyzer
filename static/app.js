// Enhanced functionality for the Plant Health Analyzer

class PlantAnalyzer {
    constructor() {
        this.selectedImages = [];
        this.cameraStream = null;
        this.currentResults = [];
        this.translations = {
            en: {
                fileUpload: 'File Upload',
                camera: 'Camera',
                batchUpload: 'Batch Upload',
                selectImages: 'Select Images',
                analyzeImages: 'Analyze Images',
                uploadImages: 'Upload Images',
                history: 'History'
            },
            hi: {
                fileUpload: 'फ़ाइल अपलोड',
                camera: 'कैमरा',
                batchUpload: 'बैच अपलोड',
                selectImages: 'छवियां चुनें',
                analyzeImages: 'छवियों का विश्लेषण करें',
                uploadImages: 'छवियां अपलोड करें',
                history: 'इतिहास'
            }
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateLanguage();
    }

    setupEventListeners() {
        // File input handlers
        document.getElementById('file-upload')?.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        document.getElementById('batchInput')?.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Drag and drop
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
        this.selectedImages = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );
        this.showImagePreview();
        this.updateUI();
        
        // Auto-scroll to analyze button after image upload
        if (this.selectedImages.length > 0) {
            setTimeout(() => {
                document.getElementById('analyzeBtn').scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 500);
        }
    }

    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            const video = document.getElementById('cameraPreview');
            video.srcObject = this.cameraStream;
            video.play();
            
            this.updateCameraUI(true);
        } catch (err) {
            this.showNotification('Camera access denied or not available', 'error');
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
            this.updateUI();
            this.showNotification('Photo captured successfully!', 'success');
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
        
        video.style.display = active ? 'block' : 'none';
        captureBtn.style.display = active ? 'inline-flex' : 'none';
        stopBtn.style.display = active ? 'inline-flex' : 'none';
        cameraIcon.style.display = active ? 'none' : 'block';
    }

    async analyzeImages() {
        if (this.selectedImages.length === 0) return;

        const formData = new FormData();
        this.selectedImages.forEach(file => formData.append('images', file));
        
        // Add language parameter
        const currentLang = 'en'; // Default to English
        formData.append('language', currentLang);

        try {
            this.setAnalyzing(true);
            
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            this.currentResults = data.results;
            this.displayResults(data.results);
            this.showNotification('Analysis completed!', 'success');
            
            // Auto-scroll to results after analysis
            setTimeout(() => {
                document.getElementById('resultsSection').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 500);
            
        } catch (error) {
            this.showNotification('Analysis failed: ' + error.message, 'error');
        } finally {
            this.setAnalyzing(false);
        }
    }

    setAnalyzing(analyzing) {
        const btn = document.getElementById('analyzeBtn');
        
        if (analyzing) {
            btn.innerHTML = '<span class="material-icons animate-spin">hourglass_empty</span>Analyzing...';
            btn.disabled = true;
            btn.classList.add('bg-slate-400', 'dark:bg-slate-600', 'cursor-not-allowed');
            btn.classList.remove('bg-primary', 'hover:bg-green-600');
        } else {
            btn.innerHTML = '<span class="material-icons">science</span>Analyze Images';
            this.updateAnalyzeButton();
        }
    }

    updateAnalyzeButton() {
        const btn = document.getElementById('analyzeBtn');
        const hasImages = this.selectedImages.length > 0;
        
        if (hasImages) {
            btn.disabled = false;
            btn.classList.remove('bg-slate-400', 'dark:bg-slate-600', 'cursor-not-allowed');
            btn.classList.add('bg-primary', 'hover:bg-green-600', 'cursor-pointer');
        } else {
            btn.disabled = true;
            btn.classList.add('bg-slate-400', 'dark:bg-slate-600', 'cursor-not-allowed');
            btn.classList.remove('bg-primary', 'hover:bg-green-600', 'cursor-pointer');
        }
        
        // Update batch preview if in batch mode
        const batchPreview = document.getElementById('batchPreview');
        if (batchPreview && this.selectedImages.length > 0) {
            this.showBatchPreview();
        }
    }

    displayResults(results) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';

        results.forEach(result => {
            const resultCard = this.createResultCard(result);
            container.appendChild(resultCard);
        });

        document.getElementById('resultsSection').style.display = 'block';
        
        // Auto-scroll to results
        setTimeout(() => {
            document.getElementById('resultsSection').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
    }

    createResultCard(result) {
        const div = document.createElement('div');
        div.className = 'result-card border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4 bg-surface-light dark:bg-surface-dark shadow-sm';
        
        if (result.error) {
            div.innerHTML = `
                <h3 class="font-semibold text-red-600">${result.filename}</h3>
                <p class="text-red-500">Error: ${result.error}</p>
            `;
        } else {
            const severity = result.parsed.severity?.toLowerCase();
            const severityColor = severity === 'severe' ? 'text-red-600' : 
                                 severity === 'moderate' ? 'text-yellow-600' : 'text-green-600';
            
            div.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <h3 class="font-semibold text-lg text-text-light dark:text-text-dark">${result.filename}</h3>
                    <button onclick="analyzer.exportSingleReport('${result.id}')" 
                            class="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        <span class="material-icons text-sm">download</span> Export PDF
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div class="flex items-center gap-2">
                        <span class="material-icons text-primary">eco</span>
                        <span class="font-medium">Plant Type:</span> 
                        <span class="text-text-light dark:text-text-dark">${result.parsed.plant_type || 'Unknown'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="material-icons text-primary">favorite</span>
                        <span class="font-medium">Health Status:</span> 
                        <span class="${result.parsed.health_status === 'Healthy' ? 'text-green-600' : 'text-red-600'}">
                            ${result.parsed.health_status || 'Unknown'}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="material-icons text-primary">bug_report</span>
                        <span class="font-medium">Disease:</span> 
                        <span class="text-text-light dark:text-text-dark">${result.parsed.disease_name || 'None detected'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="material-icons text-primary">warning</span>
                        <span class="font-medium">Severity:</span> 
                        <span class="${severityColor}">${result.parsed.severity || 'N/A'}</span>
                    </div>
                </div>
                <div class="mt-4 space-y-3">
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="material-icons text-primary">search</span>
                            <span class="font-medium text-text-light dark:text-text-dark">Symptoms:</span>
                        </div>
                        <div class="text-muted-light dark:text-muted-dark text-sm whitespace-pre-line">${result.parsed.symptoms || 'No symptoms detected'}</div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="material-icons text-primary">medical_services</span>
                            <span class="font-medium text-text-light dark:text-text-dark">Treatment:</span>
                        </div>
                        <div class="text-muted-light dark:text-muted-dark text-sm whitespace-pre-line">${result.parsed.treatment || 'No treatment needed'}</div>
                    </div>
                    ${result.parsed.medicines ? `
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="material-icons text-blue-600">medication</span>
                            <span class="font-medium text-lg text-text-light dark:text-text-dark">Required Medicines & Prices</span>
                        </div>
                        <div class="medicine-list">
                            ${this.parseMedicines(result.parsed.medicines)}
                        </div>
                        <p class="text-xs text-blue-600 dark:text-blue-400 mt-3 italic">💡 Prices are approximate and may vary by location and supplier</p>
                    </div>
                    ` : ''}
                    ${result.parsed.cost_estimate ? `
                    <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="material-icons text-green-600">currency_rupee</span>
                            <span class="font-medium text-lg text-text-light dark:text-text-dark">Estimated Treatment Cost</span>
                        </div>
                        <p class="text-green-600 dark:text-green-400 text-2xl font-bold">${result.parsed.cost_estimate}</p>
                        <p class="text-xs text-green-600 dark:text-green-400 mt-2">💰 This includes all medicines and application costs</p>
                        <p class="text-xs text-muted-light dark:text-muted-dark mt-1">*Actual prices may vary by location and supplier</p>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        return div;
    }

    async showHistory() {
        try {
            const response = await fetch('/history');
            const history = await response.json();
            
            const container = document.getElementById('historyContainer');
            container.innerHTML = '';
            
            if (history.length === 0) {
                container.innerHTML = '<p class="text-muted-light dark:text-muted-dark text-center py-8">No analysis history found</p>';
            } else {
                history.forEach(item => {
                    const historyItem = this.createHistoryItem(item);
                    container.appendChild(historyItem);
                });
            }
            
            document.getElementById('historyModal').classList.remove('hidden');
        } catch (error) {
            this.showNotification('Failed to load history', 'error');
        }
    }

    createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = 'border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 last:border-b-0';
        
        const date = new Date(item.timestamp).toLocaleString();
        const statusColor = item.health_status === 'Healthy' ? 'text-green-600' : 'text-red-600';
        
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-semibold text-lg text-text-light dark:text-text-dark">${item.image_name}</h4>
                    <p class="text-sm text-muted-light dark:text-muted-dark mb-3">${date}</p>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-primary text-sm">eco</span>
                            <span class="font-medium">Plant:</span> 
                            <span class="text-text-light dark:text-text-dark">${item.plant_type}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-primary text-sm">favorite</span>
                            <span class="font-medium">Status:</span> 
                            <span class="${statusColor}">${item.health_status}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-primary text-sm">bug_report</span>
                            <span class="font-medium">Disease:</span> 
                            <span class="text-text-light dark:text-text-dark">${item.disease_name || 'None'}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-primary text-sm">warning</span>
                            <span class="font-medium">Severity:</span> 
                            <span class="text-text-light dark:text-text-dark">${item.severity || 'N/A'}</span>
                        </div>
                        ${item.medicines ? `
                        <div class="col-span-2 mt-2">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="material-icons text-blue-600 text-sm">medication</span>
                                <span class="font-medium text-sm">Medicines:</span>
                            </div>
                            <p class="text-xs text-muted-light dark:text-muted-dark">${item.medicines.substring(0, 100)}...</p>
                        </div>
                        ` : ''}
                        ${item.cost_estimate ? `
                        <div class="flex items-center gap-2">
                            <span class="material-icons text-green-600 text-sm">currency_rupee</span>
                            <span class="font-medium">Cost:</span> 
                            <span class="text-green-600 dark:text-green-400 font-semibold">${item.cost_estimate}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <button onclick="analyzer.exportSingleReport('${item.id}')" 
                        class="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 ml-4">
                    <span class="material-icons text-sm">download</span> Export
                </button>
            </div>
        `;
        return div;
    }

    hideHistory() {
        document.getElementById('historyModal').classList.add('hidden');
    }

    async exportSingleReport(analysisId) {
        try {
            window.open(`/export/${analysisId}`, '_blank');
        } catch (error) {
            this.showNotification('Export failed', 'error');
        }
    }

    exportAllResults() {
        this.currentResults.forEach(result => {
            if (result.id) this.exportSingleReport(result.id);
        });
    }

    updateLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const currentLang = urlParams.get('lang') || 'en';
        // Language selector not implemented in current template
    }

    changeLanguage(lang) {
        window.location.href = `/?lang=${lang}`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showImagePreview() {
        const preview = document.getElementById('imagePreview');
        const container = document.getElementById('previewContainer');
        
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
            img.className = 'w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700';
            img.alt = file.name;
            
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity';
            
            const fileName = document.createElement('p');
            fileName.className = 'text-white text-xs text-center px-2';
            fileName.textContent = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<span class="material-icons text-sm">close</span>';
            removeBtn.className = 'absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700';
            removeBtn.onclick = () => this.removeImage(index);
            
            overlay.appendChild(fileName);
            div.appendChild(img);
            div.appendChild(overlay);
            div.appendChild(removeBtn);
            container.appendChild(div);
        });
    }

    parseMedicines(medicinesText) {
        if (!medicinesText) return '';
        
        // Clean HTML entities first
        medicinesText = medicinesText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        
        // Split by common delimiters and filter
        const medicines = medicinesText.split(/[\n*•-]/).filter(item => {
            const trimmed = item.trim();
            return trimmed && (trimmed.includes('₹') || trimmed.includes('ml/L') || trimmed.includes('g/L') || trimmed.includes('EC') || trimmed.includes('WP'));
        });
        
        let html = '<div class="space-y-2">';
        
        medicines.forEach(medicine => {
            const trimmed = medicine.trim();
            if (trimmed) {
                // Extract price
                const priceMatch = trimmed.match(/₹\s*\d+/g);
                const price = priceMatch ? priceMatch[0].replace(/\s+/g, '') : '';
                
                // Extract medicine name (everything before the price or dosage info)
                let name = trimmed;
                if (price) {
                    name = name.replace(priceMatch[0], '').trim();
                }
                
                // Clean up name
                name = name.replace(/^[*•-]\s*/, '').replace(/\s*-\s*$/, '').trim();
                
                if (name && name.length > 3) {
                    // Determine medicine type
                    let icon = 'local_pharmacy';
                    let iconColor = 'text-blue-600';
                    let category = 'Medicine';
                    
                    const lowerName = name.toLowerCase();
                    if (lowerName.includes('fungicide') || lowerName.includes('antracol') || lowerName.includes('propineb')) {
                        icon = 'shield';
                        iconColor = 'text-green-600';
                        category = 'Fungicide';
                    } else if (lowerName.includes('miticide') || lowerName.includes('omite') || lowerName.includes('propargite')) {
                        icon = 'pest_control';
                        iconColor = 'text-red-600';
                        category = 'Miticide';
                    } else if (lowerName.includes('oil') || lowerName.includes('spray')) {
                        icon = 'water_drop';
                        iconColor = 'text-blue-600';
                        category = 'Spray Oil';
                    } else if (lowerName.includes('fertilizer') || lowerName.includes('npk')) {
                        icon = 'grass';
                        iconColor = 'text-yellow-600';
                        category = 'Fertilizer';
                    }
                    
                    html += `
                        <div class="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
                            <div class="flex items-start gap-3">
                                <span class="material-icons ${iconColor} text-lg mt-0.5">${icon}</span>
                                <div>
                                    <div class="text-sm font-medium text-text-light dark:text-text-dark">${name}</div>
                                    <div class="text-xs text-muted-light dark:text-muted-dark">${category}</div>
                                </div>
                            </div>
                            ${price ? `<span class="text-green-600 dark:text-green-400 font-bold text-sm bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">${price}</span>` : '<span class="text-gray-500 text-xs">Price varies</span>'}
                        </div>
                    `;
                }
            }
        });
        
        html += '</div>';
        return html;
    }

    updateUI() {
        this.updateAnalyzeButton();
    }

    showBatchPreview() {
        const preview = document.getElementById('batchPreview');
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
        this.updateUI();
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-primary', 'text-primary');
            btn.classList.add('border-transparent', 'text-muted-light', 'dark:text-muted-dark');
        });
        
        // Show selected tab
        document.getElementById(tabName + 'Tab').classList.remove('hidden');
        event.target.classList.remove('border-transparent', 'text-muted-light', 'dark:text-muted-dark');
        event.target.classList.add('border-primary', 'text-primary');
        
        // Reset selected images when switching tabs
        this.selectedImages = [];
        this.updateUI();
    }
}

// Initialize the analyzer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analyzer = new PlantAnalyzer();
});

// Global functions for HTML onclick handlers
function showTab(tabName) {
    window.analyzer.showTab(tabName);
}

function startCamera() {
    window.analyzer.startCamera();
}

function capturePhoto() {
    window.analyzer.capturePhoto();
}

function stopCamera() {
    window.analyzer.stopCamera();
}

function analyzeImages() {
    window.analyzer.analyzeImages();
}

function showHistory() {
    window.analyzer.showHistory();
}

function hideHistory() {
    window.analyzer.hideHistory();
}

function exportAllResults() {
    window.analyzer.exportAllResults();
}