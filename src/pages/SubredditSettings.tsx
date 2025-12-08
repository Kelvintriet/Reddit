import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useSubredditsStore } from '../store';
import { validateSettingsToken } from '../services/settingsTokenService';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../constants/translations';
import './SubredditSettings.css';

const SubredditSettings: React.FC = () => {
  const { subreddit: subredditName } = useParams<{ subreddit: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSubreddit, fetchSubredditByName, updateSubreddit, deleteSubreddit } = useSubredditsStore();
  const { language } = useLanguageStore();
  const t = (key: keyof typeof translations.vi) => translations[language][key];

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
      alert(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(t('errorSavingSettings'));
    }
  };

  const handleSaveRules = async () => {
    if (!currentSubreddit) return;

    try {
      const filteredRules = rules.filter(rule => rule.trim() !== '');
      await updateSubreddit(currentSubreddit.id, {
        rules: filteredRules
      });
      alert(t('rulesSaved'));
    } catch (error) {
      console.error('Error saving rules:', error);
      alert(t('errorSavingRules'));
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
      alert(t('enterCommunityName'));
      return;
    }

    try {
      await deleteSubreddit(currentSubreddit.id);
      alert(t('communityDisbanded'));
      navigate('/');
    } catch (error) {
      console.error('Error disbanding subreddit:', error);
      alert(t('errorDisbanding'));
    }
  };

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>{t('verifyingAccess')}</p>
      </div>
    );
  }

  if (!isValidToken || !currentSubreddit) {
    return (
      <div className="settings-error">
        <h2>{t('noAccess')}</h2>
        <p>{t('noAccessDesc')}</p>
      </div>
    );
  }

  return (
    <div className="subreddit-settings">
      <div className="settings-header">
        <h1>{t('settingsFor')} r/{currentSubreddit.name}</h1>
        <button
          onClick={() => navigate(`/r/${currentSubreddit.name}`)}
          className="back-button"
        >
          ← {t('back')}
        </button>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {t('generalSettings')}
        </button>
        <button
          className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          {t('communityRules')}
        </button>
        <button
          className={`tab ${activeTab === 'danger' ? 'active' : ''}`}
          onClick={() => setActiveTab('danger')}
        >
          {t('dangerZone')}
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <h2>{t('generalSettings')}</h2>

            <div className="form-group">
              <label htmlFor="description">{t('communityDescription')}</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('communityDescriptionPlaceholder')}
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
                {t('privateCommunity')}
              </label>
              <p className="help-text">
                {t('privateCommunityDesc')}
              </p>
            </div>

            <button onClick={handleSaveGeneral} className="save-button">
              {t('saveSettings')}
            </button>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="settings-section">
            <h2>{t('communityRules')}</h2>

            {rules.map((rule, index) => (
              <div key={index} className="rule-item">
                <div className="rule-header">
                  <span>{t('rule')} {index + 1}</span>
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
                  placeholder={t('enterRule')}
                  rows={2}
                />
              </div>
            ))}

            <button onClick={addRule} className="add-rule-button">
              + {t('addRule')}
            </button>

            <button onClick={handleSaveRules} className="save-button">
              {t('saveRules')}
            </button>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="settings-section danger-zone">
            <h2>{t('dangerZone')}</h2>

            <div className="danger-item">
              <h3>{t('disbandCommunity')}</h3>
              <p>{t('disbandCommunityDesc')}</p>

              {!showDisbandConfirm ? (
                <button
                  onClick={() => setShowDisbandConfirm(true)}
                  className="danger-button"
                >
                  {t('disbandCommunity')}
                </button>
              ) : (
                <div className="disband-confirm">
                  <p>{t('disbandConfirmPrompt')} <strong>{currentSubreddit.name}</strong></p>
                  <input
                    type="text"
                    value={disbandConfirmText}
                    onChange={(e) => setDisbandConfirmText(e.target.value)}
                    placeholder={currentSubreddit.name}
                  />
                  <div className="confirm-buttons">
                    <button onClick={handleDisband} className="danger-button">
                      {t('confirmDisband')}
                    </button>
                    <button
                      onClick={() => {
                        setShowDisbandConfirm(false);
                        setDisbandConfirmText('');
                      }}
                      className="cancel-button"
                    >
                      {t('cancel')}
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
