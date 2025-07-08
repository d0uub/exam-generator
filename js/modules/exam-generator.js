/**
 * Exam Generator Module
 * Handles exam generation logic and form data processing
 */

class ExamGenerator {
    constructor(storage, notifications, openRouterAPI) {
        this.storage = storage;
        this.notifications = notifications;
        this.openRouterAPI = openRouterAPI;
    }

    /**
     * Generate new exam
     */
    async generateExam(formData = null) {
        const tokenStatus = this.storage.getTokenStatus();
        const examFormData = formData || this.getFormData();
        const progress = this.notifications.showProgress('Generating exam...');

        try {
            let examContent;
            
            if (tokenStatus.hasOpenRouter) {
                // Log the prompt that will be sent to OpenRouter AI
                console.log('=== OPENROUTER AI PROMPT ===');
                console.log('Form Data:', examFormData);
                
                examContent = await this.openRouterAPI.generateExamContent(examFormData, progress);
            } else {
                progress.update('Creating basic template...');
                examContent = this.createBasicTemplate(examFormData);
                this.notifications.info('Generated basic template. Configure OpenRouter token for AI-generated content.');
            }

            // Save to storage without showing progress message
            const examId = this.storage.addExam(examContent);
            
            progress.complete('Exam generated and saved successfully!');
            this.notifications.success('Exam saved to local storage!');
            
            // Emit event for other modules to handle
            window.dispatchEvent(new CustomEvent('examGenerated', { detail: { examId, exam: examContent } }));
            
            return examContent;
            
        } catch (error) {
            console.error('Error generating exam:', error);
            progress.error('Error generating exam: ' + error.message);
            throw error;
        }
    }

    /**
     * Get form data for exam generation
     */
    getFormData() {
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

        return {
            subject: document.getElementById('subject')?.value || '',
            sections: sections
        };
    }

    /**
     * Create basic template when AI is not available
     */
    createBasicTemplate(formData) {
        const exam = {
            title: `${formData.subject} - ${formData.topic} Exam`,
            subject: formData.subject,
            topic: formData.topic,
            sections: []
        };

        formData.sections.forEach((sectionData, index) => {
            const section = {
                id: sectionData.id,
                type: sectionData.type,
                title: `Section ${index + 1}: ${this.formatSectionType(sectionData.type)}`,
                questions: []
            };

            // Add sample question based on type
            switch (sectionData.type) {
                case 'fill_in_blank':
                    section.questions.push({
                        question: `Fill in the blank about ${formData.topic}: The _____ is important.`,
                        answer: 'concept'
                    });
                    break;
                case 'multiple_choice':
                    section.questions.push({
                        question: `Which best describes ${formData.topic}?`,
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        correct: 0
                    });
                    break;
                case 'true_false':
                    section.questions.push({
                        question: `${formData.topic} is fundamental to ${formData.subject}.`,
                        correct: true
                    });
                    break;
                case 'reading_comprehension':
                    section.passage = `This is a sample passage about ${formData.topic}. It contains basic information for demonstration purposes.`;
                    break;
                default:
                    section.questions.push({
                        question: `Sample question about ${formData.topic}`,
                        answer: 'Sample answer'
                    });
            }

            exam.sections.push(section);
        });

        return exam;
    }

    /**
     * Format section type for display
     */
    formatSectionType(type) {
        const typeMap = {
            'fill_in_blank': 'Fill in the Blank',
            'multiple_choice': 'Multiple Choice',
            'true_false': 'True/False',
            'short_answer': 'Short Answer',
            'long_answer': 'Long Answer',
            'sentence_ordering': 'Sentence Ordering',
            'reading_comprehension': 'Reading Comprehension'
        };
        return typeMap[type] || type;
    }
}

// Export for use in other modules
window.ExamGenerator = ExamGenerator;
