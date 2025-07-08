/**
 * Notifications Utility Module
 * Handles toast notifications, loading spinners, and user feedback
 */

class NotificationManager {
    constructor() {
        this.defaultTimeout = 5000;
        this.loadingSpinner = null;
        this.activeNotifications = new Set();
    }

    /**
     * Show a notification toast
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, warning, danger, info)
     * @param {number} timeout - Auto-dismiss timeout (0 for no auto-dismiss)
     */
    show(message, type = 'info', timeout = this.defaultTimeout) {
        const alertDiv = document.createElement('div');
        const alertId = 'alert-' + Date.now();
        
        alertDiv.id = alertId;
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 600px; min-width: 400px;';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${this.getIconForType(type)} me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        this.activeNotifications.add(alertId);
        
        // Auto-dismiss after timeout
        if (timeout > 0) {
            setTimeout(() => {
                this.dismiss(alertId);
            }, timeout);
        }
        
        // Handle manual dismiss
        alertDiv.querySelector('.btn-close').addEventListener('click', () => {
            this.dismiss(alertId);
        });
        
        return alertId;
    }

    /**
     * Dismiss a specific notification
     * @param {string} alertId - Alert ID to dismiss
     */
    dismiss(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement && alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
            this.activeNotifications.delete(alertId);
        }
    }

    /**
     * Dismiss all active notifications
     */
    dismissAll() {
        this.activeNotifications.forEach(alertId => {
            this.dismiss(alertId);
        });
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {number} timeout - Auto-dismiss timeout
     */
    success(message, timeout = this.defaultTimeout) {
        return this.show(message, 'success', timeout);
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {number} timeout - Auto-dismiss timeout
     */
    warning(message, timeout = this.defaultTimeout) {
        return this.show(message, 'warning', timeout);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {number} timeout - Auto-dismiss timeout
     */
    error(message, timeout = this.defaultTimeout) {
        return this.show(message, 'danger', timeout);
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {number} timeout - Auto-dismiss timeout
     */
    info(message, timeout = this.defaultTimeout) {
        return this.show(message, 'info', timeout);
    }

    /**
     * Show loading spinner
     * @param {string} message - Loading message
     */
    showLoading(message = 'Processing...') {
        this.hideLoading(); // Hide any existing spinner
        
        this.loadingSpinner = document.createElement('div');
        this.loadingSpinner.id = 'loadingSpinner';
        this.loadingSpinner.className = 'loading-spinner';
        this.loadingSpinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2">${message}</div>
        `;
        
        document.body.appendChild(this.loadingSpinner);
        this.loadingSpinner.style.display = 'block';
    }

    /**
     * Hide loading spinner
     */
    hideLoading() {
        if (this.loadingSpinner) {
            if (this.loadingSpinner.parentNode) {
                this.loadingSpinner.parentNode.removeChild(this.loadingSpinner);
            }
            this.loadingSpinner = null;
        }
        
        // Also hide any existing spinner with the old ID
        const existingSpinner = document.getElementById('loadingSpinner');
        if (existingSpinner) {
            existingSpinner.style.display = 'none';
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} User's choice
     */
    confirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            // Create modal
            const modalId = 'confirmModal-' + Date.now();
            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>${message}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancelBtn">Cancel</button>
                                <button type="button" class="btn btn-primary" id="confirmBtn">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = new bootstrap.Modal(document.getElementById(modalId));
            
            // Handle confirm
            document.getElementById('confirmBtn').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            // Handle cancel
            document.getElementById('cancelBtn').addEventListener('click', () => {
                modal.hide();
                resolve(false);
            });
            
            // Clean up when modal is hidden
            document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
                document.getElementById(modalId).remove();
            });
            
            modal.show();
        });
    }

    /**
     * Get icon class for notification type
     * @param {string} type - Notification type
     * @returns {string} FontAwesome icon class
     */
    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            danger: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show progress notification with updates
     * @param {string} initialMessage - Initial progress message
     * @returns {Object} Progress controller object
     */
    showProgress(initialMessage = 'Processing...') {
        const progressId = this.show(initialMessage, 'info', 0); // No auto-dismiss
        
        return {
            update: (message) => {
                const alertElement = document.getElementById(progressId);
                if (alertElement) {
                    const messageElement = alertElement.querySelector('.flex-grow-1');
                    if (messageElement) {
                        // Support both text and HTML content
                        if (message.includes('\n') || message.includes('<')) {
                            messageElement.innerHTML = message.replace(/\n/g, '<br>');
                        } else {
                            messageElement.textContent = message;
                        }
                        
                        // Add CSS for better formatting of AI content
                        if (message.includes('🤖 AI Response')) {
                            messageElement.style.fontFamily = 'monospace';
                            messageElement.style.whiteSpace = 'pre-wrap';
                            messageElement.style.maxHeight = '400px';
                            messageElement.style.overflow = 'auto';
                            messageElement.style.fontSize = '11px';
                            messageElement.style.backgroundColor = '#f8f9fa';
                            messageElement.style.padding = '10px';
                            messageElement.style.borderRadius = '4px';
                            messageElement.style.border = '1px solid #dee2e6';
                            
                            // Auto-scroll to bottom for streaming content
                            setTimeout(() => {
                                messageElement.scrollTop = messageElement.scrollHeight;
                            }, 10);
                        }
                    }
                }
            },
            complete: (message = 'Complete!', type = 'success') => {
                this.dismiss(progressId);
                this.show(message, type);
            },
            error: (message = 'An error occurred') => {
                this.dismiss(progressId);
                this.error(message);
            }
        };
    }

    /**
     * Set default timeout for notifications
     * @param {number} timeout - Default timeout in milliseconds
     */
    setDefaultTimeout(timeout) {
        this.defaultTimeout = timeout;
    }

    /**
     * Get count of active notifications
     * @returns {number} Number of active notifications
     */
    getActiveCount() {
        return this.activeNotifications.size;
    }
}

// Create and export singleton instance
const notificationManager = new NotificationManager();

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = notificationManager;
}

// For browser global
if (typeof window !== 'undefined') {
    window.NotificationManager = notificationManager;
}
