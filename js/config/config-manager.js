/**
 * Configuration Manager Module
 * Handles loading and managing application configuration
 */

class ConfigManager {
    constructor() {
        this.config = null;
        this.defaultConfig = {
            app: {
                title: "Online Exam Generator",
                version: "1.0.0",
                description: "AI-powered exam generation with local storage"
            },
            apis: {
                openrouter: {
                    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
                    model: "openai/gpt-3.5-turbo",
                }
            },
            scoring: {
                passingGrade: 70,
                partialCreditThreshold: 0.5,
                keywordMatchThreshold: 0.5,
                longAnswerMinLength: 50,
                longAnswerMediumLength: 150
            },
            ui: {
                maxQuestionsPerSection: 20,
                defaultQuestionsPerSection: 5,
                autoSaveInterval: 30000,
                progressUpdateInterval: 1000,
                showPreviewButton: false,
                showEditButton: false
            }
        };
    }

    /**
     * Load configuration from config.json
     * @returns {Promise<Object>} Configuration object
     */
    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            
            this.config = await response.json();
            console.log('Configuration loaded successfully:', this.config);
            
            // Merge with defaults to ensure all properties exist
            this.config = this.mergeWithDefaults(this.config);
            
            return this.config;
        } catch (error) {
            console.error('Error loading config, using defaults:', error);
            this.config = this.defaultConfig;
            return this.config;
        }
    }

    /**
     * Get the current configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
        return this.config || this.defaultConfig;
    }

    /**
     * Get OpenRouter API configuration
     * @returns {Object} OpenRouter configuration
     */
    getOpenRouterConfig() {
        const config = this.getConfig();
        return config.apis?.openrouter || this.defaultConfig.apis.openrouter;
    }



    /**
     * Merge loaded config with defaults
     * @param {Object} loadedConfig - Configuration loaded from file
     * @returns {Object} Merged configuration
     */
    mergeWithDefaults(loadedConfig) {
        return this.deepMerge(this.defaultConfig, loadedConfig);
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Update configuration at runtime
     * @param {string} path - Configuration path (e.g., 'apis.openrouter.model')
     * @param {*} value - New value
     */
    updateConfig(path, value) {
        if (!this.config) {
            this.config = { ...this.defaultConfig };
        }

        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        console.log(`Configuration updated: ${path} = ${value}`);
    }

    /**
     * Update OpenRouter model configuration
     * @param {string} modelId - The model ID to use
     */
    updateOpenRouterModel(modelId) {
        this.updateConfig('apis.openrouter.model', modelId);
    }

}

// Create and export singleton instance
const configManager = new ConfigManager();

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = configManager;
}

// For browser global
if (typeof window !== 'undefined') {
    window.ConfigManager = configManager;
}
