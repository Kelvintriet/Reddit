import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useSubredditsStore } from '../store';
import { validateSettingsToken } from '../services/settingsTokenService';
import './SubredditSettings.css';

const SubredditSettings: React.FC = () => {
  const { subreddit: subredditName } = useParams<{ subreddit: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSubreddit, fetchSubredditByName, updateSubreddit, deleteSubreddit } = useSubredditsStore();

  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'danger'>('general');

  // Form states
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string[]>(['']);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [disbandConfirmText, setDisbandConfirmText] = useState('');

  useEffect(() => {
    const validateAccess = async () => {
      if (!subredditName || !user) {
        navigate('/');
        return;
      }

      // Get token from URL
      const token = searchParams.get('rules');
      if (!token || token.length !== 64) {
        navigate(`/r/${subredditName}`);
        return;
      }

      try {
        // Fetch subreddit data
        await fetchSubredditByName(subredditName);

        // Validate token and ownership
        const isValid = await validateSettingsToken(subredditName, token, user.uid);
        if (!isValid) {
          navigate(`/r/${subredditName}`);
          return;
        }

        setIsValidToken(true);
      } catch (error) {
        console.error('Error validating access:', error);
        navigate(`/r/${subredditName}`);
      } finally {
        setIsLoading(false);
      }
    };

    validateAccess();
  }, [subredditName, user, searchParams, navigate, fetchSubredditByName]);

  useEffect(() => {
    if (currentSubreddit) {
      setDescription(currentSubreddit.description || '');
      setRules(currentSubreddit.rules || ['']);
      setIsPrivate(currentSubreddit.isPrivate || false);
    }
  }, [currentSubreddit]);

  const handleSaveGeneral = async () => {
    if (!currentSubreddit) return;

    try {
      await updateSubreddit(currentSubreddit.id, {
        description,
        isPrivate
      });
      alert('Cài đặt đã được lưu!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Có lỗi xảy ra khi lưu cài đặt');
    }
  };

  const handleSaveRules = async () => {
    if (!currentSubreddit) return;

    try {
      const filteredRules = rules.filter(rule => rule.trim() !== '');
      await updateSubreddit(currentSubreddit.id, {
        rules: filteredRules
      });
      alert('Quy tắc đã được lưu!');
    } catch (error) {
      console.error('Error saving rules:', error);
      alert('Có lỗi xảy ra khi lưu quy tắc');
    }
  };

  const addRule = () => {
    setRules([...rules, '']);
  };

  const updateRule = (index: number, value: string) => {
    const newRules = [...rules];
    newRules[index] = value;
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    if (rules.length > 1) {
      const newRules = rules.filter((_, i) => i !== index);
      setRules(newRules);
    }
  };

  const handleDisband = async () => {
    if (!currentSubreddit || disbandConfirmText !== currentSubreddit.name) {
      alert('Vui lòng nhập chính xác tên cộng đồng để xác nhận');
      return;
    }

    try {
      await deleteSubreddit(currentSubreddit.id);
      alert('Cộng đồng đã được giải tán');
      navigate('/');
    } catch (error) {
      console.error('Error disbanding subreddit:', error);
      alert('Có lỗi xảy ra khi giải tán cộng đồng');
    }
  };

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Đang xác thực quyền truy cập...</p>
      </div>
    );
  }

  if (!isValidToken || !currentSubreddit) {
    return (
      <div className="settings-error">
        <h2>Không có quyền truy cập</h2>
        <p>Bạn không có quyền truy cập vào trang cài đặt này.</p>
      </div>
    );
  }

  return (
    <div className="subreddit-settings">
      <div className="settings-header">
        <h1>Cài đặt r/{currentSubreddit.name}</h1>
        <button
          onClick={() => navigate(`/r/${currentSubreddit.name}`)}
          className="back-button"
        >
          ← Quay lại
        </button>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Chung
        </button>
        <button
          className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Quy tắc
        </button>
        <button
          className={`tab ${activeTab === 'danger' ? 'active' : ''}`}
          onClick={() => setActiveTab('danger')}
        >
          Nguy hiểm
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <h2>Cài đặt chung</h2>

            <div className="form-group">
              <label htmlFor="description">Mô tả cộng đồng</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả về cộng đồng của bạn..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                Cộng đồng riêng tư
              </label>
              <p className="help-text">
                Cộng đồng riêng tư chỉ có thành viên được mời mới có thể xem và tham gia
              </p>
            </div>

            <button onClick={handleSaveGeneral} className="save-button">
              Lưu cài đặt
            </button>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="settings-section">
            <h2>Quy tắc cộng đồng</h2>

            {rules.map((rule, index) => (
              <div key={index} className="rule-item">
                <div className="rule-header">
                  <span>Quy tắc {index + 1}</span>
                  {rules.length > 1 && (
                    <button
                      onClick={() => removeRule(index)}
                      className="remove-rule-button"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <textarea
                  value={rule}
                  onChange={(e) => updateRule(index, e.target.value)}
                  placeholder="Nhập quy tắc..."
                  rows={2}
                />
              </div>
            ))}

            <button onClick={addRule} className="add-rule-button">
              + Thêm quy tắc
            </button>

            <button onClick={handleSaveRules} className="save-button">
              Lưu quy tắc
            </button>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="settings-section danger-zone">
            <h2>Vùng nguy hiểm</h2>

            <div className="danger-item">
              <h3>Giải tán cộng đồng</h3>
              <p>Hành động này sẽ xóa vĩnh viễn cộng đồng và tất cả dữ liệu liên quan. Không thể hoàn tác!</p>

              {!showDisbandConfirm ? (
                <button
                  onClick={() => setShowDisbandConfirm(true)}
                  className="danger-button"
                >
                  Giải tán cộng đồng
                </button>
              ) : (
                <div className="disband-confirm">
                  <p>Nhập tên cộng đồng <strong>{currentSubreddit.name}</strong> để xác nhận:</p>
                  <input
                    type="text"
                    value={disbandConfirmText}
                    onChange={(e) => setDisbandConfirmText(e.target.value)}
                    placeholder={currentSubreddit.name}
                  />
                  <div className="confirm-buttons">
                    <button onClick={handleDisband} className="danger-button">
                      Xác nhận giải tán
                    </button>
                    <button
                      onClick={() => {
                        setShowDisbandConfirm(false);
                        setDisbandConfirmText('');
                      }}
                      className="cancel-button"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubredditSettings;
