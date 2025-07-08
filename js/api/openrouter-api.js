/**
 * OpenRouter API Module
 * Handles communication with OpenRouter AI service
 */

class OpenRouterAPI {
    constructor(configManager, notificationManager) {
        this.configManager = configManager;
        this.notificationManager = notificationManager;
        this.token = '';
    }

    /**
     * Set OpenRouter API token
     * @param {string} token - OpenRouter API token
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Check if API is configured
     * @returns {boolean} True if token is set
     */
    isConfigured() {
        return !!this.token;
    }

    /**
     * Generate exam content using OpenRouter AI
     * Supports streaming responses and captures AI reasoning when available
     * @param {Object} formData - Exam generation parameters
     * @param {Object} progress - Progress callback for UI updates
     * @returns {Promise<Object>} Generated exam content
     */
    async generateExamContent(formData, progress = null) {
        if (!this.isConfigured()) {
            throw new Error('OpenRouter API token not configured');
        }

        const config = this.configManager.getOpenRouterConfig();
        const prompt = this.buildExamPrompt(formData);
        
        // Log the full prompt that will be sent to OpenRouter AI
        console.log('Full AI Prompt to be sent:');
        console.log('----------------------------------------');
        console.log(prompt);
        console.log('----------------------------------------');

        try {
            if (progress) {
                progress.update('🤖 AI is thinking...');
            }
            
            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Online Exam Generator'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: config.maxTokens,
                    temperature: 0.7,
                    top_p: 0.9,
                    stream: true // Enable streaming for real-time display
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenRouter API error (${response.status}): ${errorData.error?.message || response.statusText}`);
            }

            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let generatedContent = '';
            let accumulatedReasoning = '';
            let buffer = '';

            if (progress) {
                progress.update('🤖 AI Response (Streaming):\n\n');
            }

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    
                    // Split by lines for SSE format
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line
                    
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        
                        let data = line;
                        if (line.startsWith('data: ')) {
                            data = line.slice(6);
                        }
                        
                        if (data === '[DONE]') continue;
                        if (data.trim() === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            console.log('Parsed SSE data:', parsed); // Debug log
                            
                            // Check for content in different possible locations
                            let content = null;
                            let reasoning = null;
                            
                            if (parsed.choices && parsed.choices[0]) {
                                if (parsed.choices[0].delta) {
                                    content = parsed.choices[0].delta.content;
                                    reasoning = parsed.choices[0].delta.reasoning;
                                } else if (parsed.choices[0].message) {
                                    content = parsed.choices[0].message.content;
                                    reasoning = parsed.choices[0].message.reasoning;
                                }
                            }
                            
                            // Accumulate reasoning if available
                            if (reasoning) {
                                accumulatedReasoning += reasoning;
                                console.log('AI Reasoning chunk:', reasoning);
                            }
                            
                            if (content) {
                                generatedContent += content;
                                console.log('Content chunk:', content); // Debug log
                                console.log('Total content so far:', generatedContent.length, 'chars'); // Debug log
                                
                                // Update progress with streaming content and reasoning
                                if (progress) {
                                    const reasoningText = accumulatedReasoning ? `🧠 AI Reasoning: ${accumulatedReasoning}\n\n` : '';
                                    progress.update(`${reasoningText}🤖 AI Response (Streaming):\n\n${generatedContent}`);
                                }
                            } else if (reasoning && progress) {
                                // Update reasoning even if no content in this chunk
                                const reasoningText = accumulatedReasoning ? `🧠 AI Reasoning: ${accumulatedReasoning}\n\n` : '';
                                progress.update(`${reasoningText}🤖 AI Response (Streaming):\n\n${generatedContent}`);
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse SSE data:', data, parseError);
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            // Fallback: if no content was streamed, try to parse as regular JSON
            if (!generatedContent.trim()) {
                console.log('No streaming content received, trying fallback...');
                try {
                    const fallbackResponse = await fetch(config.apiUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': window.location.origin,
                            'X-Title': 'Exam Generator'
                        },
                        body: JSON.stringify({
                            model: config.model,
                            messages: [{
                                role: 'user',
                                content: prompt
                            }],
                            max_tokens: config.maxTokens,
                            temperature: 0.7,
                            top_p: 0.9,
                            stream: false
                        })
                    });
                    
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        console.log('Fallback response data:', fallbackData); // Debug log
                        
                        if (fallbackData.choices && fallbackData.choices[0] && fallbackData.choices[0].message) {
                            generatedContent = fallbackData.choices[0].message.content;
                            
                            // Check for reasoning in fallback response
                            const reasoning = fallbackData.choices[0].message.reasoning;
                            if (reasoning && progress) {
                                console.log('AI Reasoning (fallback):', reasoning);
                                progress.update(`🧠 AI Reasoning: ${reasoning}\n\n🤖 AI Response:\n\n${generatedContent}`);
                            }
                        }
                    }
                } catch (fallbackError) {
                    console.warn('Fallback request also failed:', fallbackError);
                }
            }

            if (!generatedContent.trim()) {
                throw new Error('No content generated from OpenRouter API');
            }

            // Show the complete AI response
            if (progress) {
                const reasoningText = accumulatedReasoning ? `🧠 AI Reasoning: ${accumulatedReasoning}\n\n` : '';
                progress.update(`${reasoningText}✅ Complete AI Response:\n\n${generatedContent}`);
                // Wait to let user read the full response
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Clean the content by removing thinking tags and other artifacts
            generatedContent = this.cleanAIResponse(generatedContent);
            
            if (progress) {
                progress.update(`🔧 Processing and parsing exam structure...\n\nCleaned content:\n${generatedContent.substring(0, 800)}${generatedContent.length > 800 ? '...' : ''}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            return await this.parseGeneratedContent(generatedContent, formData, progress);

        } catch (error) {
            console.error('OpenRouter API error:', error);
            throw new Error(`Failed to generate content: ${error.message}`);
        }
    }

