import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { generateBotSyntax } from '../../services/botAIService';
import './BotManager.css';

interface Bot {
  id: string;
  name: string;
  description: string;
  syntax: string;
  isActive: boolean;
  createdAt: Date;
  subredditName: string;
  shareCode?: string;
}

interface BotManagerProps {
  subredditName: string;
}

const BotManager: React.FC<BotManagerProps> = ({ subredditName }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [newBot, setNewBot] = useState({
    name: '',
    description: '',
    syntax: ''
  });

  useEffect(() => {
    fetchBots();
  }, [subredditName]);

  const fetchBots = async () => {
    try {
      const botsRef = collection(db, 'bots');
      const q = query(botsRef, where('subredditName', '==', subredditName));
      const querySnap = await getDocs(q);
      
      const botsList: Bot[] = [];
      querySnap.docs.forEach(doc => {
        const data = doc.data();
        botsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Bot);
      });
      
      setBots(botsList);
    } catch (error) {
      console.error('Error fetching bots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('Vui lòng nhập mô tả cho bot');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateBotSyntax(aiPrompt);
      setNewBot({
        name: result.name,
        description: result.description,
        syntax: result.syntax
      });
      setAiPrompt('');
    } catch (error) {
      console.error('Error generating bot:', error);
      alert('Có lỗi xảy ra khi tạo bot. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const createBot = async () => {
    if (!newBot.name.trim() || !newBot.syntax.trim()) {
      alert('Vui lòng điền đầy đủ thông tin bot');
      return;
    }

    try {
      const botId = `${subredditName}_${Date.now()}`;
      const shareCode = generateShareCode();
      
      const botData: Bot = {
        id: botId,
        name: newBot.name,
        description: newBot.description,
        syntax: newBot.syntax,
        isActive: true,
        createdAt: new Date(),
        subredditName,
        shareCode
      };

      const botRef = doc(db, 'bots', botId);
      await setDoc(botRef, botData);

      setBots([...bots, botData]);
      setNewBot({ name: '', description: '', syntax: '' });
      setShowCreateBot(false);
      alert('Bot đã được tạo thành công!');
    } catch (error) {
      console.error('Error creating bot:', error);
      alert('Có lỗi xảy ra khi tạo bot');
    }
  };

  const toggleBot = async (botId: string, isActive: boolean) => {
    try {
      const botRef = doc(db, 'bots', botId);
      await setDoc(botRef, { isActive }, { merge: true });
      
      setBots(bots.map(bot => 
        bot.id === botId ? { ...bot, isActive } : bot
      ));
    } catch (error) {
      console.error('Error toggling bot:', error);
      alert('Có lỗi xảy ra khi cập nhật bot');
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bot này?')) return;

    try {
      const botRef = doc(db, 'bots', botId);
      await deleteDoc(botRef);

      setBots(bots.filter(bot => bot.id !== botId));
      alert('Bot đã được xóa');
    } catch (error) {
      console.error('Error deleting bot:', error);
      alert('Có lỗi xảy ra khi xóa bot');
    }
  };

  const startEditBot = (bot: Bot) => {
    setEditingBot(bot);
    setNewBot({
      name: bot.name,
      description: bot.description,
      syntax: bot.syntax
    });
    setShowCreateBot(true);
  };

  const updateBot = async () => {
    if (!editingBot) return;

    try {
      const botRef = doc(db, 'bots', editingBot.id);
      await setDoc(botRef, {
        name: newBot.name,
        description: newBot.description,
        syntax: newBot.syntax,
        updatedAt: new Date()
      }, { merge: true });

      setBots(bots.map(bot =>
        bot.id === editingBot.id
          ? { ...bot, name: newBot.name, description: newBot.description, syntax: newBot.syntax }
          : bot
      ));

      setEditingBot(null);
      setShowCreateBot(false);
      setNewBot({ name: '', description: '', syntax: '' });
      alert('Bot đã được cập nhật');
    } catch (error) {
      console.error('Error updating bot:', error);
      alert('Có lỗi xảy ra khi cập nhật bot');
    }
  };

  const cancelEdit = () => {
    setEditingBot(null);
    setShowCreateBot(false);
    setNewBot({ name: '', description: '', syntax: '' });
  };

  const generateShareCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const copyShareCode = (shareCode: string) => {
    navigator.clipboard.writeText(shareCode);
    alert('Mã chia sẻ đã được sao chép!');
  };

  if (isLoading) {
    return <div className="bot-loading">Đang tải danh sách bot...</div>;
  }

  return (
    <div className="bot-manager">
      <div className="bot-header">
        <h3>Bot hiện có ({bots.length})</h3>
        <div className="bot-header-actions">
          <a
            href="/document/subreddit/bot-code"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-button"
          >
            📖 Tài liệu
          </a>
          <button
            onClick={() => setShowCreateBot(true)}
            className="create-bot-button"
          >
            + Tạo Bot
          </button>
        </div>
      </div>

      {showCreateBot && (
        <div className="create-bot-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tạo Bot mới</h3>
              <button 
                onClick={() => setShowCreateBot(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>

            <div className="ai-section">
              <h4>🤖 Tạo bot bằng AI</h4>
              <p>Mô tả chức năng bạn muốn bot thực hiện:</p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ví dụ: Tạo bot tự động xóa bài viết có từ ngữ không phù hợp, bot chào mừng thành viên mới, bot tự động gắn flair cho bài viết..."
                rows={3}
              />
              <button 
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="ai-generate-button"
              >
                {isGenerating ? 'Đang tạo...' : '✨ Tạo bằng AI'}
              </button>
            </div>

            <div className="manual-section">
              <h4>Hoặc tạo thủ công</h4>
              
              <div className="form-group">
                <label>Tên bot</label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot({...newBot, name: e.target.value})}
                  placeholder="Tên bot..."
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={newBot.description}
                  onChange={(e) => setNewBot({...newBot, description: e.target.value})}
                  placeholder="Mô tả chức năng của bot..."
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Cú pháp Bot (JSON)</label>
                <textarea
                  value={newBot.syntax}
                  onChange={(e) => setNewBot({...newBot, syntax: e.target.value})}
                  placeholder="Nhập cú pháp JSON cho bot..."
                  rows={8}
                  className="syntax-textarea"
                />
              </div>

              <div className="modal-actions">
                <button
                  onClick={editingBot ? updateBot : createBot}
                  className="save-button"
                >
                  {editingBot ? 'Cập nhật Bot' : 'Tạo Bot'}
                </button>
                <button
                  onClick={editingBot ? cancelEdit : () => setShowCreateBot(false)}
                  className="cancel-button"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bots-list">
        {bots.length === 0 ? (
          <div className="no-bots">
            <p>Chưa có bot nào. Hãy tạo bot đầu tiên!</p>
          </div>
        ) : (
          bots.map(bot => (
            <div key={bot.id} className="bot-item">
              <div className="bot-info">
                <div className="bot-header-item">
                  <h4>{bot.name}</h4>
                  <div className="bot-status">
                    <span className={`status-indicator ${bot.isActive ? 'active' : 'inactive'}`}>
                      {bot.isActive ? '🟢 Hoạt động' : '🔴 Tạm dừng'}
                    </span>
                  </div>
                </div>
                <p className="bot-description">{bot.description}</p>
                <div className="bot-meta">
                  <span>Tạo: {bot.createdAt.toLocaleDateString('vi-VN')}</span>
                  {bot.shareCode && (
                    <span 
                      className="share-code"
                      onClick={() => copyShareCode(bot.shareCode!)}
                      title="Click để sao chép mã chia sẻ"
                    >
                      📋 {bot.shareCode}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bot-actions">
                <button
                  onClick={() => toggleBot(bot.id, !bot.isActive)}
                  className={`toggle-button ${bot.isActive ? 'pause' : 'play'}`}
                >
                  {bot.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                </button>
                <button
                  onClick={() => startEditBot(bot)}
                  className="edit-button"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => deleteBot(bot.id)}
                  className="delete-button"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bot-syntax-guide">
        <h4>📖 Hướng dẫn cú pháp Bot</h4>
        <details>
          <summary>Xem ví dụ cú pháp</summary>
          <pre className="syntax-example">
{`{
  "triggers": [
    {
      "type": "post_created",
      "conditions": {
        "content_contains": ["spam", "quảng cáo"],
        "author_karma": { "less_than": 10 }
      }
    }
  ],
  "actions": [
    {
      "type": "remove_post",
      "reason": "Nội dung không phù hợp"
    },
    {
      "type": "send_message",
      "target": "author",
      "message": "Bài viết của bạn đã bị xóa do vi phạm quy tắc"
    }
  ]
}`}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default BotManager;
