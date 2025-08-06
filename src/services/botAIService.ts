// AI-powered bot syntax generation service using Gemini AI
// This service converts natural language descriptions into bot syntax

interface BotGenerationResult {
  name: string;
  description: string;
  syntax: string;
}

// Gemini AI Configuration
const GEMINI_API_KEY = 'AIzaSyCtTTvZSYby7XPLVxkYJvPcuo2oGfeyzrQ';
const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMMA_MODEL = 'gemma-3-27b-it'; // For advanced analysis
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const GEMMA_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Bot syntax templates for common use cases with new trigger[{name}] and action[{name}] syntax
const BOT_TEMPLATES = {
  automod: {
    name: "AutoMod",
    description: "Tự động kiểm duyệt nội dung",
    syntax: `{
  "triggers": [
    {
      "name": "spam_detection",
      "type": "post_created",
      "conditions": {
        "content_contains": ["spam", "quảng cáo", "link rút gọn"],
        "title_length": { "less_than": 10 }
      }
    }
  ],
  "actions": [
    {
      "name": "remove_spam_post",
      "trigger_group": "spam_detection",
      "type": "remove_post",
      "reason": "Vi phạm quy tắc cộng đồng"
    },
    {
      "name": "notify_author",
      "trigger_group": "spam_detection",
      "type": "send_message",
      "target": "author",
      "message": "Bài viết của bạn đã bị xóa do vi phạm quy tắc. Vui lòng đọc kỹ quy tắc trước khi đăng."
    }
  ]
}`
  },
  
  welcome: {
    name: "Welcome Bot",
    description: "Chào mừng thành viên mới",
    syntax: `{
  "triggers": [
    {
      "name": "new_member_joined",
      "type": "user_joined",
      "conditions": {}
    }
  ],
  "actions": [
    {
      "name": "welcome_message",
      "trigger_group": "new_member_joined",
      "type": "send_message",
      "target": "user",
      "message": "Chào mừng bạn đến với cộng đồng! Hãy đọc quy tắc và tham gia thảo luận nhé!"
    },
    {
      "name": "assign_newcomer_flair",
      "trigger_group": "new_member_joined",
      "type": "assign_flair",
      "target": "user",
      "flair": "Thành viên mới"
    }
  ]
}`
  },

  flair_auto: {
    name: "Auto Flair",
    description: "Tự động gắn flair cho bài viết",
    syntax: `{
  "triggers": [
    {
      "name": "question_post_detection",
      "type": "post_created",
      "conditions": {
        "title_contains": ["hỏi", "help", "giúp đỡ"],
        "flair": { "is_empty": true }
      }
    }
  ],
  "actions": [
    {
      "name": "assign_question_flair",
      "trigger_group": "question_post_detection",
      "type": "assign_flair",
      "target": "post",
      "flair": "Hỏi đáp"
    }
  ]
}`
  },

  karma_filter: {
    name: "Karma Filter",
    description: "Lọc bài viết theo karma",
    syntax: `{
  "triggers": [
    {
      "name": "low_karma_user_post",
      "type": "post_created",
      "conditions": {
        "author_karma": { "less_than": 50 },
        "account_age": { "less_than_days": 7 }
      }
    }
  ],
  "actions": [
    {
      "name": "require_mod_approval",
      "trigger_group": "low_karma_user_post",
      "type": "require_approval",
      "reason": "Tài khoản mới cần được duyệt"
    },
    {
      "name": "notify_moderators",
      "trigger_group": "low_karma_user_post",
      "type": "send_message",
      "target": "moderators",
      "message": "Bài viết từ tài khoản mới cần được duyệt"
    }
  ]
}`
  },

  scheduled_post: {
    name: "Scheduled Posts",
    description: "Đăng bài theo lịch",
    syntax: `{
  "triggers": [
    {
      "name": "weekly_discussion_schedule",
      "type": "schedule",
      "conditions": {
        "time": "daily",
        "hour": 9,
        "days": ["monday", "wednesday", "friday"]
      }
    }
  ],
  "actions": [
    {
      "name": "create_weekly_discussion",
      "trigger_group": "weekly_discussion_schedule",
      "type": "create_post",
      "title": "Thảo luận hàng tuần",
      "content": "Hãy chia sẻ những gì bạn đang quan tâm tuần này!",
      "flair": "Thảo luận",
      "pin": true
    }
  ]
}`
  }
};