    /**
     * Build exam generation prompt
     * @param {Object} formData - Form data from user
     * @returns {string} Formatted prompt for AI
     */
    buildExamPrompt(formData) {
        let prompt = `Generate an educational exam for ${formData.subject}.

The exam should have ${formData.sections.length} sections with the following specifications:

`;

        // Build section requirements
        formData.sections.forEach((section, index) => {
            prompt += `SECTION ${section.id}: ${this.getQuestionTypeDescription(section.type)}\n`;
            
            if (section.referenceSectionId) {
                prompt += `- Use the same content/passage as Section ${section.referenceSectionId}\n`;
            }
            
            if (section.prompt) {
                prompt += `- Specific requirements: ${section.prompt}\n`;
            }
            
            if (section.type === 'reading_comprehension') {
                prompt += `- This section should ONLY contain a reading passage, NO questions\n`;
                prompt += `- Questions based on this passage will be in subsequent sections\n`;
                
                // Handle passage length
                let lengthDescription = '3 sentences';
                if (section.passageLength) {
                    // Check if it's a number (new format) or text (old format)
                    const passageLength = parseInt(section.passageLength);
                    if (!isNaN(passageLength)) {
                        // New numeric format
                        lengthDescription = `${passageLength} sentence${passageLength === 1 ? '' : 's'}`;
                    } else {
                        // Old text format (for backward compatibility)
                        switch (section.passageLength) {
                            case 'short':
                                lengthDescription = '2-3 sentences';
                                break;
                            case 'medium':
                                lengthDescription = '3-5 sentences';
                                break;
                            case 'long':
                                lengthDescription = '5-8 sentences';
                                break;
                            default:
                                lengthDescription = '3 sentences';
                        }
                    }
                }
                
                if (section.prompt) {
                    prompt += `- Passage requirements: ${section.prompt} (${lengthDescription})\n`;
                } else {
                    prompt += `- Generate a passage of ${lengthDescription} appropriate for the topic\n`;
                }
            }
            
            if (section.type === 'fill_in_blank' && section.fillBlankStyle) {
                switch (section.fillBlankStyle) {
                    case 'no_hints':
                        prompt += `- Fill-in-blank style: No hints provided, students input answers directly\n`;
                        break;
                    case 'with_hints':
                        prompt += `- Fill-in-blank style: Include helpful hints in brackets directly after the blank in the question text (e.g., "She ____ (follow) the white rabbit yesterday.")\n`;
                        break;
                    case 'answer_list':
                        prompt += `- Fill-in-blank style: Provide a list of all answers at the top of the section\n`;
                        break;
                }
            }
            
            prompt += '\n';
        });

        prompt += `FORMAT INSTRUCTIONS:
Return the response as a valid JSON object with this exact structure:

{
    "title": "Exam title",
    "subject": "${formData.subject}",
    "sections": [`;

        // Add format examples for each section type
        formData.sections.forEach((section, index) => {
            if (index > 0) prompt += ',';
            prompt += '\n        {\n';
            prompt += `            "id": ${section.id},\n`;
            prompt += `            "type": "${section.type}",\n`;
            prompt += `            "title": "Section title",\n`;
            
            switch (section.type) {
                case 'fill_in_blank':
                    if (section.fillBlankStyle === 'answer_list') {
                        prompt += `            "answerList": ["answer1", "answer2", "answer3"],\n`;
                    }
                    prompt += `            "questions": [\n`;
                    prompt += `                {\n`;
                    if (section.fillBlankStyle === 'with_hints') {
                        prompt += `                    "question": "She ____ (follow) the white rabbit yesterday.",\n`;
                        prompt += `                    "answer": "followed"\n`;
                    } else {
                        prompt += `                    "question": "Question text with _____ for blanks",\n`;
                        prompt += `                    "answer": "correct answer"\n`;
                    }
                    prompt += `                }\n`;
                    prompt += `            ]`;
                    break;
                    
                case 'multiple_choice':
                    prompt += `            "questions": [\n`;
                    prompt += `                {\n`;
                    prompt += `                    "question": "Question text",\n`;
                    prompt += `                    "options": ["Option A", "Option B", "Option C", "Option D"],\n`;
                    prompt += `                    "correct": 0\n`;
                    prompt += `                }\n`;
                    prompt += `            ]`;
                    break;
                    
                case 'true_false':
                    prompt += `            "questions": [\n`;
                    prompt += `                {\n`;
                    prompt += `                    "question": "Statement to evaluate",\n`;
                    prompt += `                    "correct": true\n`;
                    prompt += `                }\n`;
                    prompt += `            ]`;
                    break;
                    
                case 'reading_comprehension':
                    // Generate sentence count description for passage
                    let sentenceCount = '3';
                    if (section.passageLength) {
                        const passageLength = parseInt(section.passageLength);
                        if (!isNaN(passageLength)) {
                            sentenceCount = passageLength.toString();
                        } else {
                            // Backward compatibility with old format
                            sentenceCount = section.passageLength === 'short' ? '2-3' : section.passageLength === 'long' ? '5-8' : '3-5';
                        }
                    }
                    prompt += `            "passage": "Reading passage text (${sentenceCount} sentence${sentenceCount === '1' ? '' : 's'})"\n`;
                    prompt += `            // NO questions property - questions will be in subsequent sections that reference this passage`;
                    break;
                    
                case 'short_answer':
                    prompt += `            "questions": [\n`;
                    prompt += `                {\n`;
                    prompt += `                    "question": "Question text",\n`;
                    prompt += `                    "keywords": ["keyword1", "keyword2"]\n`;
                    prompt += `                }\n`;
                    prompt += `            ]`;
                    break;
                    
                case 'long_answer':
                    prompt += `            "questions": [\n`;
                    prompt += `                {\n`;
                    prompt += `                    "question": "Question text",\n`;
                    prompt += `                    "modelAnswer": "Detailed model answer"\n`;
                    prompt += `                }\n`;
                    prompt += `            ]`;
                    break;
                    
                case 'sentence_ordering':
                    prompt += `            "questions": [\n`;
                    prompt += `                {\n`;
                    prompt += `                    "question": "Instructions for ordering",\n`;
                    prompt += `                    "sentences": ["Sentence 1", "Sentence 2", "Sentence 3"],\n`;
                    prompt += `                    "correctOrder": [0, 1, 2]\n`;
                    prompt += `                }\n`;
                    prompt += `            ]`;
                    break;
            }
            prompt += '\n        }';
        });

        prompt += `
    ]
}

IMPORTANT GUIDELINES:
- Include 5-10 questions per section
- Make questions clear and educational
- Provide realistic options for multiple choice questions
- Use appropriate difficulty level for the topic
- When sections reference other sections, use the exact same passage/content
- Ensure all JSON is valid and properly formatted
- Follow the specific fill-in-blank styles as requested

Generate high-quality, educational content that tests real understanding of ${formData.subject}.`;

        return prompt;
    }

