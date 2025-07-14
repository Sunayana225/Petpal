// Direct API approach for Gemini 2.5 Flash (latest model)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface AIFoodSafetyResponse {
  food: string;
  pet: string;
  safety: 'safe' | 'unsafe' | 'caution' | 'unknown';
  message: string;
  details: {
    description: string;
    symptoms?: string[];
    benefits?: string[];
    alternatives?: string[];
    preparation?: string;
    recommendation?: string;
    severity?: 'low' | 'medium' | 'high';
  };
}

export class AIService {
  private static isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  private static getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  static async getFoodSafetyAdvice(food: string, pet: string): Promise<AIFoodSafetyResponse> {
    // If Gemini is not configured, return a helpful fallback
    if (!this.isConfigured()) {
      console.log('Gemini API Key not configured');
      return this.getFallbackResponse(food, pet);
    }

    try {
      const apiKey = this.getApiKey();
      console.log('Gemini API Key configured:', !!apiKey);
      console.log('API Key length:', apiKey?.length);

      if (!apiKey) {
        console.log('No API key found, falling back');
        return this.getFallbackResponse(food, pet);
      }

      const prompt = this.buildPrompt(food, pet);
      const systemPrompt = "You are a veterinary nutrition expert. Provide accurate, evidence-based information about pet food safety. Always err on the side of caution and recommend consulting a veterinarian for specific cases.";

      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            candidateCount: 1
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        return this.getFallbackResponse(food, pet);
      }

      return this.parseAIResponse(text, food, pet);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getFallbackResponse(food, pet);
    }
  }

  private static buildPrompt(food: string, pet: string): string {
    return `As a veterinary nutrition expert, provide a comprehensive analysis of "${food}" for ${pet}.

IMPORTANT: Format your response as clean, readable text without any markdown symbols (no *, #, -, etc.). Use simple paragraphs and clear section headers.

Structure your response exactly as follows:

SAFETY ASSESSMENT:
Overall Safety Level: [SAFE/UNSAFE/CAUTION]

Detailed Explanation:
[Provide clear explanation in plain text paragraphs without bullet points or markdown]

NUTRITIONAL INFORMATION:
Key Nutrients and Benefits:
[List benefits in clear sentences without bullet points]

Potential Health Risks:
[Detail any risks in clear sentences without bullet points]

PREPARATION GUIDELINES:
Safe Preparation:
[Explain preparation methods in plain text]

What to Avoid:
[List what to avoid in plain text]

SERVING RECOMMENDATIONS:
Recommended Amount:
[Specific serving guidance in plain text]

Frequency:
[How often it can be given in plain text]

EMERGENCY INFORMATION:
Warning Signs:
[Symptoms to watch for in plain text]

If Consumed Inappropriately:
[What to do in plain text]

ALTERNATIVES:
[Suggest safer alternatives if needed in plain text]

Please provide specific, practical advice using only plain text formatting. No asterisks, hashes, dashes, or other markdown symbols. Keep paragraphs clear and concise.`;
  }

  private static parseAIResponse(response: string, food: string, pet: string): AIFoodSafetyResponse {
    // Improved parsing logic to better understand AI responses
    const lowerResponse = response.toLowerCase();

    let safety: 'safe' | 'unsafe' | 'caution' | 'unknown' = 'unknown';
    let severity: 'low' | 'medium' | 'high' | undefined;

    // Look for explicit safety declarations first - prioritize specific patterns
    if (lowerResponse.includes('safety level: caution') ||
        lowerResponse.includes('**safety level:** caution') ||
        lowerResponse.includes('caution (not recommended)') ||
        lowerResponse.includes('level: caution') ||
        (lowerResponse.includes('caution') && lowerResponse.includes('not recommended'))) {
      safety = 'caution';
    } else if (lowerResponse.includes('safety level: safe') ||
               lowerResponse.includes('**safety level:** safe') ||
               lowerResponse.includes('level: safe') ||
               (lowerResponse.includes('safe') &&
                !lowerResponse.includes('not safe') &&
                !lowerResponse.includes('unsafe'))) {
      safety = 'safe';
    } else if (lowerResponse.includes('safety level: unsafe') ||
               lowerResponse.includes('**safety level:** unsafe') ||
               lowerResponse.includes('level: unsafe') ||
               lowerResponse.includes('toxic') ||
               lowerResponse.includes('dangerous') ||
               (lowerResponse.includes('not safe') && !lowerResponse.includes('caution'))) {
      safety = 'unsafe';
    } else if (lowerResponse.includes('moderation') ||
               lowerResponse.includes('with caution') ||
               lowerResponse.includes('limited amounts')) {
      safety = 'caution';
    }

    // Determine severity for unsafe foods
    if (safety === 'unsafe') {
      if (lowerResponse.includes('severe') || lowerResponse.includes('fatal') || lowerResponse.includes('death')) {
        severity = 'high';
      } else if (lowerResponse.includes('moderate') || lowerResponse.includes('medium')) {
        severity = 'medium';
      } else {
        severity = 'low';
      }
    }

    // Generate appropriate message
    let message = '';
    switch (safety) {
      case 'safe':
        message = `✅ ${food} appears to be SAFE for ${pet} based on Gemini AI analysis! (AI-assisted)`;
        break;
      case 'unsafe':
        message = `⚠️ ${food} appears to be NOT SAFE for ${pet} based on Gemini AI analysis! (AI-assisted)`;
        break;
      case 'caution':
        message = `⚠️ ${food} should be given with CAUTION to ${pet} based on Gemini AI analysis! (AI-assisted)`;
        break;
      default:
        message = `❓ Gemini AI analysis suggests consulting your veterinarian about ${food} for ${pet}. (AI-assisted)`;
    }

    // Extract more detailed information from the response
    const symptoms = this.extractSymptoms(response);
    const benefits = this.extractBenefits(response);
    const alternatives = this.extractAlternatives(response);
    const preparation = this.extractPreparation(response);

    return {
      food,
      pet,
      safety,
      message,
      details: {
        description: this.formatStructuredDescription(response),
        symptoms,
        benefits,
        alternatives,
        preparation,
        recommendation: "This is a Gemini AI-generated response. Please consult your veterinarian for definitive advice.",
        severity
      }
    };
  }

  private static extractSymptoms(response: string): string[] {
    const symptoms: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Look for symptom-related sections
    const symptomKeywords = ['symptoms', 'signs', 'effects', 'reactions'];
    for (const keyword of symptomKeywords) {
      const index = lowerResponse.indexOf(keyword);
      if (index !== -1) {
        // Extract text after the keyword
        const section = response.substring(index, index + 300);
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.includes('-') || line.includes('•')) {
            const symptom = line.replace(/[-•*]/g, '').trim();
            if (symptom.length > 5 && symptom.length < 100) {
              symptoms.push(symptom);
            }
          }
        }
      }
    }

    return symptoms.slice(0, 5); // Limit to 5 symptoms
  }

  private static extractBenefits(response: string): string[] {
    const benefits: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Look for benefit-related sections
    const benefitKeywords = ['benefits', 'nutrients', 'vitamins', 'minerals', 'good for'];
    for (const keyword of benefitKeywords) {
      const index = lowerResponse.indexOf(keyword);
      if (index !== -1) {
        const section = response.substring(index, index + 300);
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.includes('-') || line.includes('•')) {
            const benefit = line.replace(/[-•*]/g, '').trim();
            if (benefit.length > 5 && benefit.length < 100) {
              benefits.push(benefit);
            }
          }
        }
      }
    }

    return benefits.slice(0, 5); // Limit to 5 benefits
  }

  private static extractAlternatives(response: string): string[] {
    const alternatives: string[] = [];
    const lowerResponse = response.toLowerCase();

    // Look for alternative-related sections
    const altKeywords = ['alternatives', 'instead', 'substitute', 'replace'];
    for (const keyword of altKeywords) {
      const index = lowerResponse.indexOf(keyword);
      if (index !== -1) {
        const section = response.substring(index, index + 200);
        const lines = section.split('\n');
        for (const line of lines) {
          if (line.includes('-') || line.includes('•')) {
            const alt = line.replace(/[-•*]/g, '').trim();
            if (alt.length > 3 && alt.length < 50) {
              alternatives.push(alt);
            }
          }
        }
      }
    }

    return alternatives.slice(0, 3); // Limit to 3 alternatives
  }

  private static extractPreparation(response: string): string | undefined {
    const lowerResponse = response.toLowerCase();

    // Look for preparation-related sections
    const prepKeywords = ['preparation', 'prepare', 'cooking', 'serving'];
    for (const keyword of prepKeywords) {
      const index = lowerResponse.indexOf(keyword);
      if (index !== -1) {
        const section = response.substring(index, index + 200);
        const sentences = section.split('.');
        for (const sentence of sentences) {
          if (sentence.length > 20 && sentence.length < 150) {
            return sentence.trim();
          }
        }
      }
    }

    return undefined;
  }

  private static getFallbackResponse(food: string, pet: string): AIFoodSafetyResponse {
    return {
      food,
      pet,
      safety: 'unknown',
      message: `We don't have specific information about ${food} for ${pet}. Please consult your veterinarian to be safe.`,
      details: {
        description: `Our database doesn't contain information about ${food} for ${pet}. This doesn't necessarily mean it's unsafe, but we recommend getting professional veterinary advice.`,
        recommendation: "Consult your veterinarian for specific dietary advice about this food item.",
        alternatives: ["commercial pet food", "veterinarian-approved treats"]
      }
    };
  }

  private static formatStructuredDescription(response: string): string {
    // Parse the AI response into structured sections
    const sections = this.parseResponseSections(response);

    let formatted = "## 🔍 AI Analysis\n\n";

    // Safety Assessment
    if (sections.safetyAssessment) {
      formatted += "### 🛡️ Safety Assessment\n";
      formatted += this.formatSectionWithBullets(sections.safetyAssessment) + "\n\n";
    }

    // Nutritional Information
    if (sections.nutritionalInfo) {
      formatted += "### 🥗 Nutritional Information\n";
      formatted += this.formatSectionWithBullets(sections.nutritionalInfo) + "\n\n";
    }

    // Health Risks
    if (sections.healthRisks) {
      formatted += "### ⚠️ Potential Health Risks\n";
      formatted += this.formatSectionWithBullets(sections.healthRisks) + "\n\n";
    }

    // Preparation Guidelines
    if (sections.preparation) {
      formatted += "### 👨‍🍳 Preparation Guidelines\n";
      formatted += this.formatPreparationSection(sections.preparation) + "\n\n";
    }

    // Serving Recommendations
    if (sections.serving) {
      formatted += "### 📏 Serving Recommendations\n";
      formatted += this.formatServingSection(sections.serving) + "\n\n";
    }

    // Emergency Information
    if (sections.emergency) {
      formatted += "### 🚨 Emergency Information\n";
      formatted += this.formatEmergencySection(sections.emergency) + "\n\n";
    }

    // Alternatives
    if (sections.alternatives) {
      formatted += "### 🔄 Alternatives\n";
      formatted += this.formatSectionWithBullets(sections.alternatives) + "\n\n";
    }

    return formatted.trim();
  }

  private static parseResponseSections(response: string): {
    safetyAssessment?: string;
    nutritionalInfo?: string;
    healthRisks?: string;
    preparation?: string;
    serving?: string;
    emergency?: string;
    alternatives?: string;
  } {
    const sections: any = {};

    // Define section patterns
    const sectionPatterns = [
      { key: 'safetyAssessment', patterns: ['SAFETY ASSESSMENT:', 'Overall Safety Level:', 'Detailed Explanation:'] },
      { key: 'nutritionalInfo', patterns: ['NUTRITIONAL INFORMATION:', 'Key Nutrients and Benefits:', 'Nutrients and Benefits:'] },
      { key: 'healthRisks', patterns: ['Potential Health Risks:', 'Health Risks:', 'Risks:'] },
      { key: 'preparation', patterns: ['PREPARATION GUIDELINES:', 'Safe Preparation:', 'Preparation:'] },
      { key: 'serving', patterns: ['SERVING RECOMMENDATIONS:', 'Recommended Amount:', 'Serving:'] },
      { key: 'emergency', patterns: ['EMERGENCY INFORMATION:', 'Warning Signs:', 'Emergency:'] },
      { key: 'alternatives', patterns: ['ALTERNATIVES:', 'Safer alternatives', 'Alternative:'] }
    ];

    for (const section of sectionPatterns) {
      for (const pattern of section.patterns) {
        const index = response.indexOf(pattern);
        if (index !== -1) {
          // Find the end of this section (next section or end of text)
          let endIndex = response.length;
          for (const otherSection of sectionPatterns) {
            if (otherSection.key !== section.key) {
              for (const otherPattern of otherSection.patterns) {
                const otherIndex = response.indexOf(otherPattern, index + pattern.length);
                if (otherIndex !== -1 && otherIndex < endIndex) {
                  endIndex = otherIndex;
                }
              }
            }
          }

          const sectionText = response.substring(index + pattern.length, endIndex).trim();
          if (sectionText.length > 10) {
            sections[section.key] = this.cleanSectionText(sectionText);
            break; // Found this section, move to next
          }
        }
      }
    }

    return sections;
  }

  private static cleanSectionText(text: string): string {
    return text
      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .replace(/^\s+/gm, '') // Remove leading whitespace
      .trim();
  }

  private static formatSectionWithBullets(text: string): string {
    // Split text into sentences and format as bullet points
    const sentences = text.split(/\.\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10); // Filter out very short fragments

    return sentences.map(sentence => {
      // Clean up the sentence
      let cleaned = sentence.trim();
      if (!cleaned.endsWith('.')) cleaned += '.';
      return `• ${cleaned}`;
    }).join('\n');
  }

  private static formatPreparationSection(text: string): string {
    let formatted = '';

    // Look for "Safe Preparation:" and "What to Avoid:" subsections
    const safeIndex = text.indexOf('Safe Preparation:');
    const avoidIndex = text.indexOf('What to Avoid:');

    if (safeIndex !== -1) {
      const safeEndIndex = avoidIndex !== -1 ? avoidIndex : text.length;
      const safeText = text.substring(safeIndex + 'Safe Preparation:'.length, safeEndIndex).trim();

      formatted += "**✅ Safe Preparation:**\n";
      formatted += this.formatSectionWithBullets(safeText) + "\n\n";
    }

    if (avoidIndex !== -1) {
      const avoidText = text.substring(avoidIndex + 'What to Avoid:'.length).trim();

      formatted += "**❌ What to Avoid:**\n";
      formatted += this.formatSectionWithBullets(avoidText);
    }

    // If no subsections found, format the whole text
    if (safeIndex === -1 && avoidIndex === -1) {
      formatted = this.formatSectionWithBullets(text);
    }

    return formatted.trim();
  }

  private static formatServingSection(text: string): string {
    let formatted = '';

    // Look for "Recommended Amount:" and "Frequency:" subsections
    const amountIndex = text.indexOf('Recommended Amount:');
    const frequencyIndex = text.indexOf('Frequency:');

    if (amountIndex !== -1) {
      const amountEndIndex = frequencyIndex !== -1 ? frequencyIndex : text.length;
      const amountText = text.substring(amountIndex + 'Recommended Amount:'.length, amountEndIndex).trim();

      formatted += "**📊 Recommended Amount:**\n";
      formatted += this.formatSectionWithBullets(amountText) + "\n\n";
    }

    if (frequencyIndex !== -1) {
      const frequencyText = text.substring(frequencyIndex + 'Frequency:'.length).trim();

      formatted += "**⏰ Frequency:**\n";
      formatted += this.formatSectionWithBullets(frequencyText);
    }

    // If no subsections found, format the whole text
    if (amountIndex === -1 && frequencyIndex === -1) {
      formatted = this.formatSectionWithBullets(text);
    }

    return formatted.trim();
  }

  private static formatEmergencySection(text: string): string {
    let formatted = '';

    // Look for "Warning Signs:" and "If Consumed Inappropriately:" subsections
    const warningIndex = text.indexOf('Warning Signs:');
    const consumedIndex = text.indexOf('If Consumed Inappropriately:');

    if (warningIndex !== -1) {
      const warningEndIndex = consumedIndex !== -1 ? consumedIndex : text.length;
      const warningText = text.substring(warningIndex + 'Warning Signs:'.length, warningEndIndex).trim();

      formatted += "**⚠️ Warning Signs:**\n";
      formatted += this.formatSectionWithBullets(warningText) + "\n\n";
    }

    if (consumedIndex !== -1) {
      const consumedText = text.substring(consumedIndex + 'If Consumed Inappropriately:'.length).trim();

      formatted += "**🚨 If Consumed Inappropriately:**\n";
      formatted += this.formatSectionWithBullets(consumedText);
    }

    // If no subsections found, format the whole text
    if (warningIndex === -1 && consumedIndex === -1) {
      formatted = this.formatSectionWithBullets(text);
    }

    return formatted.trim();
  }
}
