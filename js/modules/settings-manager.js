/**
 * Settings Manager Module
 * Handles settings modal, API configuration, and model selection
 */

class SettingsManager {
    constructor(storage, notifications, config, openRouterAPI) {
        this.storage = storage;
        this.notifications = notifications;
        this.config = config;
        this.openRouterAPI = openRouterAPI;
    }

    /**
     * Show settings modal with current configuration
     */
    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;

        // Load current values
        const openrouterInput = document.getElementById('openrouterToken');
        const modelSelect = document.getElementById('modelSelect');
        const showPreviewButton = document.getElementById('showPreviewButton');
        const showEditButton = document.getElementById('showEditButton');
        
        if (openrouterInput) {
            const token = this.storage.getOpenRouterToken();
            const savedModel = this.storage.getSelectedModel();
            
            openrouterInput.value = token;
            openrouterInput.placeholder = token ? '••••••••••••••••••••••••••••••••••••••••' : 'Enter your OpenRouter API token';
            
            // Restore saved model selection if available
            if (modelSelect && savedModel) {
                modelSelect.value = savedModel;
            }
            
            // If token exists, load models
            if (token) {
                this.handleOpenRouterTokenInput(token);
            }
        }

        // Load UI settings from storage (preferred) or config (fallback)
        const uiSettings = this.storage.getUISettings();
        const config = this.config.getConfig();
        
        if (showPreviewButton) {
            showPreviewButton.checked = uiSettings.showPreviewButton !== undefined ? 
                uiSettings.showPreviewButton : 
                (config?.ui?.showPreviewButton !== false);
        }
        if (showEditButton) {
            showEditButton.checked = uiSettings.showEditButton !== undefined ? 
                uiSettings.showEditButton : 
                (config?.ui?.showEditButton !== false);
        }

        // Show current configuration
        this.displayConfigInfo();

