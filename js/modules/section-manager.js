/**
 * Section Manager Module
 * Handles dynamic exam sections UI (add, delete, configure sections)
 */

class SectionManager {
    constructor(notifications) {
        this.notifications = notifications;
    }

    /**
     * Initialize dynamic sections with a default section
     */
    initializeSections() {
        // Add a default section
        this.addExamSection();
    }

    /**
     * Add a new exam section
     */
    addExamSection(sectionData = null) {
        const sectionsContainer = document.getElementById('examSections');
        const sectionIndex = sectionsContainer.children.length + 1;
        
        const sectionElement = document.createElement('div');
        sectionElement.className = 'exam-section card mb-3';
        sectionElement.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Section ${sectionIndex}</h6>
                <button type="button" class="btn btn-outline-danger btn-sm delete-section-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Question Type</label>
                        <select class="form-select section-type" required>
                            <option value="">Select Type</option>
                            <option value="fill_in_blank">Fill in the Blank</option>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="true_false">True/False</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="long_answer">Long Answer</option>
                            <option value="sentence_ordering">Sentence Ordering</option>
                            <option value="reading_comprehension">Reading Comprehension</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3 fill-blank-options" style="display: none;">
                        <label class="form-label">Fill-in-Blank Style</label>
                        <select class="form-select fill-blank-type">
                            <option value="no_hints">No hints - Text input only</option>
                            <option value="with_hints">Hints in brackets next to blanks</option>
                            <option value="answer_list">Answer list at the top</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3 reading-options" style="display: none;">
                        <label class="form-label">Passage Length (Number of Sentences)</label>
                        <input type="number" class="form-control passage-length" min="1" max="20" value="3" placeholder="Enter number of sentences">
                        <div class="form-text">Enter the number of sentences for the reading passage (1-20)</div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Reference Section Content</label>
                    <select class="form-select reference-section-select">
                        <option value="">Create new content for this section</option>
                        <!-- Options will be populated dynamically based on available sections above -->
                    </select>
                    <div class="form-text">Select a section above to use the same content/passage, or create new content</div>
                </div>
                
                <div class="mb-3 prompt-container">
                    <label class="form-label">Section Instructions/Prompt</label>
                    <textarea class="form-control section-prompt" rows="3" placeholder="Specific instructions for this section (e.g., 'test past tenses and present tenses and future tenses', 'article about alice in the wonderland')"></textarea>
                    <small class="text-muted">Enter specific instructions for this section</small>
                </div>
            </div>
        `;
        
        sectionsContainer.appendChild(sectionElement);
        
        // Add event listeners for this section
        this.setupSectionEventListeners(sectionElement, sectionIndex);
        
        // Set default values if provided
        if (sectionData) {
            this.populateSectionData(sectionElement, sectionData);
        }
        
        // Update section numbers
        this.updateSectionNumbers();
        
        // Update reference section options for all sections
        this.updateReferenceSectionOptions();
    }

    /**
     * Setup event listeners for a section
     */
    setupSectionEventListeners(sectionElement, sectionIndex) {
        // Delete section button
        const deleteBtn = sectionElement.querySelector('.delete-section-btn');
        deleteBtn.addEventListener('click', () => {
            if (document.querySelectorAll('.exam-section').length > 1) {
                sectionElement.remove();
                this.updateSectionNumbers();
                this.updateReferenceSectionOptions(); // Update dropdowns after deletion
            } else {
                this.notifications.warning('At least one section is required');
            }
        });
        
        // Question type change
        const typeSelect = sectionElement.querySelector('.section-type');
        typeSelect.addEventListener('change', (e) => {
            this.handleTypeChange(sectionElement, e.target.value);
            this.updateReferenceSectionOptions(); // Update dropdown labels when type changes
        });
        
        // Reference section dropdown change
        const referenceSectionSelect = sectionElement.querySelector('.reference-section-select');
        if (referenceSectionSelect) {
            referenceSectionSelect.addEventListener('change', (e) => {
                this.handleReferenceSectionChange(sectionElement, e.target.value);
            });
        }
    }

    /**
     * Handle question type change
     */
    handleTypeChange(sectionElement, selectedType) {
        const fillBlankOptions = sectionElement.querySelector('.fill-blank-options');
        const readingOptions = sectionElement.querySelector('.reading-options');
        
        // Hide all options first
        fillBlankOptions.style.display = 'none';
        readingOptions.style.display = 'none';
        
        // Show relevant options
        if (selectedType === 'fill_in_blank') {
            fillBlankOptions.style.display = 'block';
        } else if (selectedType === 'reading_comprehension') {
            readingOptions.style.display = 'block';
        }
    }

    /**
     * Update section numbers for all sections
     */
    updateSectionNumbers() {
        const sections = document.querySelectorAll('.exam-section');
        sections.forEach((section, index) => {
            const header = section.querySelector('.card-header h6');
            if (header) {
                header.textContent = `Section ${index + 1}`;
            }
        });
    }

    /**
     * Update reference section dropdowns for all sections
     */
    updateReferenceSectionOptions() {
        const sections = document.querySelectorAll('.exam-section');
        
        sections.forEach((section, currentIndex) => {
            const dropdown = section.querySelector('.reference-section-select');
            if (!dropdown) return;
            
            // Clear existing options except the first one
            dropdown.innerHTML = '<option value="">Create new content for this section</option>';
            
            // Add options for all sections above the current one
            for (let i = 0; i < currentIndex; i++) {
                const referenceSection = sections[i];
                const sectionTitle = referenceSection.querySelector('.section-type').selectedOptions[0]?.text || `Section ${i + 1}`;
                const sectionNumber = i + 1;
                
                const option = document.createElement('option');
                option.value = sectionNumber.toString();
                option.textContent = `Section ${sectionNumber} (${sectionTitle})`;
                dropdown.appendChild(option);
            }
            
            // Disable dropdown for first section since it has no sections above it
            dropdown.disabled = currentIndex === 0;
            if (currentIndex === 0) {
                dropdown.parentElement.style.display = 'none';
            } else {
                dropdown.parentElement.style.display = 'block';
            }
        });
    }

    /**
     * Populate section with data
     */
    populateSectionData(sectionElement, sectionData) {
        const typeSelect = sectionElement.querySelector('.section-type');
        const promptTextarea = sectionElement.querySelector('.section-prompt');
        const referenceSectionSelect = sectionElement.querySelector('.reference-section-select');
        const fillBlankType = sectionElement.querySelector('.fill-blank-type');
        const passageLength = sectionElement.querySelector('.passage-length');
        
        if (sectionData.type) typeSelect.value = sectionData.type;
        if (sectionData.prompt) promptTextarea.value = sectionData.prompt;
        
        // Handle reference section (convert from old sameTopicAsAbove)
        if (sectionData.referenceSectionId) {
            if (referenceSectionSelect) referenceSectionSelect.value = sectionData.referenceSectionId.toString();
        } else if (sectionData.sameTopicAsAbove) {
            // Backward compatibility: if sameTopicAsAbove was true, reference the previous section
            const sectionIndex = Array.from(sectionElement.parentElement.children).indexOf(sectionElement);
            if (sectionIndex > 0 && referenceSectionSelect) {
                referenceSectionSelect.value = sectionIndex.toString();
            }
        }
        
        if (sectionData.fillBlankStyle && fillBlankType) fillBlankType.value = sectionData.fillBlankStyle;
        if (sectionData.passageLength && passageLength) {
            // Handle both numeric and text values for backward compatibility
            const passageLengthValue = parseInt(sectionData.passageLength);
            if (!isNaN(passageLengthValue)) {
                passageLength.value = passageLengthValue.toString();
            } else {
                // Convert old text values to numbers
                switch (sectionData.passageLength) {
                    case 'short':
                        passageLength.value = '2';
                        break;
                    case 'medium':
                        passageLength.value = '3';
                        break;
                    case 'long':
                        passageLength.value = '6';
                        break;
                    default:
                        passageLength.value = '3';
                }
            }
        }
        
        // Trigger change events
        this.handleTypeChange(sectionElement, sectionData.type);
    }

    /**
     * Get all section data from the form
     */
    getSectionData() {
        const sections = [];
        const sectionElements = document.querySelectorAll('.exam-section');
        
        sectionElements.forEach((sectionEl, index) => {
            const typeSelect = sectionEl.querySelector('.section-type');
            const promptTextarea = sectionEl.querySelector('.section-prompt');
            const referenceSectionSelect = sectionEl.querySelector('.reference-section-select');
            const fillBlankType = sectionEl.querySelector('.fill-blank-type');
            const passageLength = sectionEl.querySelector('.passage-length');
            
            const section = {
                id: index + 1,
                type: typeSelect?.value || '',
                prompt: promptTextarea?.value || ''
            };
            
            // Add reference section if selected
            if (referenceSectionSelect?.value) {
                section.referenceSectionId = parseInt(referenceSectionSelect.value);
            }
            
            // Add fill-in-blank specific options
            if (section.type === 'fill_in_blank' && fillBlankType) {
                section.fillBlankStyle = fillBlankType.value;
            }
            
            // Add reading comprehension specific options
            if (section.type === 'reading_comprehension' && passageLength) {
                section.passageLength = passageLength.value;
            }
            
            sections.push(section);
        });

        return sections;
    }

    /**
     * Clear all sections and add a default one
     */
    resetSections() {
        const sectionsContainer = document.getElementById('examSections');
        sectionsContainer.innerHTML = '';
        this.addExamSection();
    }

    /**
     * Validate sections before submission
     */
    validateSections() {
        const sections = this.getSectionData();
        
        if (sections.length === 0) {
            this.notifications.error('At least one section is required');
            return false;
        }

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            
            if (!section.type) {
                this.notifications.error(`Section ${i + 1}: Please select a question type`);
                return false;
            }

            // Validate reference section ID
            if (section.referenceSectionId) {
                if (section.referenceSectionId >= section.id) {
                    this.notifications.error(`Section ${i + 1}: Cannot reference a section that comes after or is the same section`);
                    return false;
                }
            }
            
            // Validate passage length for reading comprehension sections
            if (section.type === 'reading_comprehension' && section.passageLength) {
                const passageLength = parseInt(section.passageLength);
                if (isNaN(passageLength) || passageLength < 1 || passageLength > 20) {
                    this.notifications.error(`Section ${i + 1}: Passage length must be between 1 and 20 sentences`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Populate sections with exam data for editing
     */
    populateSections(sectionsData) {
        // Clear existing sections
        this.resetSections();
        
        // Remove the default section since we'll add our own
        const sectionsContainer = document.getElementById('examSections');
        sectionsContainer.innerHTML = '';
        
        // Add sections from data
        if (sectionsData && sectionsData.length > 0) {
            sectionsData.forEach(sectionData => {
                this.addExamSection(sectionData);
            });
        } else {
            // Add at least one default section
            this.addExamSection();
        }
    }
}

// Export for use in other modules
window.SectionManager = SectionManager;
