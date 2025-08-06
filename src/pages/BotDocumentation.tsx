import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBotSyntaxDocumentation, generateBotSyntax, analyzeContentWithAI } from '../services/botAIService';

interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  examples: string[];
  syntax: string;
}



const BotDocumentation: React.FC = () => {
  const { topic, page } = useParams<{ topic: string; page: string }>();
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState<DocumentationSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // AI Assistant states
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    type: 'user' | 'bot';
    message: string;
    timestamp: Date;
  }>>([]);
  const [isAILoading, setIsAILoading] = useState(false);

  // Documentation data structure
  const documentationData: { [key: string]: { [key: string]: DocumentationSection } } = {
    triggers: {
      'post-created': {
        id: 'post-created',
        title: 'Post Created Trigger',
        content: `Trigger này được kích hoạt khi có bài viết mới được tạo trong cộng đồng. Bạn có thể sử dụng các điều kiện để lọc bài viết theo nội dung, tác giả, hoặc các thuộc tính khác.`,
        examples: [
          'Phát hiện spam trong bài viết mới',
          'Tự động gắn flair cho bài viết',
          'Kiểm tra karma của tác giả',
          'Lọc bài viết theo từ khóa'
        ],
        syntax: `{
  "name": "spam_detection",
  "type": "post_created",
  "conditions": {
    "content_contains": ["spam", "quảng cáo"],
    "title_length": { "less_than": 10 },
    "author_karma": { "less_than": 50 },
    "flair": { "is_empty": true }
  }
}`
      },
      'comment-created': {
        id: 'comment-created',
        title: 'Comment Created Trigger',
        content: `Trigger này được kích hoạt khi có bình luận mới. Hữu ích để kiểm duyệt bình luận, phát hiện spam, hoặc tự động phản hồi.`,
        examples: [
          'Kiểm duyệt bình luận độc hại',
          'Tự động phản hồi câu hỏi thường gặp',
          'Phát hiện link spam trong bình luận',
          'Cảnh báo ngôn từ không phù hợp'
        ],
        syntax: `{
  "name": "comment_moderation",
  "type": "comment_created",
  "conditions": {
    "content_contains": ["toxic", "spam"],
    "author_karma": { "less_than": 10 },
    "parent_post_flair": "Thảo luận"
  }
}`
      },
      'user-joined': {
        id: 'user-joined',
        title: 'User Joined Trigger',
        content: `Trigger này được kích hoạt khi có thành viên mới tham gia cộng đồng. Thường được sử dụng để chào mừng thành viên mới.`,
        examples: [
          'Gửi tin nhắn chào mừng',
          'Gắn flair "Thành viên mới"',
          'Hướng dẫn quy tắc cộng đồng',
          'Thêm vào nhóm người dùng mới'
        ],
        syntax: `{
  "name": "welcome_new_member",
  "type": "user_joined",
  "conditions": {
    "account_age": { "less_than_days": 1 }
  }
}`
      },
      'schedule': {
        id: 'schedule',
        title: 'Schedule Trigger',
        content: `Trigger này được kích hoạt theo lịch trình định sẵn. Hữu ích để tạo bài viết định kỳ, thông báo, hoặc các tác vụ bảo trì.`,
        examples: [
          'Đăng bài thảo luận hàng tuần',
          'Thông báo sự kiện định kỳ',
          'Dọn dẹp bài viết cũ',
          'Báo cáo thống kê hàng tháng'
        ],
        syntax: `{
  "name": "weekly_discussion",
  "type": "schedule",
  "conditions": {
    "time": "weekly",
    "day": "monday",
    "hour": 9,
    "minute": 0
  }
}`
      }
    },
    actions: {
      'remove-post': {
        id: 'remove-post',
        title: 'Remove Post Action',
        content: `Action này xóa bài viết khỏi cộng đồng. Thường được sử dụng kết hợp với các trigger phát hiện spam hoặc vi phạm quy tắc.`,
        examples: [
          'Xóa bài viết spam tự động',
          'Loại bỏ nội dung vi phạm',
          'Xóa bài viết trùng lặp',
          'Kiểm duyệt nội dung không phù hợp'
        ],
        syntax: `{
  "name": "remove_spam_post",
  "trigger_group": "spam_detection",
  "type": "remove_post",
  "reason": "Vi phạm quy tắc cộng đồng",
  "notify_author": true
}`
      },
      'send-message': {
        id: 'send-message',
        title: 'Send Message Action',
        content: `Action này gửi tin nhắn đến người dùng hoặc moderator. Có thể được sử dụng để thông báo, cảnh báo, hoặc hướng dẫn.`,
        examples: [
          'Thông báo vi phạm quy tắc',
          'Chào mừng thành viên mới',
          'Cảnh báo moderator về nội dung cần kiểm tra',
          'Hướng dẫn sử dụng cộng đồng'
        ],
        syntax: `{
  "name": "notify_author",
  "trigger_group": "spam_detection",
  "type": "send_message",
  "target": "author",
  "message": "Bài viết của bạn đã bị xóa do vi phạm quy tắc.",
  "include_reason": true
}`
      },
      'assign-flair': {
        id: 'assign-flair',
        title: 'Assign Flair Action',
        content: `Action này gắn flair (nhãn) cho bài viết hoặc người dùng. Giúp phân loại nội dung và nhận diện người dùng.`,
        examples: [
          'Tự động gắn flair cho bài hỏi đáp',
          'Đánh dấu thành viên mới',
          'Phân loại bài viết theo chủ đề',
          'Gắn nhãn cho moderator'
        ],
        syntax: `{
  "name": "assign_question_flair",
  "trigger_group": "question_detection",
  "type": "assign_flair",
  "target": "post",
  "flair": "Hỏi đáp",
  "color": "#FF4500"
}`
      },
      'ban-user': {
        id: 'ban-user',
        title: 'Ban User Action',
        content: `Action này cấm người dùng tham gia cộng đồng trong một khoảng thời gian hoặc vĩnh viễn. Sử dụng cẩn thận và có lý do rõ ràng.`,
        examples: [
          'Cấm người dùng spam',
          'Cấm tạm thời do vi phạm nhẹ',
          'Cấm vĩnh viễn do vi phạm nghiêm trọng',
          'Cấm tự động dựa trên hành vi'
        ],
        syntax: `{
  "name": "ban_spammer",
  "trigger_group": "spam_detection",
  "type": "ban_user",
  "duration": "7d",
  "reason": "Spam liên tục",
  "notify_user": true
}`
      }
    },
    examples: {
      'complete-bot': {
        id: 'complete-bot',
        title: 'Complete Bot Example',
        content: `Đây là một ví dụ hoàn chỉnh về bot tự động kiểm duyệt với nhiều trigger và action phối hợp.`,
        examples: [
          'Phát hiện và xử lý spam',
          'Chào mừng thành viên mới',
          'Tự động gắn flair',
          'Thông báo moderator'
        ],
        syntax: `{
  "triggers": [
    {
      "name": "spam_detection",
      "type": "post_created",
      "conditions": {
        "content_contains": ["spam", "quảng cáo", "link rút gọn"],
        "author_karma": { "less_than": 10 }
      }
    },
    {
      "name": "new_member_welcome",
      "type": "user_joined",
      "conditions": {}
    },
    {
      "name": "question_detection",
      "type": "post_created",
      "conditions": {
        "title_contains": ["hỏi", "help", "?"],
        "flair": { "is_empty": true }
      }
    }
  ],
  "actions": [
    {
      "name": "remove_spam",
      "trigger_group": "spam_detection",
      "type": "remove_post",
      "reason": "Spam detected"
    },
    {
      "name": "notify_spam_removal",
      "trigger_group": "spam_detection",
      "type": "send_message",
      "target": "author",
      "message": "Bài viết đã bị xóa do spam"
    },
    {
      "name": "welcome_message",
      "trigger_group": "new_member_welcome",
      "type": "send_message",
      "target": "user",
      "message": "Chào mừng đến cộng đồng!"
    },
    {
      "name": "assign_question_flair",
      "trigger_group": "question_detection",
      "type": "assign_flair",
      "target": "post",
      "flair": "Hỏi đáp"
    }
  ]
}`
      },
      'ai-powered-bot': {
        id: 'ai-powered-bot',
        title: 'AI-Powered Bot with Gemma 3 27B',
        content: `Bot sử dụng AI Gemma 3 27B để phân tích nội dung và hình ảnh, tự động kiểm duyệt thông minh.`,
        examples: [
          'Phân tích độc tính nội dung bằng AI',
          'Phát hiện spam và nội dung không phù hợp',
          'Tạo lý do ban tự động bằng AI',
          'Phân tích hình ảnh NSFW',
          'Cảnh báo thông minh dựa trên ngữ cảnh'
        ],
        syntax: `{
  "triggers": [
    {
      "name": "ai_content_analysis",
      "type": "post_created",
      "conditions": {
        "ai_analysis": {
          "type": "content_toxicity",
          "threshold": 0.7,
          "analyze_images": true,
          "check_spam": true,
          "model": "gemma-3-27b-it"
        }
      }
    },
    {
      "name": "ai_image_analysis",
      "type": "post_created",
      "conditions": {
        "has_images": true,
        "ai_analysis": {
          "type": "image_classification",
          "nsfw_threshold": 0.8,
          "spam_threshold": 0.6
        }
      }
    }
  ],
  "actions": [
    {
      "name": "ai_smart_moderation",
      "trigger_group": "ai_content_analysis",
      "type": "ai_moderate",
      "ai_config": {
        "action_type": "auto_decide",
        "generate_reason": true,
        "severity_based": true,
        "escalation_rules": {
          "low": "warn_user",
          "medium": "remove_post",
          "high": "ban_user"
        },
        "custom_message": true
      }
    },
    {
      "name": "ai_image_moderation",
      "trigger_group": "ai_image_analysis",
      "type": "remove_post",
      "reason": "AI detected inappropriate image content",
      "notify_moderators": true
    },
    {
      "name": "ai_generate_ban_reason",
      "trigger_group": "ai_content_analysis",
      "type": "ban_user",
      "ai_config": {
        "generate_reason": true,
        "analyze_history": true,
        "duration": "auto_calculate"
      }
    }
  ]
}`
      },
      'ai-commands': {
        id: 'ai-commands',
        title: 'AI Commands and Features',
        content: `Hướng dẫn sử dụng các lệnh AI đặc biệt để tạo bot thông minh hơn.`,
        examples: [
          'Sử dụng tiền tố "ai" để kích hoạt AI nâng cao',
          'Phân tích nội dung tự động',
          'Tạo cảnh báo thông minh',
          'Phân loại nội dung tự động',
          'Theo dõi hành vi người dùng'
        ],
        syntax: `// Cách sử dụng AI Commands:

1. **Kích hoạt AI nâng cao**: Bắt đầu prompt với "ai "
   Ví dụ: "ai tạo bot phân tích độc tính và tự động ban người dùng vi phạm"

2. **Các lệnh AI đặc biệt**:
   - "ai analyze post" - Phân tích sâu nội dung
   - "ai analyze image" - Phân tích hình ảnh
   - "ai generate ban reason" - Tạo lý do ban tự động
   - "ai smart warning" - Cảnh báo thông minh
   - "ai behavior pattern" - Phân tích hành vi
   - "ai content classification" - Phân loại nội dung

3. **Cấu hình AI trong bot**:
{
  "ai_analysis": {
    "type": "content_toxicity",
    "threshold": 0.7,
    "analyze_images": true,
    "model": "gemma-3-27b-it",
    "features": [
      "toxicity_detection",
      "spam_detection",
      "nsfw_detection",
      "sentiment_analysis"
    ]
  }
}

4. **AI Actions**:
{
  "type": "ai_moderate",
  "ai_config": {
    "action_type": "auto_decide",
    "generate_reason": true,
    "severity_based": true,
    "custom_message": true
  }
}`
      }
    }
  };

  useEffect(() => {
    if (topic && page && documentationData[topic] && documentationData[topic][page]) {
      setCurrentSection(documentationData[topic][page]);
    } else {
      setCurrentSection(null);
    }
    setIsLoading(false);

    // Load chat history from localStorage
    const savedHistory = localStorage.getItem('botDocChatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, [topic, page]);

  // AI Assistant functions
  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: aiQuery,
      timestamp: new Date()
    };

    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);

    setIsAILoading(true);
    setAiQuery('');

    try {
      // Generate bot response based on query
      let botResponse = '';

      if (aiQuery.toLowerCase().includes('bot') || aiQuery.toLowerCase().includes('command')) {
        const result = await generateBotSyntax(aiQuery);
        botResponse = `I can help you create a bot for that! Here's a suggested implementation:\n\n**${result.name}**\n${result.description}\n\n\`\`\`json\n${result.syntax}\n\`\`\`\n\nWould you like me to explain any part of this code or help you modify it?`;
      } else if (aiQuery.toLowerCase().includes('help') || aiQuery.toLowerCase().includes('how')) {
        botResponse = `I'm here to help you with bot development! I can assist with:\n\n• Creating bot commands and triggers\n• Explaining bot syntax and structure\n• Providing examples for common use cases\n• Troubleshooting bot issues\n\nWhat specific aspect of bot development would you like help with?`;
      } else if (aiQuery.toLowerCase().includes('example')) {
        botResponse = `Here are some popular bot examples:\n\n1. **Auto Moderator**: Removes spam and inappropriate content\n2. **Welcome Bot**: Greets new members\n3. **Karma Bot**: Tracks user reputation\n4. **Reminder Bot**: Sends scheduled messages\n\nWhich type of bot would you like to learn more about?`;
      } else {
        botResponse = `I understand you're asking about: "${aiQuery}"\n\nI'm a bot documentation assistant. I can help you with:\n• Bot creation and configuration\n• Command syntax and examples\n• Best practices for bot development\n• Troubleshooting common issues\n\nCould you be more specific about what kind of bot functionality you need help with?`;
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        message: botResponse,
        timestamp: new Date()
      };

      const finalHistory = [...updatedHistory, botMessage];
      setChatHistory(finalHistory);
      localStorage.setItem('botDocChatHistory', JSON.stringify(finalHistory));

    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        message: 'Sorry, I encountered an error. Please try asking your question again.',
        timestamp: new Date()
      };

      const finalHistory = [...updatedHistory, errorMessage];
      setChatHistory(finalHistory);
    } finally {
      setIsAILoading(false);
    }
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('botDocChatHistory');
  };

  const getTopicTitle = (topicKey: string) => {
    const titles: { [key: string]: string } = {
      triggers: 'Triggers (Kích hoạt)',
      actions: 'Actions (Hành động)',
      examples: 'Examples (Ví dụ)'
    };
    return titles[topicKey] || topicKey;
  };

  if (isLoading) {
    return (
      <div className="bot-docs-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bot-docs-container">
      <div className="docs-header">
        <h1>📖 Bot Documentation & AI Assistant</h1>
        <p>Complete guide to creating and managing bots with AI-powered assistance</p>

        <div className="header-actions">
          <button
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className={`header-btn ai-btn ${showAIAssistant ? 'active' : ''}`}
          >
            🤖 AI Assistant
          </button>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {showAIAssistant && (
        <div className="ai-assistant-panel">
          <div className="ai-header">
            <h3>🤖 Bot Documentation Assistant</h3>
            <p>Ask me anything about bot development, commands, or best practices!</p>
            <button onClick={clearChatHistory} className="clear-chat-btn">
              🗑️ Clear Chat
            </button>
          </div>

          <div className="chat-container">
            <div className="chat-messages">
              {chatHistory.length === 0 ? (
                <div className="welcome-message">
                  <div className="bot-avatar">🤖</div>
                  <div className="message-content">
                    <p>Hi! I'm your bot documentation assistant. I can help you with:</p>
                    <ul>
                      <li>Creating bot commands and triggers</li>
                      <li>Understanding bot syntax</li>
                      <li>Best practices for bot development</li>
                      <li>Troubleshooting common issues</li>
                    </ul>
                    <p>What would you like to know about bot development?</p>
                  </div>
                </div>
              ) : (
                chatHistory.map(message => (
                  <div key={message.id} className={`chat-message ${message.type}`}>
                    <div className="message-avatar">
                      {message.type === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {message.message.split('\n').map((line, index) => (
                          <div key={index}>
                            {line.includes('```') ? (
                              <pre><code>{line.replace(/```json|```/g, '')}</code></pre>
                            ) : (
                              line
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isAILoading && (
                <div className="chat-message bot">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="chat-input-section">
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask me about bot development..."
                  className="chat-input"
                  onKeyPress={(e) => e.key === 'Enter' && !isAILoading && handleAIQuery()}
                />
                <button
                  onClick={handleAIQuery}
                  disabled={isAILoading || !aiQuery.trim()}
                  className="send-message-btn"
                >
                  {isAILoading ? '⏳' : '➤'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="docs-layout">
        <div className="docs-sidebar">
          <h3>📚 Danh mục</h3>
          {Object.entries(documentationData).map(([topicKey, sections]) => (
            <div key={topicKey} className="docs-topic">
              <h4>{getTopicTitle(topicKey)}</h4>
              <ul>
                {Object.entries(sections).map(([sectionKey, section]) => (
                  <li key={sectionKey}>
                    <Link 
                      to={`/document/subreddit/bot-code/${topicKey}/${sectionKey}`}
                      className={`docs-link ${topic === topicKey && page === sectionKey ? 'active' : ''}`}
                    >
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="docs-content">
          {currentSection ? (
            <>
              <div className="docs-breadcrumb">
                <Link to="/document/subreddit/bot-code">Tài liệu Bot</Link>
                <span> / </span>
                <span>{getTopicTitle(topic!)}</span>
                <span> / </span>
                <span>{currentSection.title}</span>
              </div>

              <article className="docs-article">
                <h1>{currentSection.title}</h1>
                
                <div className="docs-description">
                  <p>{currentSection.content}</p>
                </div>

                <div className="docs-examples">
                  <h3>🎯 Ví dụ sử dụng:</h3>
                  <ul>
                    {currentSection.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>

                <div className="docs-syntax">
                  <h3>💻 Cú pháp:</h3>
                  <pre className="syntax-block">
                    <code>{currentSection.syntax}</code>
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(currentSection.syntax)}
                    className="copy-button"
                  >
                    📋 Sao chép
                  </button>
                </div>

                <div className="docs-navigation">
                  <div className="nav-buttons">
                    <button onClick={() => navigate(-1)} className="back-button">
                      ← Quay lại
                    </button>
                    <Link to="/document/subreddit/bot-code" className="home-button">
                      🏠 Trang chủ tài liệu
                    </Link>
                  </div>
                </div>
              </article>
            </>
          ) : (
            <div className="docs-home">
              <h2>🤖 Chào mừng đến với tài liệu Bot Code</h2>
              <p>Chọn một chủ đề từ menu bên trái để bắt đầu tìm hiểu về cách tạo bot cho cộng đồng của bạn.</p>
              
              <div className="quick-links">
                <h3>🚀 Bắt đầu nhanh:</h3>
                <div className="quick-link-grid">
                  <Link to="/document/subreddit/bot-code/triggers/post-created" className="quick-link-card">
                    <h4>📝 Post Created</h4>
                    <p>Tạo bot phản ứng với bài viết mới</p>
                  </Link>
                  <Link to="/document/subreddit/bot-code/actions/remove-post" className="quick-link-card">
                    <h4>🗑️ Remove Post</h4>
                    <p>Tự động xóa bài viết vi phạm</p>
                  </Link>
                  <Link to="/document/subreddit/bot-code/examples/complete-bot" className="quick-link-card">
                    <h4>🤖 Complete Bot</h4>
                    <p>Ví dụ bot hoàn chỉnh</p>
                  </Link>
                  <Link to="/document/subreddit/bot-code/examples/ai-powered-bot" className="quick-link-card">
                    <h4>🧠 AI-Powered Bot</h4>
                    <p>Bot sử dụng Gemma 3 27B AI</p>
                  </Link>
                  <Link to="/document/subreddit/bot-code/examples/ai-commands" className="quick-link-card">
                    <h4>⚡ AI Commands</h4>
                    <p>Lệnh AI đặc biệt</p>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotDocumentation;