        // Show the modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Save settings from the modal
     */
    saveSettings() {
        const openrouterToken = document.getElementById('openrouterToken')?.value.trim() || '';
        const selectedModel = document.getElementById('modelSelect')?.value || '';
        const showPreviewButton = document.getElementById('showPreviewButton')?.checked !== false;
        const showEditButton = document.getElementById('showEditButton')?.checked !== false;

        // Save API settings to storage
        this.storage.saveOpenRouterToken(openrouterToken);
        this.storage.saveSelectedModel(selectedModel);
        
        // Save UI settings to storage
        this.storage.saveUISettings({
            showPreviewButton: showPreviewButton,
            showEditButton: showEditButton
        });
        
        console.log('Saved settings:', { 
            hasToken: !!openrouterToken, 
            selectedModel: selectedModel,
            showPreviewButton: showPreviewButton,
            showEditButton: showEditButton
        });
        
        // Save selected model to configuration
        if (selectedModel) {
            this.config.updateOpenRouterModel(selectedModel);
        }

        // Update API instances
        this.openRouterAPI.setToken(openrouterToken);

        // Update UI
        this.updateTokenStatus();
        
        // Refresh the exams list to show/hide buttons immediately
        if (window.examApp && window.examApp.examManager) {
            window.examApp.examManager.loadExamsFromStorage();
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        modal?.hide();

        this.notifications.success('Settings saved successfully');
    }

    /**
     * Update token status indicator in navbar
     */
    updateTokenStatus() {
        const statusElement = document.getElementById('tokenStatus');
        if (!statusElement) return;

        const tokenStatus = this.storage.getTokenStatus();
        
        if (tokenStatus.hasOpenRouter) {
            let statusText = 'AI Ready';
            let statusIcon = 'fas fa-check-circle text-success';
            
            statusElement.innerHTML = `<small class="text-light"><i class="${statusIcon}"></i> ${statusText}</small>`;
            statusElement.style.display = 'block';
        } else {
            statusElement.style.display = 'none';
        }
    }

    /**
     * Handle OpenRouter token input to fetch available models
     * @param {string} token - The entered OpenRouter token
     */
    async handleOpenRouterTokenInput(token) {
        const modelContainer = document.getElementById('modelSelectionContainer');
        const modelSelect = document.getElementById('modelSelect');
        
        if (!token || token.length < 10) {
            // Hide model selection if token is empty or too short
            if (modelContainer) {
                modelContainer.style.display = 'none';
            }
            return;
        }

        // Show model selection container
        if (modelContainer) {
            modelContainer.style.display = 'block';
        }

        // Load models
        await this.loadFreeModels(token);
    }

    /**
     * Load free models from OpenRouter API
     * @param {string} token - OpenRouter API token
     */
    async loadFreeModels(token) {
        const modelSelect = document.getElementById('modelSelect');
        const spinner = document.getElementById('modelLoadingSpinner');
        
        if (!modelSelect) return;

        // Show loading spinner
        if (spinner) {
            spinner.style.display = 'block';
        }

        try {
            // Create temporary API instance with the token
            const tempAPI = new window.OpenRouterAPI(this.config, this.notifications);
            tempAPI.setToken(token);

            let models;
            try {
                models = await tempAPI.getFreeModels();
            } catch (error) {
                console.warn('Failed to fetch models from API:', error);
                models = [];
            }

            // Populate dropdown
            modelSelect.innerHTML = '<option value="">Select a model...</option>';
            
            if (models && models.length > 0) {
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    option.title = model.description || model.name;
                    modelSelect.appendChild(option);
                });

                // Select the currently configured model if it exists
                const currentModel = this.config.getOpenRouterConfig().model;
                const savedModel = this.storage.getSelectedModel();
                
                // Try current model first, then saved model
                const modelToSelect = currentModel || savedModel;
                if (modelToSelect && models.some(m => m.id === modelToSelect)) {
                    modelSelect.value = modelToSelect;
                }
            } else {
                modelSelect.innerHTML = '<option value="">No free models available</option>';
            }

        } catch (error) {
            console.error('Error fetching models:', error);
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        } finally {
            // Hide loading spinner
            if (spinner) {
                spinner.style.display = 'none';
            }
        }
    }

    /**
     * Display current configuration info
     */
    displayConfigInfo() {
        const configInfo = document.getElementById('configInfo');
        if (!configInfo) return;

        const openRouterConfig = this.config.getOpenRouterConfig();
        const tokenStatus = this.storage.getTokenStatus();
        
        let html = '<div class="config-status">';
        html += '<h6>Current Configuration</h6>';
        
        if (tokenStatus.hasOpenRouter) {
            html += '<div class="alert alert-success py-2">';
            html += '<i class="fas fa-check-circle"></i> OpenRouter API: Connected<br>';
            html += `<small>Model: ${openRouterConfig.model || 'Not selected'}</small>`;
            html += '</div>';
        } else {
            html += '<div class="alert alert-warning py-2">';
            html += '<i class="fas fa-exclamation-triangle"></i> OpenRouter API: Not configured';
            html += '</div>';
        }
        
        html += '</div>';
        configInfo.innerHTML = html;
    }

    /**
     * Restore user settings from storage
     */
    restoreSettings() {
        const tokenStatus = this.storage.getTokenStatus();
        const savedModel = this.storage.getSelectedModel();
        
        // Set API tokens
        if (tokenStatus.hasOpenRouter) {
            this.openRouterAPI.setToken(this.storage.getOpenRouterToken());
        }
        
        // Restore selected model to configuration
        if (savedModel) {
            this.config.updateOpenRouterModel(savedModel);
            console.log('Restored saved model:', savedModel);
        }
        
        // Update UI status
        this.updateTokenStatus();
        
        console.log('Settings restored:', { tokenStatus, savedModel });
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            tokenStatus: this.storage?.getTokenStatus(),
            currentModel: this.config?.getOpenRouterConfig().model,
            savedModel: this.storage?.getSelectedModel()
        };
    }
}

// Export for use in other modules
window.SettingsManager = SettingsManager;
