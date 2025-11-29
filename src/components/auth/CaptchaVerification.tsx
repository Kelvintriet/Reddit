import { useState, useEffect, useRef, useCallback } from 'react';
import { useCaptchaStore } from '../../store/useCaptchaStore';
import './CaptchaVerification.css';

/**
 * Simple, creative CAPTCHA - no icons, no gradients
 */
export const CaptchaVerificationModal: React.FC = () => {
  const {
    challenge,
    isLoadingChallenge,
    showVerificationModal,
    error,
    fetchChallenge,
    verifyHold,
    closeVerificationModal,
    clearError,
    clientIP,
    fetchIP,
    getReleaseTolerance
  } = useCaptchaStore();

  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showReleasePrompt, setShowReleasePrompt] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const holdStartTime = useRef<number | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const releaseTolerance = getReleaseTolerance();

  useEffect(() => {
    if (showVerificationModal) {
      if (!clientIP) fetchIP();
      if (!challenge) fetchChallenge();
    }
  }, [showVerificationModal, clientIP, challenge, fetchIP, fetchChallenge]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const startHold = useCallback(() => {
    if (isVerifying || verified || !challenge) return;

    clearError();
    setIsHolding(true);
    setShowReleasePrompt(false);
    holdStartTime.current = Date.now();
    setProgress(0);
    setElapsedTime(0);

    progressInterval.current = setInterval(() => {
      if (holdStartTime.current && challenge) {
        const elapsed = Date.now() - holdStartTime.current;
        const newProgress = Math.min((elapsed / challenge.requiredHoldTime) * 100, 100);

        setProgress(newProgress);
        setElapsedTime(elapsed);

        if (newProgress >= 95 && !showReleasePrompt) {
          setShowReleasePrompt(true);
        }

        if (elapsed >= challenge.requiredHoldTime + 500) {
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }
        }
      }
    }, 16);
  }, [isVerifying, verified, challenge, clearError, showReleasePrompt]);

  const endHold = useCallback(async () => {
    if (!isHolding || isVerifying || verified || !challenge || !holdStartTime.current) return;

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    const holdTime = Date.now() - holdStartTime.current;

    setIsHolding(false);
    setShowReleasePrompt(false);

    if (holdTime < challenge.requiredHoldTime - releaseTolerance) {
      setProgress(0);
      setElapsedTime(0);
      holdStartTime.current = null;
      return;
    }

    setIsVerifying(true);

    const success = await verifyHold(holdTime, challenge.requiredHoldTime);

    if (success) {
      setVerified(true);
      setProgress(100);
      setTimeout(() => {
        closeVerificationModal();
        setVerified(false);
        setProgress(0);
        setElapsedTime(0);
      }, 800);
    } else {
      setProgress(0);
      setElapsedTime(0);
    }

    setIsVerifying(false);
    holdStartTime.current = null;
  }, [isHolding, isVerifying, verified, challenge, releaseTolerance, verifyHold, closeVerificationModal]);

  const handleRefresh = () => {
    setProgress(0);
    setElapsedTime(0);
    setIsHolding(false);
    clearError();
    fetchChallenge();
  };

  if (!showVerificationModal) return null;

  const formatTime = (ms: number) => (ms / 1000).toFixed(2);

  return (
    <div className="cv-overlay" onClick={() => closeVerificationModal()}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cv-close" onClick={() => closeVerificationModal()}>×</button>

        <div className="cv-header">
          <span className="cv-title">are you human?</span>
          <span className="cv-subtitle">hold the button for exactly {challenge ? formatTime(challenge.requiredHoldTime) : '...'}s</span>
        </div>

        {error && <div className="cv-error">{error}</div>}

        <div className="cv-content">
          {isLoadingChallenge ? (
            <div className="cv-loading">
              <span className="cv-dots">...</span>
            </div>
          ) : verified ? (
            <div className="cv-success">
              <span className="cv-check">✓</span>
              <span>verified</span>
            </div>
          ) : challenge ? (
            <>
              <div className="cv-stats">
                <div className="cv-stat">
                  <span className="cv-stat-label">target</span>
                  <span className="cv-stat-value">{formatTime(challenge.requiredHoldTime)}s</span>
                </div>
                <div className="cv-stat">
                  <span className="cv-stat-label">current</span>
                  <span className="cv-stat-value">{formatTime(elapsedTime)}s</span>
                </div>
                <div className="cv-stat">
                  <span className="cv-stat-label">tolerance</span>
                  <span className="cv-stat-value">±{releaseTolerance}ms</span>
                </div>
              </div>

              <div className="cv-bar-container">
                <div className="cv-bar" style={{ width: `${progress}%` }} />
                <span className="cv-bar-text">{Math.round(progress)}%</span>
              </div>

              <button
                className={`cv-hold-btn ${isHolding ? 'holding' : ''} ${isVerifying ? 'verifying' : ''} ${showReleasePrompt ? 'release' : ''}`}
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                disabled={isVerifying || verified}
              >
                {isVerifying ? 'checking...' : isHolding ? (showReleasePrompt ? 'RELEASE!' : 'holding...') : 'hold me'}
              </button>

              <button className="cv-refresh" onClick={handleRefresh}>
                ↻ new challenge
              </button>
            </>
          ) : null}
        </div>

        {clientIP && <div className="cv-ip">{clientIP}</div>}
      </div>
    </div>
  );
};

/**
 * CAPTCHA Gate - blocks app until verified
 */
export const CaptchaGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isVerified, isCheckingStatus, checkStatus, openVerificationModal, showVerificationModal } = useCaptchaStore();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (isCheckingStatus) {
    return (
      <div className="cv-gate">
        <span className="cv-gate-dots">...</span>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <>
        <div className="cv-gate">
          <div className="cv-gate-box">
            <span className="cv-gate-title">⚡</span>
            <span className="cv-gate-text">quick verification needed</span>
            <button className="cv-gate-btn" onClick={openVerificationModal}>
              i'm not a robot
            </button>
          </div>
        </div>
        {showVerificationModal && <CaptchaVerificationModal />}
      </>
    );
  }

  return <>{children}</>;
};

/**
 * Verified Badge
 */
export const CaptchaVerifiedBadge: React.FC = () => {
  const { isVerified } = useCaptchaStore();
  if (!isVerified) return null;
  return <span className="cv-badge">✓ verified</span>;
};

/**
 * Hook for CAPTCHA verification
 */
export const useRequireCaptcha = () => {
  const { isVerified, getToken, openVerificationModal, checkStatus } = useCaptchaStore();

  const requireVerification = useCallback(async (action: () => void | Promise<void>) => {
    const verified = await checkStatus();
    if (!verified) {
      openVerificationModal();
      return false;
    }
    await action();
    return true;
  }, [checkStatus, openVerificationModal]);

  const getCaptchaHeaders = useCallback(() => {
    const token = getToken();
    return token ? { 'X-Captcha-Token': token } : {};
  }, [getToken]);

  return { isVerified, requireVerification, getCaptchaHeaders, openVerificationModal };
};

export default CaptchaVerificationModal;