    /**
     * Get description for a single question type
     * @param {string} type - Question type
     * @returns {string} Description
     */
    getQuestionTypeDescription(type) {
        const descriptions = {
            fill_in_blank: 'Fill in the Blank - questions with missing words to complete',
            multiple_choice: 'Multiple Choice - questions with 4 answer options',
            true_false: 'True/False - binary choice questions',
            sentence_ordering: 'Sentence Ordering - arrange sentences in correct order',
            short_answer: 'Short Answer - brief responses with keyword matching',
            long_answer: 'Long Answer - detailed responses requiring comprehensive answers',
            reading_comprehension: 'Reading Comprehension - passage-based questions'
        };
        return descriptions[type] || type;
    }

    /**
     * Parse generated content from AI response
     * @param {string} content - Raw AI response
     * @param {Object} formData - Original form data
     * @returns {Object} Parsed exam content
     */
    async parseGeneratedContent(content, formData, progress = null) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                if (progress) {
                    progress.update(`✅ Exam Successfully Generated!\n\nTitle: ${parsed.title}\nSections: ${parsed.sections?.length || 0}\nTotal Questions: ${parsed.sections?.reduce((total, section) => total + (section.questions?.length || 0), 0) || 0}\n\nFinal Structure:\n${JSON.stringify(parsed, null, 2).substring(0, 600)}...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                // Validate the structure
                if (this.validateExamStructure(parsed)) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Failed to parse AI-generated JSON:', error);
            this.notificationManager.show('Failed to parse the AI response. The generated content was not in the expected format.', 'error');
            throw new Error('Failed to parse AI-generated content: Invalid JSON format');
        }

        // If we reach here, validation failed
        console.error('AI response validation failed: Invalid exam structure');
        this.notificationManager.show('The AI generated content with an invalid structure. Please try again.', 'error');
        throw new Error('AI-generated content validation failed: Invalid exam structure');
    }

    /**
     * Validate exam structure
     * @param {Object} exam - Exam object to validate
     * @returns {boolean} True if structure is valid
     */
    validateExamStructure(exam) {
        try {
            if (!exam.title || !exam.subject || !Array.isArray(exam.sections)) {
                return false;
            }

            for (const section of exam.sections) {
                if (!section.type || !section.title) {
                    return false;
                }

                // Reading comprehension sections should NOT have questions
                if (section.type === 'reading_comprehension') {
                    if (!section.passage) {
                        return false;
                    }
                    // Should not have questions array or it should be empty
                    if (section.questions && section.questions.length > 0) {
                        return false;
                    }
                } else {
                    // All other sections should have questions
                    if (!Array.isArray(section.questions) || section.questions.length === 0) {
                        return false;
                    }

                    for (const question of section.questions) {
                        if (!question.question) {
                            return false;
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        if (!this.isConfigured()) {
            return false;
        }

        try {
            const config = this.configManager.getOpenRouterConfig();
            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 10
                })
            });

            return response.ok;
        } catch (error) {
            console.error('OpenRouter connection test failed:', error);
            return false;
        }
    }

    /**
     * Get API status information
     * @returns {Object} API status details
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            model: this.configManager.getOpenRouterConfig().model,
            baseUrl: this.configManager.getOpenRouterConfig().baseUrl
        };
    }

    /**
     * Clean AI response by removing thinking tags and other artifacts
     * @param {string} content - Raw AI response content
     * @returns {string} Cleaned content
     */
    cleanAIResponse(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }

        // Remove thinking tags (various formats)
        let cleaned = content
            // Remove ◁think▷...◁/think▷ blocks
            .replace(/◁think▷[\s\S]*?◁\/think▷/g, '')
            // Remove <think>...</think> blocks
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            // Remove [THINKING]...[/THINKING] blocks
            .replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '')
            // Remove <!-- thinking -->...<!-- /thinking --> blocks
            .replace(/<!--\s*thinking\s*-->[\s\S]*?<!--\s*\/thinking\s*-->/g, '')
            // Remove other common thinking patterns
            .replace(/◁think▷[\s\S]*$/g, '') // Remove if thinking tag is not closed
            .replace(/^[\s\S]*?◁\/think▷/g, '') // Remove if starts with closing tag
            // Clean up extra whitespace
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();

        console.log('AI Response cleaned:', {
            originalLength: content.length,
            cleanedLength: cleaned.length,
            removedContent: content.length - cleaned.length > 0
        });

        return cleaned;
    }

    /**
     * Fetch available models from OpenRouter
     * @returns {Promise<Array>} Array of available models
     */
    async fetchAvailableModels() {
        if (!this.isConfigured()) {
            throw new Error('OpenRouter API token not configured');
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.data || [];

        } catch (error) {
            console.error('Error fetching OpenRouter models:', error);
            throw error;
        }
    }

    /**
     * Get free models only
     * @returns {Promise<Array>} Array of free models
     */
    async getFreeModels() {
        try {
            const allModels = await this.fetchAvailableModels();
            
            // Filter for free models (pricing.prompt = "0" or has "free" in the name/id)
            const freeModels = allModels.filter(model => {
                const isFreeByPricing = model.pricing && 
                    (model.pricing.prompt === "0" || 
                     model.pricing.prompt === 0 || 
                     parseFloat(model.pricing.prompt) === 0);
                
                const isFreeByName = model.id && 
                    (model.id.includes(':free') || 
                     model.id.includes('free') || 
                     model.name?.toLowerCase().includes('free'));
                
                return isFreeByPricing || isFreeByName;
            });

            // Sort by name for better UX
            return freeModels.sort((a, b) => {
                const nameA = a.name || a.id || '';
                const nameB = b.name || b.id || '';
                return nameA.localeCompare(nameB);
            });

        } catch (error) {
            console.error('Error getting free models:', error);
            this.notificationManager.show('Failed to fetch available models from OpenRouter API.', 'error');
            throw error;
        }
    }

    /**
     * Validate if a model ID is available
     * @param {string} modelId - Model ID to validate
     * @returns {Promise<boolean>} True if model is available
     */
    async validateModel(modelId) {
        try {
            const models = await this.fetchAvailableModels();
            return models.some(model => model.id === modelId);
        } catch (error) {
            console.error('Model validation failed:', error);
            this.notificationManager.show('Failed to validate model availability.', 'error');
            throw error;
        }
    }
}

// Export for use in other modules
window.OpenRouterAPI = OpenRouterAPI;