// Keywords mapping for AI detection
const KEYWORD_MAPPING = {
  // Moderation keywords
  'xóa': ['remove_post', 'delete'],
  'kiểm duyệt': ['automod', 'moderation'],
  'spam': ['content_filter', 'spam_detection'],
  'từ cấm': ['word_filter', 'banned_words'],
  
  // Welcome keywords
  'chào mừng': ['welcome', 'greeting'],
  'thành viên mới': ['new_member', 'user_joined'],
  
  // Flair keywords
  'flair': ['flair', 'tag'],
  'gắn thẻ': ['assign_flair', 'auto_tag'],
  
  // Karma keywords
  'karma': ['karma_filter', 'reputation'],
  'tài khoản mới': ['new_account', 'account_age'],
  
  // Scheduling keywords
  'lịch': ['schedule', 'timer'],
  'tự động đăng': ['auto_post', 'scheduled_post'],
  'hàng ngày': ['daily', 'recurring']
};

export const generateBotSyntax = async (prompt: string): Promise<BotGenerationResult> => {
  try {
    // Check if this is an AI-enhanced request
    if (prompt.toLowerCase().startsWith('ai ')) {
      return await generateAdvancedAIBot(prompt.substring(3));
    }

    // First try Gemini AI
    const geminiResult = await generateWithGemini(prompt);
    if (geminiResult) {
      return geminiResult;
    }

    // Fallback to template-based generation
    console.log('Gemini AI failed, using template fallback');
    return generateWithTemplates(prompt);

  } catch (error) {
    console.error('Error generating bot syntax:', error);
    // Fallback to template-based generation
    return generateWithTemplates(prompt);
  }
};

// Generate bot syntax using Gemini AI
const generateWithGemini = async (prompt: string): Promise<BotGenerationResult | null> => {
  try {
    const systemPrompt = `You are a bot configuration generator for a Reddit-like platform. Generate JSON configuration for bots based on user descriptions.

IMPORTANT SYNTAX RULES:
1. Use trigger[{name}] and action[{name}] format for grouped operations
2. Variables in the same group execute together
3. Use descriptive names for trigger and action groups

Available trigger types:
- post_created: When a new post is created
- comment_created: When a new comment is added
- user_joined: When a user joins the community
- user_left: When a user leaves the community
- schedule: Time-based triggers
- keyword_detected: When specific keywords are found

Available action types:
- remove_post: Remove a post
- remove_comment: Remove a comment
- ban_user: Ban a user temporarily or permanently
- send_message: Send a message to user/moderator
- assign_flair: Add flair to post/user
- pin_post: Pin a post to top
- lock_post: Lock post from further comments
- require_approval: Require moderator approval

Example format:
{
  "triggers": [
    {
      "name": "spam_detection",
      "type": "post_created",
      "conditions": {
        "content_contains": ["spam", "advertisement"],
        "author_karma": { "less_than": 10 }
      }
    }
  ],
  "actions": [
    {
      "name": "spam_removal",
      "trigger_group": "spam_detection",
      "type": "remove_post",
      "reason": "Spam detected"
    },
    {
      "name": "notify_moderators",
      "trigger_group": "spam_detection",
      "type": "send_message",
      "target": "moderators",
      "message": "Spam post removed automatically"
    }
  ]
}

Generate a bot configuration for: "${prompt}"

Respond with ONLY a JSON object containing:
{
  "name": "Bot Name",
  "description": "Brief description",
  "syntax": "JSON configuration as string"
}`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini AI');
    }

    // Parse the JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemini AI');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate the result
    if (!result.name || !result.description || !result.syntax) {
      throw new Error('Invalid response format from Gemini AI');
    }

    return {
      name: result.name,
      description: result.description,
      syntax: typeof result.syntax === 'string' ? result.syntax : JSON.stringify(result.syntax, null, 2)
    };

  } catch (error) {
    console.error('Gemini AI generation failed:', error);
    return null;
  }
};

// Fallback template-based generation
const generateWithTemplates = async (prompt: string): Promise<BotGenerationResult> => {
  const lowerPrompt = prompt.toLowerCase();

  // Detect intent based on keywords
  let bestMatch = null;
  let maxScore = 0;

  for (const [templateKey, template] of Object.entries(BOT_TEMPLATES)) {
    let score = 0;

    // Check for keyword matches
    for (const [keyword, concepts] of Object.entries(KEYWORD_MAPPING)) {
      if (lowerPrompt.includes(keyword)) {
        concepts.forEach(concept => {
          if (template.description.toLowerCase().includes(concept) ||
              template.syntax.toLowerCase().includes(concept)) {
            score += 2;
          }
        });
      }
    }

    // Direct template name matching
    if (lowerPrompt.includes(template.name.toLowerCase())) {
      score += 5;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = template;
    }
  }

  // If no good match, create a custom bot based on common patterns
  if (!bestMatch || maxScore < 2) {
    return generateCustomBot(prompt);
  }

  // Customize the matched template based on the prompt
  return customizeTemplate(bestMatch, prompt);
};

