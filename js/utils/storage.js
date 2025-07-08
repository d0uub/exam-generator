/**
 * Storage Utility Module
 * Handles localStorage operations for the exam application
 */

class StorageManager {
    constructor() {
        this.keys = {
            OPENROUTER_TOKEN: 'openrouterToken',
            EXAMS_LIST: 'examsList',
            USER_PREFERENCES: 'userPreferences'
        };
    }

    /**
     * Save OpenRouter token
     * @param {string} token - OpenRouter API token
     */
    saveOpenRouterToken(token) {
        this.setItem(this.keys.OPENROUTER_TOKEN, token);
    }

    /**
     * Get OpenRouter token
     * @returns {string} OpenRouter API token
     */
    getOpenRouterToken() {
        return this.getItem(this.keys.OPENROUTER_TOKEN, '');
    }

    /**
     * Save exam list
     * @param {Array} exams - Array of exam objects
     */
    saveExams(exams) {
        this.setItem(this.keys.EXAMS_LIST, JSON.stringify(exams));
    }

    /**
     * Get exam list
     * @returns {Array} Array of exam objects
     */
    getExams() {
        const exams = this.getItem(this.keys.EXAMS_LIST, '[]');
        return JSON.parse(exams);
    }

    /**
     * Add a single exam to the list
     * @param {Object} exam - Exam object
     */
    addExam(exam) {
        const exams = this.getExams();
        exam.id = exam.id || Date.now().toString();
        exam.createdAt = exam.createdAt || new Date().toISOString();
        exams.push(exam);
        this.saveExams(exams);
        return exam.id;
    }

    /**
     * Remove exam by ID
     * @param {string} examId - Exam ID to remove
     */
    removeExam(examId) {
        const exams = this.getExams();
        const filteredExams = exams.filter(exam => exam.id !== examId);
        this.saveExams(filteredExams);
    }

    /**
     * Get exam by ID
     * @param {string} examId - Exam ID
     * @returns {Object|null} Exam object or null if not found
     */
    getExamById(examId) {
        const exams = this.getExams();
        return exams.find(exam => exam.id === examId) || null;
    }

    /**
     * Clear all stored tokens
     */
    clearTokens() {
        this.removeItem(this.keys.OPENROUTER_TOKEN);
    }

    /**
     * Check if tokens are configured
     * @returns {Object} Status of token configuration
     */
    getTokenStatus() {
        return {
            hasOpenRouter: !!this.getOpenRouterToken()
        };
    }

    /**
     * Save selected AI model
     * @param {string} model - Selected AI model ID
     */
    saveSelectedModel(model) {
        const preferences = this.getPreferences();
        preferences.selectedModel = model;
        this.savePreferences(preferences);
    }

    /**
     * Get selected AI model
     * @returns {string} Selected AI model ID
     */
    getSelectedModel() {
        const preferences = this.getPreferences();
        return preferences.selectedModel || '';
    }

    /**
     * Save user preferences
     * @param {Object} preferences - User preferences object
     */
    savePreferences(preferences) {
        this.setItem(this.keys.USER_PREFERENCES, JSON.stringify(preferences));
    }

    /**
     * Get user preferences
     * @returns {Object} User preferences object
     */
    getPreferences() {
        const prefs = this.getItem(this.keys.USER_PREFERENCES, '{}');
        return JSON.parse(prefs);
    }

    /**
     * Save UI settings to preferences
     * @param {Object} uiSettings - UI settings object
     */
    saveUISettings(uiSettings) {
        const preferences = this.getPreferences();
        preferences.uiSettings = uiSettings;
        this.savePreferences(preferences);
    }

    /**
     * Get UI settings from preferences
     * @returns {Object} UI settings object
     */
    getUISettings() {
        const preferences = this.getPreferences();
        return preferences.uiSettings || {
            showPreviewButton: true, // Default values
            showEditButton: true
        };
    }

    /**
     * Generic localStorage setter
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     */
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    /**
     * Generic localStorage getter
     * @param {string} key - Storage key
     * @param {string} defaultValue - Default value if key not found
     * @returns {string} Stored value or default
     */
    getItem(key, defaultValue = '') {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
        }
    }

    /**
     * Clear all application data
     */
    clearAll() {
        Object.values(this.keys).forEach(key => {
            this.removeItem(key);
        });
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage usage information
     */
    getStorageStats() {
        const stats = {
            totalKeys: 0,
            totalSize: 0,
            keyDetails: {}
        };

        Object.entries(this.keys).forEach(([name, key]) => {
            const value = this.getItem(key);
            if (value) {
                stats.totalKeys++;
                stats.totalSize += value.length;
                stats.keyDetails[name] = {
                    key,
                    size: value.length,
                    hasData: !!value
                };
            }
        });

        return stats;
    }

    /**
     * Get all exams (alias for getExams for consistency)
     * @returns {Array} Array of exam objects
     */
    getAllExams() {
        return this.getExams();
    }

    /**
     * Update an existing exam
     * @param {Object} updatedExam - Updated exam object
     * @returns {boolean} True if update successful
     */
    updateExam(updatedExam) {
        const exams = this.getExams();
        const index = exams.findIndex(exam => exam.id === updatedExam.id);
        
        if (index !== -1) {
            exams[index] = updatedExam;
            this.saveExams(exams);
            return true;
        }
        
        return false;
    }
}

// Create and export singleton instance
const storageManager = new StorageManager();

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = storageManager;
}

// For browser global
if (typeof window !== 'undefined') {
    window.StorageManager = storageManager;
}
