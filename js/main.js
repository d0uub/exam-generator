/**
 * Main Application Entry Point
 * Coordinates all modules and manages the overall application flow
 */

class ExamGeneratorApp {
    constructor() {
        // Module instances
        this.examGenerator = null;
        this.examManager = null;
        this.examRenderer = null;
        this.settingsManager = null;
        this.sectionManager = null;
        
        // Utility modules
        this.config = null;
        this.storage = null;
        this.notifications = null;
        this.openRouterAPI = null;
        
        // Application state
        this.currentExam = null;
        this.userAnswers = {};
        this.isInitialized = false;
        this.isGenerating = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Exam Generator App...');
            
            // Initialize modules in dependency order
            await this.initializeModules();
            
            // Load configuration and settings
            await this.loadConfiguration();
            
            // Initialize sub-modules
            this.initializeSubModules();
            
            // Setup UI event listeners
            this.setupEventListeners();
            
            // Restore user settings
            this.restoreSettings();
            
            // Load initial data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('Exam Generator App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.notifications?.error('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Initialize all required utility modules
     */
    async initializeModules() {
        // Storage manager (no dependencies)
        this.storage = window.StorageManager;
        
        // Notification manager (no dependencies)
        this.notifications = window.NotificationManager;
        
        // Configuration manager (no dependencies)
        this.config = window.ConfigManager;
        
        // OpenRouter API (depends on config and notifications)
        this.openRouterAPI = new window.OpenRouterAPI(this.config, this.notifications);
        
        // Validate all modules are loaded
        if (!this.storage || !this.notifications || !this.config || !this.openRouterAPI) {
            throw new Error('Failed to initialize required modules');
        }
        
        console.log('Utility modules initialized successfully');
    }

    /**
     * Initialize feature modules
     */
    initializeSubModules() {
        // Initialize feature modules with correct dependencies
        this.examGenerator = new window.ExamGenerator(this.storage, this.notifications, this.openRouterAPI);
        this.examManager = new window.ExamManager(this.storage, this.notifications);
        this.examRenderer = new window.ExamRenderer(this.notifications);
        this.settingsManager = new window.SettingsManager(this.storage, this.notifications, this.config, this.openRouterAPI);
        this.sectionManager = new window.SectionManager(this.notifications);
        
        console.log('Feature modules initialized successfully');
    }

    /**
     * Load application configuration
     */
    async loadConfiguration() {
        await this.config.loadConfig();
        console.log('Configuration loaded successfully');
    }

    /**
     * Setup event listeners for the UI
     */
    setupEventListeners() {
        // Settings management
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.settingsManager.showSettingsModal();
        });

        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.settingsManager.saveSettings();
        });

        // OpenRouter token input - fetch models when token is entered
        document.getElementById('openrouterToken')?.addEventListener('input', (e) => {
            this.settingsManager.handleOpenRouterTokenInput(e.target.value.trim());
        });

        // Exam generation
        document.getElementById('examGeneratorForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateExam();
        });

        // Section management
        document.getElementById('addSectionBtn')?.addEventListener('click', () => {
            this.sectionManager.addExamSection();
        });

        // Exam management
        document.getElementById('refreshExams')?.addEventListener('click', () => {
            this.loadExamsFromStorage();
        });

        document.getElementById('importExamsBtn')?.addEventListener('click', () => {
            this.examManager.importExams();
        });

        document.getElementById('exportExamsBtn')?.addEventListener('click', () => {
            this.examManager.exportExams();
        });

        // Save exam changes
        document.getElementById('saveExamChanges')?.addEventListener('click', () => {
            this.saveExamChanges();
        });

        // Interactive exam
        document.getElementById('takeExamBtn')?.addEventListener('click', () => {
            if (this.currentExam) {
                this.takeExam(this.currentExam.id);
            }
        });

        document.getElementById('submitExamBtn')?.addEventListener('click', () => {
            this.submitExam();
        });

        // Delegated event listeners
        document.addEventListener('click', (e) => {
            // Find the closest exam action button (if any)
            const actionButton = e.target.closest('.exam-action-btn');
            if (actionButton) {
                const action = actionButton.getAttribute('data-action');
                const examId = actionButton.getAttribute('data-exam-id');
                
                switch (action) {
                    case 'preview':
                        this.previewExam(examId);
                        break;
                    case 'edit':
                        this.editExam(examId);
                        break;
                    case 'take':
                        this.takeExam(examId);
                        break;
                    case 'delete':
                        this.deleteExam(examId);
                        break;
                }
            }
            
            // Delete section button
            if (e.target && e.target.classList.contains('delete-section-btn')) {
                const sectionElement = e.target.closest('.exam-section');
                if (sectionElement && document.querySelectorAll('.exam-section').length > 1) {
                    sectionElement.remove();
                    this.sectionManager.updateSectionNumbers();
                } else {
                    this.notifications.warning('At least one section is required');
                }
            }

            // Note: Exam selection UI has been removed - actions are now directly on each exam
        });

        // Section type change handler
        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('section-type')) {
                this.sectionManager.handleTypeChange(e.target.closest('.exam-section'), e.target.value);
            }
        });        console.log('Event listeners setup complete');
    }

    /**
     * Restore user settings from storage
     */
    restoreSettings() {
        this.settingsManager.restoreSettings();
        console.log('Settings restored');
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        // Initialize sections with a default section
        this.sectionManager.initializeSections();
        
        // Load existing exams
        this.loadExamsFromStorage();
        
        console.log('Initial data loaded');
    }

    /**
     * Generate exam using the current form data
     */
    async generateExam() {
        // Prevent double submission
        if (this.isGenerating) {
            return;
        }
        
        try {
            this.isGenerating = true;
            const formData = this.collectFormData();
            if (!this.validateFormData(formData)) {
                return;
            }

            const exam = await this.examGenerator.generateExam(formData);
            
            if (exam) {
                this.currentExam = exam;
                this.examRenderer.renderExamPreview(exam);
                this.showExamPreview();
                // ExamManager handles refreshing the list via examGenerated event
            }
            
        } catch (error) {
            console.error('Error generating exam:', error);
            this.notifications.error('Failed to generate exam. Please try again.');
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Collect form data from the UI
     */
    collectFormData() {
        const formData = {
            subject: document.getElementById('subject')?.value || '',
            sections: this.sectionManager.getSectionData()
        };

        return formData;
    }

    /**
     * Validate form data
     */
    validateFormData(formData) {
        if (!formData.subject.trim()) {
            this.notifications.error('Please enter a subject');
            return false;
        }

        if (!formData.sections || formData.sections.length === 0) {
            this.notifications.error('Please add at least one section');
            return false;
        }

        return this.sectionManager.validateSections();
    }

    /**
     * Edit an existing exam
     */
    editExam(examId) {
        // Use ExamManager to edit the exam
        const exam = this.examManager.editExam(
            examId,
            document.getElementById('editExamContent'),
            this.examRenderer
        );
        
        if (exam) {
            this.currentExam = exam;
            this.showEditExamScreen();
        }
    }

    /**
     * Save changes made in the edit exam modal
     */
    saveExamChanges() {
        try {
            const editExamTextarea = document.getElementById('editExamTextarea');
            if (!editExamTextarea) {
                this.notifications.error('Could not find exam data to save');
                return;
            }

            // Parse the JSON content from the textarea
            const editedExam = JSON.parse(editExamTextarea.value);
            
            // Use ExamManager to save the changes
            const success = this.examManager.saveExamChanges(editedExam);
            
            if (success) {
                // Update current exam reference
                this.currentExam = editedExam;
                
                // Refresh the exams list
                this.loadExamsFromStorage();
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editExamModal'));
                if (modal) {
                    modal.hide();
                }
            }
        } catch (error) {
            console.error('Error saving exam changes:', error);
            this.notifications.error('Failed to save exam changes: ' + error.message);
        }
    }

    /**
     * Show the edit exam screen in a modal
     */
    showEditExamScreen() {
        const modal = new bootstrap.Modal(document.getElementById('editExamModal'));
        modal.show();
    }

    /**
     * Populate form with exam data for editing
     */
    populateFormWithExam(exam) {
        document.getElementById('subject').value = exam.subject || '';
        
        // Populate sections
        this.sectionManager.populateSections(exam.sections || []);
    }

    /**
     * Take an exam interactively
     */
    takeExam(examId) {
        // Use ExamManager to take the exam
        const exam = this.examManager.takeExam(
            examId, 
            document.getElementById('takeExamContent'),
            this.examRenderer
        );
        
        if (exam) {
            this.currentExam = exam;
            this.showInteractiveExam();
        }
    }

    // Event listeners and UI management methods continue below...

    /**
     * Submit the interactive exam
     */
    submitExam() {
        if (!this.currentExam) {
            this.notifications.error("No active exam to submit");
            return;
        }

        try {
            // Use ExamRenderer to submit the exam
            const results = this.examRenderer.submitExam();
            
            if (results) {
                // Render results in the same modal
                const takeExamContent = document.getElementById('takeExamContent');
                if (takeExamContent) {
                    takeExamContent.innerHTML = this.examRenderer.renderExamResults(results, this.currentExam);
                    
                    // Change submit button to "Close" after submission
                    const submitButton = document.getElementById('submitExamBtn');
                    if (submitButton) {
                        submitButton.textContent = 'Close';
                        submitButton.className = 'btn btn-primary';
                        submitButton.removeEventListener('click', this.submitExam);
                        submitButton.addEventListener('click', () => {
                            const modal = bootstrap.Modal.getInstance(document.getElementById('takeExamModal'));
                            if (modal) modal.hide();
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error submitting exam:', error);
            this.notifications.error('Error processing exam results: ' + error.message);
        }
    }

    // UI display methods

    /**
     * Load exams from storage and display them
     */
    loadExamsFromStorage() {
        this.examManager.loadExamsFromStorage();
    }

    /**
     * Preview an exam
     */
    previewExam(examId) {
        // Use ExamManager to preview the exam
        const exam = this.examManager.previewExam(
            examId,
            document.getElementById('examPreviewContent'),
            this.examRenderer
        );
        
        if (exam) {
            this.currentExam = exam;
            this.showExamPreview();
        }
    }

    /**
     * Delete an exam
     */
    async deleteExam(examId) {
        const confirmed = confirm('Are you sure you want to delete this exam?');
        if (confirmed) {
            this.examManager.deleteExam(examId);
        }
    }

    // UI State Management Methods
    showExamPreview() {
        const modal = new bootstrap.Modal(document.getElementById('examPreviewModal'));
        modal.show();
    }

    showInteractiveExam() {
        const modal = new bootstrap.Modal(document.getElementById('takeExamModal'));
        modal.show();
    }

    showExamResults() {
        // Results are shown in the same modal as the interactive exam
        // The exam renderer handles updating the modal content
    }

    showExamForm() {
        // Close any open modals to show the main form
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
        // Scroll to the top of the form
        document.getElementById('examGeneratorForm').scrollIntoView({ behavior: 'smooth' });
    }

    showExamGenerator() {
        // Close any open modals and return to main generator view
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }

    showLoadingSpinner() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    hideLoadingSpinner() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.examApp = new ExamGeneratorApp();
});

// For debugging
if (typeof window !== 'undefined') {
    window.ExamGeneratorApp = ExamGeneratorApp;
}
