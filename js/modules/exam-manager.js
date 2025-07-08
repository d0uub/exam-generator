/**
 * Exam Manager Module
 * Handles exam storage, loading, listing, and basic CRUD operations
 */

class ExamManager {
    constructor(storage, notifications, config) {
        this.storage = storage;
        this.notifications = notifications;
        this.config = config;
        this.currentExam = null;
        
        // Listen for exam generation events
        window.addEventListener('examGenerated', (e) => {
            this.loadExamsFromStorage();
        });
    }

    /**
     * Load exams from storage and display them
     */
    async loadExamsFromStorage() {
        const examsList = document.getElementById('examsList');
        if (!examsList) return;

        const exams = this.storage.getExams();
        
        if (exams.length === 0) {
            examsList.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-clipboard-list fa-3x mb-3"></i>
                    <p>No exams found. Generate your first exam to get started.</p>
                </div>
            `;
            return;
        }

        let html = '';
        exams.forEach((exam, index) => {
            const sectionCount = exam.sections?.length || 0;
            const questionCount = exam.sections?.reduce((total, section) => 
                total + (section.questions?.length || 0), 0) || 0;

            html += `
                <div class="exam-item" data-exam-id="${exam.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="exam-content flex-grow-1" data-exam-id="${exam.id}">
                            <h6 class="exam-title">${exam.title}</h6>
                            <div class="exam-meta mb-2">
                                <span class="badge bg-primary me-1">${exam.subject}</span>
                                <span class="badge bg-secondary me-1">${exam.topic}</span>
                                <small class="text-muted">
                                    ${sectionCount} sections • ${questionCount} questions
                                </small>
                            </div>
                            <small class="text-muted">
                                Created: ${new Date(exam.createdAt).toLocaleDateString()}
                            </small>
                        </div>
                        <div class="exam-actions">
                            ${this.shouldShowPreviewButton() ? `
                                <button class="btn btn-outline-primary btn-sm me-1 exam-action-btn" data-action="preview" data-exam-id="${exam.id}">
                                    <i class="fas fa-eye"></i> Preview
                                </button>
                            ` : ''}
                            ${this.shouldShowEditButton() ? `
                                <button class="btn btn-outline-secondary btn-sm me-1 exam-action-btn" data-action="edit" data-exam-id="${exam.id}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            ` : ''}
                            <button class="btn btn-outline-success btn-sm me-1 exam-action-btn" data-action="take" data-exam-id="${exam.id}">
                                <i class="fas fa-play"></i> Take
                            </button>
                            <button class="btn btn-outline-danger btn-sm exam-action-btn" data-action="delete" data-exam-id="${exam.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        examsList.innerHTML = html;
    }

    /**
     * Export exams to JSON file
     */
    exportExams() {
        const exams = this.storage.getExams();
        if (exams.length === 0) {
            this.notifications.warning('No exams to export');
            return;
        }

        const dataStr = JSON.stringify(exams, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `exams_export_${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.notifications.success('Exams exported successfully');
    }

    /**
     * Import exams from JSON file
     */
    importExams() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedExams = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedExams)) {
                        throw new Error('Invalid file format');
                    }
                    
                    // Validate exam structure
                    importedExams.forEach((exam, index) => {
                        if (!exam.title || !exam.sections) {
                            throw new Error(`Invalid exam structure at index ${index}`);
                        }
                    });
                    
                    // Import exams
                    importedExams.forEach(exam => {
                        exam.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        exam.createdAt = new Date().toISOString();
                        this.storage.addExam(exam);
                    });
                    
                    this.notifications.success(`Imported ${importedExams.length} exams successfully`);
                    this.loadExamsFromStorage();
                    
                } catch (error) {
                    console.error('Import error:', error);
                    this.notifications.error('Failed to import exams: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    /**
     * Get current exam
     */
    getCurrentExam() {
        return this.currentExam;
    }

    /**
     * Set current exam
     */
    setCurrentExam(exam) {
        this.currentExam = exam;
    }

    /**
     * Get all exams from storage
     */
    getAllExams() {
        return this.storage.getExams();
    }

    /**
     * Get a specific exam by ID
     */
    getExam(examId) {
        return this.storage.getExamById(examId);
    }

    /**
     * Add a new exam
     */
    addExam(examData) {
        return this.storage.addExam(examData);
    }

    /**
     * Update an existing exam
     */
    updateExam(examData) {
        return this.storage.updateExam(examData);
    }

    /**
     * Remove an exam
     */
    removeExam(examId) {
        return this.storage.removeExam(examId);
    }

    /**
     * Take an exam interactively
     * @param {string} examId - ID of the exam to take
     * @param {Element} containerElement - DOM element to render the exam in
     * @param {Object} examRenderer - ExamRenderer instance
     * @returns {Object} - The exam object
     */
    takeExam(examId, containerElement, examRenderer) {
        const exam = this.getExam(examId) || this.currentExam;
        if (!exam) {
            this.notifications.error("Exam not found");
            return null;
        }
        
        // Set current exam
        this.setCurrentExam(exam);
        
        // Use the ExamRenderer to start the exam
        if (examRenderer) {
            examRenderer.startExam(exam, containerElement);
        }
        
        return exam;
    }

    /**
     * Preview an exam
     * @param {string} examId - ID of the exam to preview
     * @param {Element} containerElement - DOM element to render the exam preview in
     * @param {Object} examRenderer - ExamRenderer instance
     */
    previewExam(examId, containerElement, examRenderer) {
        const exam = this.getExam(examId);
        if (!exam) {
            this.notifications.error("Exam not found");
            return null;
        }
        
        // Set current exam
        this.setCurrentExam(exam);
        
        // Use the ExamRenderer to render a preview
        if (containerElement && examRenderer) {
            const previewContent = examRenderer.renderExamPreview(exam);
            containerElement.innerHTML = previewContent;
        }
        
        return exam;
    }
    
    /**
     * Edit an exam
     * @param {string} examId - ID of the exam to edit
     * @param {Element} containerElement - DOM element to render the editable exam in
     * @param {Object} examRenderer - ExamRenderer instance
     */
    editExam(examId, containerElement, examRenderer) {
        const exam = this.getExam(examId);
        if (!exam) {
            this.notifications.error("Exam not found");
            return null;
        }
        
        // Set current exam
        this.setCurrentExam(exam);
        
        // Use the ExamRenderer to render an editable exam
        if (containerElement && examRenderer) {
            const editableContent = examRenderer.renderExamEditable(exam);
            containerElement.innerHTML = editableContent;
        }
        
        return exam;
    }
    
    /**
     * Save changes to an edited exam
     * @param {Object} editedExam - The edited exam object
     */
    saveExamChanges(editedExam) {
        try {
            // Validate essential properties
            if (!editedExam.id || !editedExam.title) {
                this.notifications.error('Invalid exam data: Missing required fields');
                return false;
            }

            // Update the exam in storage
            this.updateExam(editedExam);
            
            // Update current exam reference
            this.currentExam = editedExam;
            
            // Refresh the exams list
            this.loadExamsFromStorage();
            
            this.notifications.success('Exam updated successfully');
            return true;
            
        } catch (error) {
            console.error('Error saving exam changes:', error);
            this.notifications.error('Failed to save exam changes: ' + error.message);
            return false;
        }
    }
    
    /**
     * Delete an exam
     * @param {string} examId - ID of the exam to delete
     * @returns {boolean} - Success or failure
     */
    deleteExam(examId) {
        try {
            this.removeExam(examId);
            this.loadExamsFromStorage();
            this.notifications.success('Exam deleted successfully');
            return true;
        } catch (error) {
            console.error('Error deleting exam:', error);
            this.notifications.error('Failed to delete exam');
            return false;
        }
    }

    /**
     * Check if Preview button should be shown based on configuration
     * @returns {boolean} True if Preview button should be shown
     */
    shouldShowPreviewButton() {
        // Check user settings in storage first, then fall back to config
        const uiSettings = this.storage.getUISettings();
        if (uiSettings.showPreviewButton !== undefined) {
            return uiSettings.showPreviewButton;
        }
        
        // Fallback to config
        if (!this.config) return true; // Default to showing if no config
        const config = this.config.getConfig();
        return config?.ui?.showPreviewButton !== false; // Default to true if not explicitly set to false
    }

    /**
     * Check if Edit button should be shown based on configuration
     * @returns {boolean} True if Edit button should be shown
     */
    shouldShowEditButton() {
        // Check user settings in storage first, then fall back to config
        const uiSettings = this.storage.getUISettings();
        if (uiSettings.showEditButton !== undefined) {
            return uiSettings.showEditButton;
        }
        
        // Fallback to config
        if (!this.config) return true; // Default to showing if no config
        const config = this.config.getConfig();
        return config?.ui?.showEditButton !== false; // Default to true if not explicitly set to false
    }
}

// Export for use in other modules
window.ExamManager = ExamManager;
