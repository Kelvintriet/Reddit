import { CohereClient } from 'cohere-ai';

// Khởi tạo Cohere client
export const cohereClient = new CohereClient({
  token: import.meta.env.VITE_COHERE_API_KEY || 'YOUR_COHERE_API_KEY',
});

// Loại phân tích văn bản
export const TextAnalysisType = {
  SENTIMENT: 'sentiment',
  TOXICITY: 'toxicity',
  SUMMARIZE: 'summarize',
  CLASSIFY: 'classify',
  SPAM: 'spam',
  PROFANITY: 'profanity',
  PII: 'pii'
} as const;

export type TextAnalysisTypeValue = typeof TextAnalysisType[keyof typeof TextAnalysisType];

export type TextAnalysisRequest = {
  texts: string[];
  type: TextAnalysisTypeValue;
};

// Các prompt mẫu
export const PROMPTS = {
  COMMENT_SENTIMENT: 'Analyze the sentiment of this comment:',
  CONTENT_MODERATION: 'Detect toxicity or harmful content in this text:',
  SUMMARIZE_POST: 'Summarize this post in 2-3 sentences:',
  RELATED_POSTS: 'Find related content to this post:',
};

// Hàm phân tích văn bản với Cohere
export async function analyzeText(text: string, type: TextAnalysisTypeValue) {
  try {
    switch (type) {
      case TextAnalysisType.SENTIMENT:
        return await cohereClient.classify({
          inputs: [text],
          examples: [],
        });
      
      case TextAnalysisType.TOXICITY:
        return await cohereClient.classify({
          inputs: [text],
          examples: [],
        });
      
      case TextAnalysisType.SUMMARIZE:
        return await cohereClient.summarize({
          text,
          length: 'medium',
          format: 'paragraph',
          extractiveness: 'high',
        });
      
      default:
        throw new Error('Loại phân tích không được hỗ trợ');
    }
  } catch (error) {
    console.error('Cohere API error:', error);
    throw new Error('Đã xảy ra lỗi khi sử dụng Cohere API');
  }
}

export default cohereClient; 