// Advanced AI bot generation using Gemma 3 27B for complex analysis
const generateAdvancedAIBot = async (prompt: string): Promise<BotGenerationResult> => {
  try {
    const systemPrompt = `You are an advanced AI bot configuration generator for a Reddit-like platform. You can analyze images, text, and create sophisticated moderation bots.

ADVANCED CAPABILITIES:
1. **Content Analysis**: Analyze posts/comments for toxicity, spam, inappropriate content
2. **Image Analysis**: Detect NSFW content, spam images, inappropriate visuals
3. **User Behavior Analysis**: Track patterns, detect ban-worthy behavior
4. **Smart Moderation**: Generate contextual warnings and ban reasons
5. **Automated Responses**: Create intelligent auto-replies and notifications

SPECIAL AI COMMANDS:
- "analyze post" - Deep content analysis with toxicity detection
- "analyze image" - Image content analysis and classification
- "generate ban reason" - AI-generated ban justification based on violations
- "smart warning" - Contextual warning messages
- "behavior pattern" - User behavior analysis and prediction
- "content classification" - Automatic post/comment categorization

ENHANCED SYNTAX with AI Integration:
{
  "triggers": [
    {
      "name": "ai_content_analysis",
      "type": "post_created",
      "conditions": {
        "ai_analysis": {
          "type": "content_toxicity",
          "threshold": 0.7,
          "analyze_images": true,
          "check_spam": true
        }
      }
    }
  ],
  "actions": [
    {
      "name": "ai_moderation_action",
      "trigger_group": "ai_content_analysis",
      "type": "ai_moderate",
      "ai_config": {
        "action_type": "auto_decide", // auto_decide, warn, ban, remove
        "generate_reason": true,
        "severity_based": true,
        "escalation_rules": {
          "low": "warn",
          "medium": "remove_post",
          "high": "ban_user"
        }
      }
    }
  ]
}

Generate an advanced AI-powered bot for: "${prompt}"

The bot should use AI analysis capabilities and respond with sophisticated moderation actions.

Respond with ONLY a JSON object containing:
{
  "name": "Bot Name",
  "description": "Brief description",
  "syntax": "JSON configuration as string"
}`;

    const response = await fetch(GEMMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3072,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemma API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemma AI');
    }

    // Parse the JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from Gemma AI');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate the result
    if (!result.name || !result.description || !result.syntax) {
      throw new Error('Invalid response format from Gemma AI');
    }

    return {
      name: `AI-${result.name}`,
      description: `🤖 AI-Powered: ${result.description}`,
      syntax: typeof result.syntax === 'string' ? result.syntax : JSON.stringify(result.syntax, null, 2)
    };

  } catch (error) {
    console.error('Advanced AI generation failed:', error);
    // Fallback to basic AI generation
    return await generateWithGemini(prompt);
  }
};

// AI-powered content analysis function
export const analyzeContentWithAI = async (content: string, imageUrls?: string[]): Promise<{
  toxicity: number;
  spam: number;
  inappropriate: number;
  categories: string[];
  recommendation: 'approve' | 'warn' | 'remove' | 'ban';
  reason: string;
}> => {
  try {
    const analysisPrompt = `Analyze this content for moderation purposes:

Content: "${content}"
${imageUrls ? `Images: ${imageUrls.join(', ')}` : ''}

Provide analysis scores (0-1) for:
- Toxicity (hate speech, harassment, threats)
- Spam (promotional, repetitive, irrelevant)
- Inappropriate (NSFW, violence, illegal content)

Also provide:
- Content categories (discussion, question, meme, news, etc.)
- Moderation recommendation (approve/warn/remove/ban)
- Detailed reason for the recommendation

Respond with JSON:
{
  "toxicity": 0.0,
  "spam": 0.0,
  "inappropriate": 0.0,
  "categories": ["category1", "category2"],
  "recommendation": "approve",
  "reason": "Detailed explanation"
}`;

    const response = await fetch(GEMMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: analysisPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis response');
    }

    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid analysis response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('AI content analysis failed:', error);
    // Return safe defaults
    return {
      toxicity: 0,
      spam: 0,
      inappropriate: 0,
      categories: ['unknown'],
      recommendation: 'approve',
      reason: 'Analysis unavailable'
    };
  }
};

