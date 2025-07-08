/**
 * Exam Renderer Module
 * Handles rendering exams in different modes (preview, interactive, results)
 */

class ExamRenderer {
    constructor(notifications) {
        this.notifications = notifications;
        this.userAnswers = {};
        this.currentExam = null;
        this.startTime = null;
    }

    /**
     * Render exam preview
     */
    renderExamPreview(exam) {
        let html = `
            <div class="exam-header mb-4">
                <h3>${exam.title}</h3>
                <div class="exam-meta">
                    <span class="badge bg-primary me-2">${exam.subject}</span>
                    <span class="badge bg-secondary me-2">${exam.topic}</span>
                    <small class="text-muted">Created: ${new Date(exam.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
        `;

        if (exam.sections && Array.isArray(exam.sections)) {
            exam.sections.forEach((section, sectionIndex) => {
                html += `
                    <div class="section-preview mb-4">
                        <h4 class="section-title">${sectionIndex + 1}. ${section.title}</h4>
                        <p class="text-muted mb-3">Type: ${this.formatSectionType(section.type)} | Questions: ${section.questions?.length || 0}</p>
                `;

                // Show answer list for fill-in-blank sections with answer_list style
                if (section.type === 'fill_in_blank' && section.answerList && section.answerList.length > 0) {
                    html += `
                        <div class="answer-list-preview alert alert-info mb-3">
                            <h6><i class="fas fa-list"></i> Available Answers:</h6>
                            <div class="answer-list">
                                ${section.answerList.map((answer, index) => `<span class="badge bg-light text-dark me-2 mb-1">${index + 1}. ${answer}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }

                // Show reading passage for reading comprehension sections
                if (section.type === 'reading_comprehension' && section.passage) {
                    html += `
                        <div class="reading-passage-preview alert alert-light mb-3">
                            <h6><i class="fas fa-book-open"></i> Reading Passage:</h6>
                            <div class="passage-content">${section.passage}</div>
                        </div>
                    `;
                }

                if (section.questions && Array.isArray(section.questions)) {
                    section.questions.forEach((question, questionIndex) => {
                        html += this.renderQuestionPreview(question, section.type, questionIndex + 1);
                    });
                }

                html += `</div>`;
            });
        }

        return html;
    }

    /**
     * Render question preview
     */
    renderQuestionPreview(question, sectionType, questionNumber) {
        let html = `
            <div class="question-preview mb-3 p-3 border rounded">
                <h6>Question ${questionNumber}</h6>
                <p>${question.question}</p>
        `;

        switch (sectionType) {
            case 'multiple_choice':
                html += '<div class="options-preview">';
                question.options?.forEach((option, index) => {
                    const isCorrect = question.correct === index;
                    html += `<div class="option ${isCorrect ? 'text-success fw-bold' : ''}">${String.fromCharCode(65 + index)}. ${option} ${isCorrect ? '✓' : ''}</div>`;
                });
                html += '</div>';
                break;

            case 'fill_in_blank':
                html += `<div class="answer-preview"><strong>Answer:</strong> ${question.answer}</div>`;
                if (question.options && question.options.length > 0) {
                    html += `<div class="options-preview"><strong>Options:</strong> ${question.options.join(', ')}</div>`;
                }
                if (question.hints && question.hints.length > 0) {
                    html += `<div class="hints-preview"><strong>Hints:</strong> ${question.hints.join(', ')}</div>`;
                }
                break;

            case 'true_false':
                html += `<div class="answer-preview"><strong>Answer:</strong> ${question.correct ? 'True' : 'False'}</div>`;
                break;

            case 'short_answer':
            case 'long_answer':
                if (question.keywords && question.keywords.length > 0) {
                    html += `<div class="keywords-preview"><strong>Keywords:</strong> ${question.keywords.join(', ')}</div>`;
                }
                break;
        }

        html += '</div>';
        return html;
    }

    /**
     * Start interactive exam
     */
    startInteractiveExam(exam) {
        this.currentExam = exam;
        this.userAnswers = {};
        this.startTime = new Date();
        
        // Reset submit button to original state
        this.resetSubmitButton();
        
        // Render interactive exam
        const examContent = this.renderInteractiveExam(exam);
        document.getElementById('takeExamContent').innerHTML = examContent;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('takeExamModal'));
        modal.show();
        
        // Start timer
        this.startTimer();
        
        // Set up progress tracking
        this.setupAnswerTracking();
        
        // Set up word click functionality for reading comprehension after DOM update
        console.log('About to call setupWordClick...');
        setTimeout(() => {
            this.setupWordClick();
            console.log('setupWordClick call completed');
        }, 100);
    }

    /**
     * Render interactive exam
     */
    renderInteractiveExam(exam) {
        let html = `
            <div class="exam-header mb-4">
                <h3>${exam.title}</h3>
                <div class="exam-meta">
                    <span class="badge bg-primary me-2">${exam.subject}</span>
                    <span class="badge bg-secondary me-2">${exam.topic}</span>
                    <div id="examTimer" class="d-inline-block ms-3">
                        <i class="fas fa-clock"></i> <span id="timerDisplay">00:00</span>
                    </div>
                </div>
                <div class="progress mt-2">
                    <div class="progress-bar" role="progressbar" style="width: 0%" id="examProgress"></div>
                </div>
            </div>
        `;

        if (exam.sections && Array.isArray(exam.sections)) {
            exam.sections.forEach((section, sectionIndex) => {
                html += `
                    <div class="section-interactive mb-4">
                        <h4 class="section-title">${sectionIndex + 1}. ${section.title}</h4>
                        <p class="text-muted mb-3">${this.formatSectionType(section.type)}</p>
                `;
                
                // Show answer list for fill-in-blank sections with answer_list style
                if (section.type === 'fill_in_blank' && section.answerList && section.answerList.length > 0) {
                    html += `
                        <div class="answer-list-container alert alert-info mb-3">
                            <h6><i class="fas fa-list"></i> Available Answers:</h6>
                            <div class="answer-list">
                                ${section.answerList.map((answer, index) => `<span class="badge bg-light text-dark me-2 mb-1">${index + 1}. ${answer}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }

                // Show reading passage for reading comprehension sections
                if (section.type === 'reading_comprehension' && section.passage) {
                    console.log('=== Rendering interactive reading comprehension passage ===');
                    html += `
                        <div class="reading-section mb-4">
                            <div class="iframe-container mb-3">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="image-search-container">
                                            <h6><i class="fas fa-images"></i> Image Search Results:</h6>
                                            <iframe id="imageSearchFrame" 
                                                    src="https://www.google.com/search?q=reading&udm=2" 
                                                    style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 5px;">
                                            </iframe>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="translate-container">
                                            <h6><i class="fas fa-language"></i> Dictionary:</h6>
                                            <iframe id="translateFrame" 
                                                    src="https://dict.cn/reading" 
                                                    style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 5px;">
                                            </iframe>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="reading-passage alert alert-light">
                                <h6><i class="fas fa-book-open"></i> Reading Passage:</h6>
                                <div class="passage-content" data-word-links="true">${this.makeWordsClickable(section.passage)}</div>
                            </div>
                        </div>
                    `;
                }

                if (section.questions && Array.isArray(section.questions)) {
                    section.questions.forEach((question, questionIndex) => {
                        const questionId = `q_${sectionIndex}_${questionIndex}`;
                        html += this.renderInteractiveQuestion(question, section.type, questionId, questionIndex + 1);
                    });
                }

                html += `</div>`;
            });
        }

        return html;
    }

    /**
     * Render interactive question
     */
    renderInteractiveQuestion(question, sectionType, questionId, questionNumber) {
        let html = `
            <div class="question-interactive mb-4 p-3 border rounded" data-question-id="${questionId}">
                <h6>Question ${questionNumber}</h6>
                <p>${question.question}</p>
        `;

        switch (sectionType) {
            case 'multiple_choice':
                html += '<div class="options-interactive">';
                question.options?.forEach((option, index) => {
                    html += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="${questionId}" id="${questionId}_${index}" value="${index}">
                            <label class="form-check-label" for="${questionId}_${index}">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </label>
                        </div>
                    `;
                });
                html += '</div>';
                break;

            case 'fill_in_blank':
                // Handle different fill-in-blank styles
                if (question.options) {
                    // Multiple choice style (no hints)
                    html += '<div class="options-interactive">';
                    question.options.forEach((option, index) => {
                        html += `
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="${questionId}" id="${questionId}_${index}" value="${option}">
                                <label class="form-check-label" for="${questionId}_${index}">
                                    ${String.fromCharCode(65 + index)}. ${option}
                                </label>
                            </div>
                        `;
                    });
                    html += '</div>';
                } else {
                    // Text input style (for with_hints and answer_list styles)
                    html += `
                        <div class="fill-blank-interactive">
                            <input type="text" class="form-control" id="${questionId}_input" name="${questionId}" placeholder="Enter your answer">
                        </div>
                    `;
                    // Note: For with_hints style, hints are already embedded in the question text
                    // No need for separate hints display
                }
                break;

            case 'true_false':
                html += `
                    <div class="true-false-interactive">
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="${questionId}" id="${questionId}_true" value="true">
                            <label class="form-check-label" for="${questionId}_true">True</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="${questionId}" id="${questionId}_false" value="false">
                            <label class="form-check-label" for="${questionId}_false">False</label>
                        </div>
                    </div>
                `;
                break;

            case 'short_answer':
                html += `
                    <div class="short-answer-interactive">
                        <textarea class="form-control" id="${questionId}_input" name="${questionId}" rows="3" placeholder="Enter your answer"></textarea>
                    </div>
                `;
                break;

            case 'long_answer':
                html += `
                    <div class="long-answer-interactive">
                        <textarea class="form-control" id="${questionId}_input" name="${questionId}" rows="6" placeholder="Enter your detailed answer"></textarea>
                    </div>
                `;
                break;
        }

        html += '</div>';
        return html;
    }

    /**
     * Start an interactive exam session
     * @param {Object} exam - The exam object to take
     * @param {Element} containerElement - The DOM element to render the exam in
     * @returns {HTMLElement} - The rendered exam content element
     */
    startExam(exam, containerElement) {
        this.currentExam = exam;
        this.userAnswers = {};
        
        // Reset submit button to original state
        this.resetSubmitButton();
        
        // Render the interactive exam
        const interactiveContent = this.renderInteractiveExam(exam);
        
        if (containerElement) {
            containerElement.innerHTML = interactiveContent;
        }
        
        // Initialize timer and progress after DOM is updated
        setTimeout(() => {
            // Start timer
            this.startTime = new Date();
            this.startTimer();
            
            // Setup answer tracking for progress bar
            this.setupAnswerTracking();
        }, 100);
        
        return containerElement;
    }
    
    /**
     * Setup event listeners to track answers and update progress
     */
    setupAnswerTracking() {
        const takeExamContent = document.getElementById('takeExamContent');
        if (!takeExamContent || !this.currentExam) return;
        
        // Count total answerable questions
        let totalQuestions = 0;
        if (this.currentExam.sections) {
            this.currentExam.sections.forEach(section => {
                if (section.questions) {
                    totalQuestions += section.questions.length;
                }
            });
        }
        
        // Setup change listeners for inputs
        const updateProgress = () => {
            // Count answered questions
            let answered = 0;
            
            // Count radio button answers (multiple choice)
            const radioGroups = new Set();
            takeExamContent.querySelectorAll('input[type="radio"]:checked').forEach(input => {
                if (input.name) radioGroups.add(input.name);
            });
            answered += radioGroups.size;
            
            // Count text inputs with values (fill-in-blank)
            takeExamContent.querySelectorAll('input[type="text"]').forEach(input => {
                if (input.value.trim()) answered++;
            });
            
            // Count textareas with values (long answers)
            takeExamContent.querySelectorAll('textarea').forEach(textarea => {
                if (textarea.value.trim()) answered++;
            });
            
            // Update progress bar
            const progressPercent = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
            const progressBar = document.getElementById('examProgress');
            if (progressBar) {
                progressBar.style.width = `${progressPercent}%`;
                progressBar.setAttribute('aria-valuenow', progressPercent);
                
                // Update color based on progress
                if (progressPercent < 30) {
                    progressBar.className = 'progress-bar bg-danger';
                } else if (progressPercent < 70) {
                    progressBar.className = 'progress-bar bg-warning';
                } else {
                    progressBar.className = 'progress-bar bg-success';
                }
            }
        };
        
        // Add event listeners to all inputs and textareas
        takeExamContent.querySelectorAll('input, textarea').forEach(element => {
            element.addEventListener('change', updateProgress);
            // For text inputs, also listen for keyup
            if (element.type === 'text' || element.tagName === 'TEXTAREA') {
                element.addEventListener('keyup', updateProgress);
            }
        });
        
        // Initial update
        updateProgress();
    }
    
    /**
     * Collect user answers from the interactive exam
     * @returns {Object} - Object containing user answers
     */
    collectUserAnswers() {
        const examContent = document.getElementById('takeExamContent');
        if (!examContent) return {};

        this.userAnswers = {};
        
        // Collect answers from multiple choice questions
        examContent.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            if (input.name) {
                this.userAnswers[input.name] = input.value;
            }
        });

        // Collect answers from fill-in-the-blank questions
        examContent.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.name) {
                this.userAnswers[input.name] = input.value.trim();
            }
        });

        // Collect answers from text areas
        examContent.querySelectorAll('textarea').forEach(textarea => {
            if (textarea.name) {
                this.userAnswers[textarea.name] = textarea.value.trim();
            }
        });
        
        return this.userAnswers;
    }
    
    /**
     * Submit exam and display results
     * @returns {Object} - Results object with score, percentage, etc.
     */
    submitExam() {
        if (!this.currentExam) {
            return null;
        }

        // Stop the timer
        this.stopTimer();
        
        // Get elapsed time
        const elapsedTime = this.startTime ? 
            Math.floor((new Date() - this.startTime) / 1000) : 0;
        
        // Collect answers
        this.collectUserAnswers();
        
        // Calculate results
        const results = this.calculateResults();
        
        // Add time taken to results
        results.timeTaken = {
            seconds: elapsedTime,
            formatted: this.formatTime(elapsedTime)
        };
        
        // Set submit button to close state
        this.setSubmitButtonToClose();
        
        return results;
    }
    
    /**
     * Format seconds to HH:MM:SS
     */
    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        let result = '';
        if (hours > 0) {
            result += `${hours}h `;
        }
        if (minutes > 0 || hours > 0) {
            result += `${minutes}m `;
        }
        result += `${seconds}s`;
        
        return result;
    }
    
    /**
     * Calculate exam results
     * @returns {Object} - Results object with score, percentage, etc.
     */
    calculateResults() {
        if (!this.currentExam || !this.userAnswers) {
            return { score: 0, total: 0, percentage: 0, details: [] };
        }

        let correct = 0;
        let total = 0;
        const details = [];

        // Process each section
        this.currentExam.sections?.forEach((section, sectionIndex) => {                // Process each question in the section
            section.questions?.forEach((question, questionIndex) => {
                const questionId = `q_${sectionIndex}_${questionIndex}`;
                
                if (section.type === 'multiple_choice') {
                    total++;
                    const userAnswer = this.userAnswers[questionId];
                    
                    // Handle different correct answer formats
                    let correctAnswer;
                    if (question.correct !== undefined) {
                        // AI-generated format: "correct": 1 (index)
                        correctAnswer = question.correct.toString();
                    } else if (question.correct_answer !== undefined) {
                        // Alternative format: "correct_answer": "1"
                        correctAnswer = question.correct_answer.toString();
                    } else {
                        correctAnswer = null;
                    }
                    
                    const isCorrect = userAnswer === correctAnswer;
                    if (isCorrect) correct++;
                    
                    details.push({
                        question: question.question || 'Question',
                        userAnswer: userAnswer || 'No answer',
                        correctAnswer: correctAnswer || 'Not provided',
                        isCorrect,
                        type: 'multiple_choice',
                        options: question.options || [],
                        correctIndex: question.correct !== undefined ? question.correct : (question.correct_answer !== undefined ? parseInt(question.correct_answer) : null),
                        userIndex: userAnswer !== undefined ? parseInt(userAnswer) : null
                    });
                } else if (section.type === 'fill_in_blank') {
                    total++;
                    const userAnswer = this.userAnswers[questionId];
                    
                    // Handle different formats of correct answers
                    let correctAnswers = [];
                    if (Array.isArray(question.correct_answers)) {
                        correctAnswers = question.correct_answers;
                    } else if (question.correct_answer) {
                        // Some questions might use correct_answer instead of correct_answers
                        correctAnswers = [question.correct_answer];
                    } else if (question.answer) {
                        // Some might use just 'answer'
                        correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
                    }
                    
                    const isCorrect = this.checkFillInBlankAnswer(userAnswer, correctAnswers);
                    if (isCorrect) correct++;
                    
                    details.push({
                        question: question.question || 'Question',
                        userAnswer: userAnswer || 'No answer',
                        correctAnswer: correctAnswers.length > 0 ? correctAnswers.join(', ') : 'Not provided',
                        isCorrect,
                        type: 'fill_in_blank'
                    });
                } else if (section.type === 'true_false') {
                    total++;
                    const userAnswer = this.userAnswers[questionId];
                    
                    // Handle different correct answer formats for true/false
                    let correctAnswer;
                    if (question.correct !== undefined) {
                        // Boolean format: true/false
                        correctAnswer = question.correct.toString();
                    } else if (question.correct_answer !== undefined) {
                        // String format: "true"/"false"
                        correctAnswer = question.correct_answer.toString();
                    } else {
                        correctAnswer = null;
                    }
                    
                    const isCorrect = userAnswer === correctAnswer;
                    if (isCorrect) correct++;
                    
                    details.push({
                        question: question.question || 'Question',
                        userAnswer: userAnswer || 'No answer',
                        correctAnswer: correctAnswer || 'Not provided',
                        isCorrect,
                        type: 'true_false'
                    });
                } else if (section.type === 'short_answer' || section.type === 'long_answer') {
                    // For subjective questions, we'll mark them as "requires manual grading"
                    total++;
                    const userAnswer = this.userAnswers[questionId];
                    
                    details.push({
                        question: question.question || 'Question',
                        userAnswer: userAnswer || 'No answer',
                        correctAnswer: 'Requires manual grading',
                        isCorrect: null, // Cannot auto-grade
                        type: section.type
                    });
                }
            });
        });

        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        // Calculate auto-gradeable vs manual questions
        const autoGradeableQuestions = details.filter(d => d.isCorrect !== null).length;
        const manualGradingQuestions = details.filter(d => d.isCorrect === null).length;

        return {
            score: correct,
            total,
            percentage,
            details,
            autoGradeableQuestions,
            manualGradingQuestions
        };
    }
    
    /**
     * Check if fill-in-blank answer is correct
     */
    checkFillInBlankAnswer(userAnswer, correctAnswers) {
        if (!userAnswer || !correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length === 0) {
            return false;
        }

        const normalizedUserAnswer = userAnswer.toString().toLowerCase().trim();
        
        return correctAnswers.some(answer => {
            if (answer === null || answer === undefined) return false;
            return answer.toString().toLowerCase().trim() === normalizedUserAnswer;
        });
    }
    
    /**
     * Start timer
     */
    startTimer() {
        const timerDisplay = document.getElementById('timerDisplay');
        if (!timerDisplay) return;

        const updateTimer = () => {
            if (!this.startTime) return;
            
            const elapsed = new Date() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Update immediately and then every second
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    /**
     * Stop timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Render exam results page
     */
    renderExamResults(results, exam) {
        // Get time spent from results
        const formattedTime = results.timeTaken?.formatted || '0s';
        const timeSpent = results.timeTaken?.seconds || 0;
        
        let resultsHtml = `
            <div class="exam-results">
                <div class="text-center mb-4">
                    <h3>Exam Results</h3>
                    <h4>${exam.title || 'Exam'}</h4>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-3 text-center">
                        <div class="result-stat">
                            <div class="display-4 ${results.percentage >= 70 ? 'text-success' : 'text-danger'}">${results.percentage}%</div>
                            <div class="text-muted">Final Score</div>
                        </div>
                    </div>
                    <div class="col-md-3 text-center">
                        <div class="result-stat">
                            <div class="display-6">${results.score}/${results.autoGradeableQuestions || results.total}</div>
                            <div class="text-muted">Auto-graded</div>
                        </div>
                    </div>
                    <div class="col-md-3 text-center">
                        <div class="result-stat">
                            <div class="display-6">${formattedTime}</div>
                            <div class="text-muted">Time Spent</div>
                        </div>
                    </div>
                    <div class="col-md-3 text-center">
                        <div class="result-stat">
                            <div class="display-6 ${results.percentage >= 70 ? 'text-success' : 'text-danger'}">
                                ${results.percentage >= 70 ? 'PASS' : 'FAIL'}
                            </div>
                            <div class="text-muted">Result</div>
                        </div>
                    </div>
                </div>
                
                ${results.manualGradingQuestions > 0 ? `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> 
                    <strong>Note:</strong> ${results.manualGradingQuestions} question(s) require manual grading and are not included in the automatic score.
                </div>
                ` : ''}

                <div class="detailed-feedback">
                    <h5>Detailed Feedback</h5>
                    <div class="feedback-list">
        `;

        if (results.details && results.details.length > 0) {
            results.details.forEach((item, index) => {
                let badgeClass, iconClass, borderClass;
                
                if (item.isCorrect === null) {
                    // Manual grading required
                    badgeClass = 'bg-warning';
                    iconClass = 'fa-question';
                    borderClass = 'border-warning bg-light';
                } else if (item.isCorrect) {
                    // Correct
                    badgeClass = 'bg-success';
                    iconClass = 'fa-check';
                    borderClass = 'border-success bg-light';
                } else {
                    // Incorrect
                    badgeClass = 'bg-danger';
                    iconClass = 'fa-times';
                    borderClass = 'border-danger bg-light';
                }
                
                resultsHtml += `
                    <div class="feedback-item p-3 mb-2 border rounded ${borderClass}">
                        <div class="d-flex align-items-center">
                            <span class="badge ${badgeClass} me-2">Q${index + 1}</span>
                            <div class="flex-grow-1">
                                <div class="question-text mb-1">${item.question}</div>
                                <div class="answer-feedback">
                                    ${this.renderAnswerFeedback(item)}
                                </div>
                            </div>
                            <span class="${item.isCorrect === null ? 'text-warning' : (item.isCorrect ? 'text-success' : 'text-danger')}">
                                <i class="fas ${iconClass}"></i>
                            </span>
                        </div>
                    </div>
                `;
            });
        }

        resultsHtml += `
                    </div>
                </div>
            </div>
        `;

        return resultsHtml;
    }

    /**
     * Render exam in editable mode (textarea only, loads JSON content)
     */
    renderExamEditable(exam) {
        return `
            <textarea class="form-control" rows="20" id="editExamTextarea">${JSON.stringify(exam, null, 2)}</textarea>
        `;
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

    /**
     * Render answer feedback based on question type
     * @param {Object} item - Result detail item
     * @returns {string} HTML for answer feedback
     */
    renderAnswerFeedback(item) {
        if (item.type === 'multiple_choice' && item.options && item.options.length > 0) {
            let html = '<div class="options-feedback">';
            
            item.options.forEach((option, index) => {
                const isCorrect = item.correctIndex === index;
                const isUserChoice = item.userIndex === index;
                
                let optionClass = '';
                let iconHtml = '';
                
                if (isCorrect && isUserChoice) {
                    // User chose correct answer
                    optionClass = 'text-success fw-bold';
                    iconHtml = ' <i class="fas fa-check text-success"></i>';
                } else if (isCorrect && !isUserChoice) {
                    // Correct answer but user didn't choose it
                    optionClass = 'text-success fw-bold';
                    iconHtml = ' <i class="fas fa-check text-success"></i>';
                } else if (!isCorrect && isUserChoice) {
                    // User chose wrong answer
                    optionClass = 'text-danger';
                    iconHtml = ' <i class="fas fa-times text-danger"></i>';
                } else {
                    // Neither correct nor chosen
                    optionClass = 'text-muted';
                }
                
                html += `<div class="option-feedback ${optionClass}">
                    <span class="option-letter">${String.fromCharCode(65 + index)}.</span> ${option}${iconHtml}
                    ${isUserChoice ? ' <span class="badge bg-primary badge-sm ms-2">Your Choice</span>' : ''}
                </div>`;
            });
            
            html += '</div>';
            return html;
        } else if (item.type === 'true_false') {
            // Show true/false options with indicators
            const userChoice = item.userAnswer;
            const correctChoice = item.correctAnswer;
            
            let html = '<div class="options-feedback">';
            
            ['true', 'false'].forEach(option => {
                const isCorrect = correctChoice === option;
                const isUserChoice = userChoice === option;
                
                let optionClass = '';
                let iconHtml = '';
                
                if (isCorrect && isUserChoice) {
                    optionClass = 'text-success fw-bold';
                    iconHtml = ' <i class="fas fa-check text-success"></i>';
                } else if (isCorrect && !isUserChoice) {
                    optionClass = 'text-success fw-bold';
                    iconHtml = ' <i class="fas fa-check text-success"></i>';
                } else if (!isCorrect && isUserChoice) {
                    optionClass = 'text-danger';
                    iconHtml = ' <i class="fas fa-times text-danger"></i>';
                } else {
                    optionClass = 'text-muted';
                }
                
                html += `<div class="option-feedback ${optionClass}">
                    ${option.charAt(0).toUpperCase() + option.slice(1)}${iconHtml}
                    ${isUserChoice ? ' <span class="badge bg-primary badge-sm">Your Choice</span>' : ''}
                </div>`;
            });
            
            html += '</div>';
            return html;
        } else {
            // Default feedback for other question types
            return `
                <strong>Your answer:</strong> ${item.userAnswer || 'No answer'}<br>
                <strong>Correct answer:</strong> ${item.correctAnswer}
            `;
        }
    }

    /**
     * Make individual words in text clickable for text-to-speech and image search
     * @param {string} text - The text to process
     * @returns {string} HTML with clickable words as hyperlinks
     */
    makeWordsClickable(text) {
        console.log('=== makeWordsClickable called ===');
        console.log('Input text:', text);
        console.log('Input text length:', text.length);
        
        if (!text || typeof text !== 'string') {
            console.log('Invalid text input, returning original');
            return text;
        }
        
        // Split text into words while preserving punctuation and spacing
        const result = text.replace(/\b([a-zA-Z]+(?:'[a-zA-Z]+)?)\b/g, (match, word) => {
            // Clean word for search (remove any remaining punctuation)
            const cleanWord = word.replace(/[^\w']/g, '').toLowerCase();
            console.log('Processing word:', word, '-> cleanWord:', cleanWord);
            return `<a href="#" class="word-link" data-word="${cleanWord}" onclick="event.preventDefault(); window.handleWordClick(this, '${cleanWord}'); return false;">${word}</a>`;
        });
        
        console.log('Result text length:', result.length);
        console.log('Number of word links created:', (result.match(/word-link/g) || []).length);
        console.log('Sample result (first 200 chars):', result.substring(0, 200));
        
        return result;
    }

    /**
     * Set up word click functionality for reading comprehension passages
     */
    setupWordClick() {
        console.log('=== setupWordClick called ===');
        
        // Initialize speech synthesis
        this.initializeSpeech();
        
        console.log('setupWordClick completed - using inline onclick handlers');
        
        // Debug: Check if word links exist
        setTimeout(() => {
            const wordLinks = document.querySelectorAll('.word-link');
            console.log('Number of word links found:', wordLinks.length);
            if (wordLinks.length > 0) {
                console.log('First word link:', wordLinks[0]);
                console.log('First word text:', wordLinks[0].textContent);
                console.log('First word dataset:', wordLinks[0].dataset);
            }
        }, 100);
    }

    /**
     * Initialize speech synthesis
     */
    initializeSpeech() {
        if ('speechSynthesis' in window) {
            // Load voices
            speechSynthesis.getVoices();
            
            // Listen for voices changed event
            speechSynthesis.addEventListener('voiceschanged', () => {
                console.log('Speech synthesis voices loaded');
            });
        }
    }

    /**
     * Clean up event listeners
     */
    cleanup() {
        // No event listeners to clean up since we use inline onclick handlers
    }

    /**
     * Set submit button to "Close" state after exam submission
     */
    setSubmitButtonToClose() {
        const submitButton = document.getElementById('submitExamBtn');
        if (submitButton) {
            submitButton.textContent = 'Close';
            submitButton.className = 'btn btn-primary';
            
            // Remove any existing event listeners by cloning the button
            const newSubmitButton = submitButton.cloneNode(true);
            submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
            
            // Add close modal event listener
            newSubmitButton.addEventListener('click', () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('takeExamModal'));
                if (modal) modal.hide();
            });
        }
    }

    /**
     * Reset submit button to initial "Submit Exam" state
     */
    resetSubmitButton() {
        const submitButton = document.getElementById('submitExamBtn');
        if (submitButton) {
            submitButton.textContent = 'Submit Exam';
            submitButton.className = 'btn btn-success';
            
            // Remove any existing event listeners by cloning the button
            const newSubmitButton = submitButton.cloneNode(true);
            submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
            
            // Re-add the submit event listener
            newSubmitButton.addEventListener('click', () => {
                if (window.examApp) {
                    window.examApp.submitExam();
                }
            });
        }
    }
}

// Export for use in other modules
window.ExamRenderer = ExamRenderer;

// Global function to handle word clicks from hyperlinks
window.handleWordClick = function(element, word) {
    console.log('=== Global handleWordClick called ===');
    console.log('Element:', element);
    console.log('Word:', word);
    console.log('Element text:', element.textContent);
    
    // Visual feedback - highlight the clicked word
    element.style.backgroundColor = '#ffeb3b';
    element.style.fontWeight = 'bold';
    setTimeout(() => {
        element.style.backgroundColor = '';
        element.style.fontWeight = '';
    }, 1000);
    
    // Speak the word immediately
    console.log('About to speak word:', word);
    window.speakWord(word);
    
    // Update iframe with Google Images search for the word
    const imageFrame = document.getElementById('imageSearchFrame');
    if (imageFrame) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(word)}&udm=2`;
        imageFrame.src = searchUrl;
        console.log('Updated image search iframe for:', word);
    }
    
    // Update dict.cn iframe with the word
    const translateFrame = document.getElementById('translateFrame');
    if (translateFrame) {
        const dictUrl = `https://dict.cn/${encodeURIComponent(word)}`;
        translateFrame.src = dictUrl;
        console.log('Updated dict.cn iframe for:', word);
    }
    
    console.log('handleWordClick completed');
};

// Make speakWord globally accessible
window.speakWord = function(word) {
    console.log('=== Global speakWord called ===');
    console.log('Word:', word);
    
    if ('speechSynthesis' in window) {
        try {
            console.log('Global: Cancelling speech...');
            speechSynthesis.cancel();
            
            // Wait a moment for cancel to complete
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.rate = 0.5;  // Slower speech rate (0.1 to 10, default is 1)
                utterance.pitch = 1;
                utterance.volume = 1;
                
                const voices = speechSynthesis.getVoices();
                console.log('Global: Available voices:', voices.length);
                
                if (voices.length > 0) {
                    const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
                    if (englishVoice) {
                        utterance.voice = englishVoice;
                        console.log('Global: Using voice:', englishVoice.name);
                    }
                }
                
                utterance.onstart = () => console.log('Global: Speech started for:', word);
                utterance.onend = () => console.log('Global: Speech ended for:', word);
                utterance.onerror = (e) => {
                    console.error('Global: Speech error:', e);
                    // Fallback alert
                    alert(`Speaking: ${word}`);
                };
                
                console.log('Global: About to speak...');
                speechSynthesis.speak(utterance);
                console.log('Global: speak() called');
            }, 50);
            
        } catch (error) {
            console.error('Global: Speech error:', error);
            alert(`Speaking: ${word}`);
        }
    } else {
        console.error('Global: Speech synthesis not available');
        alert(`Speaking: ${word}`);
    }
};