// Generate AI-powered ban reason
export const generateBanReason = async (userBehavior: string, violations: string[]): Promise<string> => {
  try {
    const reasonPrompt = `Generate a professional ban reason for a user based on their behavior and violations:

User Behavior: ${userBehavior}
Violations: ${violations.join(', ')}

Generate a clear, professional ban reason that:
1. Explains the specific violations
2. References community guidelines
3. Is respectful but firm
4. Includes the duration/severity justification

Respond with just the ban reason text (no JSON, no quotes).`;

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: reasonPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          topK: 30,
          topP: 0.9,
          maxOutputTokens: 512,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ban reason API error: ${response.status}`);
    }

    const data = await response.json();
    const reasonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return reasonText || 'Vi phạm quy tắc cộng đồng';

  } catch (error) {
    console.error('AI ban reason generation failed:', error);
    return 'Vi phạm quy tắc cộng đồng';
  }
};

const generateCustomBot = (prompt: string): BotGenerationResult => {
  const lowerPrompt = prompt.toLowerCase();
  
  // Generate basic structure based on common patterns
  let triggers = [];
  let actions = [];
  
  // Detect trigger type
  if (lowerPrompt.includes('bài viết') || lowerPrompt.includes('post')) {
    triggers.push({
      type: "post_created",
      conditions: {}
    });
  }
  
  if (lowerPrompt.includes('thành viên') || lowerPrompt.includes('user')) {
    triggers.push({
      type: "user_joined",
      conditions: {}
    });
  }
  
  // Detect action type
  if (lowerPrompt.includes('xóa') || lowerPrompt.includes('remove')) {
    actions.push({
      type: "remove_post",
      reason: "Vi phạm quy tắc"
    });
  }
  
  if (lowerPrompt.includes('gửi tin nhắn') || lowerPrompt.includes('thông báo')) {
    actions.push({
      type: "send_message",
      target: "author",
      message: "Thông báo từ bot"
    });
  }
  
  if (lowerPrompt.includes('flair') || lowerPrompt.includes('gắn thẻ')) {
    actions.push({
      type: "assign_flair",
      target: "post",
      flair: "Auto"
    });
  }
  
  // Default fallback
  if (triggers.length === 0) {
    triggers.push({
      type: "post_created",
      conditions: {}
    });
  }
  
  if (actions.length === 0) {
    actions.push({
      type: "send_message",
      target: "author",
      message: "Bot đã được kích hoạt"
    });
  }
  
  const syntax = JSON.stringify({
    triggers,
    actions
  }, null, 2);
  
  return {
    name: "Custom Bot",
    description: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
    syntax
  };
};

const customizeTemplate = (template: any, prompt: string): BotGenerationResult => {
  const lowerPrompt = prompt.toLowerCase();
  let customizedSyntax = template.syntax;
  
  // Customize based on specific requirements in the prompt
  if (lowerPrompt.includes('karma')) {
    const karmaMatch = lowerPrompt.match(/karma.*?(\d+)/);
    if (karmaMatch) {
      const karmaValue = karmaMatch[1];
      customizedSyntax = customizedSyntax.replace(
        '"less_than": 50',
        `"less_than": ${karmaValue}`
      );
    }
  }
  
  // Customize banned words
  const wordsMatch = lowerPrompt.match(/từ.*?["']([^"']+)["']/);
  if (wordsMatch) {
    const bannedWords = wordsMatch[1].split(',').map(w => w.trim());
    customizedSyntax = customizedSyntax.replace(
      '["spam", "quảng cáo", "link rút gọn"]',
      JSON.stringify(bannedWords)
    );
  }
  
  return {
    name: template.name,
    description: template.description,
    syntax: customizedSyntax
  };
};

// Export bot syntax documentation
export const getBotSyntaxDocumentation = () => {
  return {
    triggers: {
      post_created: "Khi có bài viết mới",
      comment_created: "Khi có bình luận mới", 
      user_joined: "Khi có thành viên mới",
      user_left: "Khi thành viên rời khỏi",
      schedule: "Theo lịch trình",
      keyword_detected: "Khi phát hiện từ khóa"
    },
    conditions: {
      content_contains: "Nội dung chứa từ khóa",
      title_contains: "Tiêu đề chứa từ khóa",
      author_karma: "Karma của tác giả",
      account_age: "Tuổi tài khoản",
      flair: "Flair hiện tại",
      upvotes: "Số upvote",
      downvotes: "Số downvote"
    },
    actions: {
      remove_post: "Xóa bài viết",
      remove_comment: "Xóa bình luận",
      ban_user: "Cấm người dùng",
      send_message: "Gửi tin nhắn",
      assign_flair: "Gắn flair",
      pin_post: "Ghim bài viết",
      lock_post: "Khóa bài viết",
      require_approval: "Yêu cầu duyệt"
    }
  };
};
