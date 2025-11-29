import { useState, useEffect, useCallback } from 'react';
import { useCaptchaStore } from '../../store/useCaptchaStore';
import './CaptchaVerification.css';

/**
 * Simple dot-click CAPTCHA
 * - Shows 5 dots that appear one by one
 * - User must click each dot
 * - Bot detection: too fast (<150ms) or too consistent timing = bot
 */

interface Dot {
  id: number;
  x: number;
  y: number;
  clicked: boolean;
}

// Generate random position within bounds
const randomPos = () => ({
  x: 20 + Math.random() * 60, // 20-80% from left
  y: 20 + Math.random() * 60  // 20-80% from top
});

export const CaptchaVerificationModal: React.FC = () => {
  const { showModal, error, verify, closeModal, clearError, clientIP } = useCaptchaStore();
  
  const [dots, setDots] = useState<Dot[]>([]);
  const [currentDot, setCurrentDot] = useState(0);
  const [clickTimes, setClickTimes] = useState<number[]>([]);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const TOTAL_DOTS = 5;

  // Initialize dots
  const initDots = useCallback(() => {
    const newDots: Dot[] = [];
    for (let i = 0; i < TOTAL_DOTS; i++) {
      const pos = randomPos();
      newDots.push({ id: i, x: pos.x, y: pos.y, clicked: false });
    }
    setDots(newDots);
    setCurrentDot(0);
    setClickTimes([]);
    setLastClickTime(Date.now());
    setSuccess(false);
    setLocalError(null);
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (showModal) {
      initDots();
    }
  }, [showModal, initDots]);

  const handleDotClick = async (dotId: number) => {
    if (dotId !== currentDot || isVerifying || success) return;

    const now = Date.now();
    const timeSinceLast = now - lastClickTime;
    
    // Record click time
    const newClickTimes = [...clickTimes, timeSinceLast];
    setClickTimes(newClickTimes);
    setLastClickTime(now);

    // Mark dot as clicked
    setDots(prev => prev.map(d => 
      d.id === dotId ? { ...d, clicked: true } : d
    ));

    // Move to next dot or verify
    if (currentDot < TOTAL_DOTS - 1) {
      setCurrentDot(currentDot + 1);
    } else {
      // All dots clicked - verify
      setIsVerifying(true);
      
      const result = await verify(newClickTimes);
      
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          closeModal();
        }, 500);
      } else {
        // Reset for retry
        setTimeout(() => {
          initDots();
        }, 1000);
      }
      
      setIsVerifying(false);
    }
  };

  const handleMissClick = () => {
    if (isVerifying || success) return;
    setLocalError('Click the dot!');
    setTimeout(() => setLocalError(null), 1000);
  };

  if (!showModal) return null;

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cv-close" onClick={closeModal}>x</button>
        
        <div className="cv-header">
          <span className="cv-title">click the dots</span>
          <span className="cv-subtitle">{currentDot + 1} / {TOTAL_DOTS}</span>
        </div>

        {(error || localError) && (
          <div className="cv-error">{error || localError}</div>
        )}

        {success ? (
          <div className="cv-success">
            <span className="cv-check">OK</span>
            <span>verified</span>
          </div>
        ) : (
          <div className="cv-dot-area" onClick={handleMissClick}>
            {dots.map((dot, index) => (
              <div
                key={dot.id}
                className={`cv-dot ${dot.clicked ? 'clicked' : ''} ${index === currentDot ? 'active' : ''} ${index < currentDot ? 'done' : ''}`}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDotClick(dot.id);
                }}
              />
            ))}
            
            {isVerifying && (
              <div className="cv-verifying">checking...</div>
            )}
          </div>
        )}

        <button className="cv-refresh" onClick={initDots} disabled={isVerifying}>
          reset
        </button>

        {clientIP && <div className="cv-ip">{clientIP}</div>}
      </div>
    </div>
  );
};

/**
 * CAPTCHA Gate - blocks app until IP is verified
 */
export const CaptchaGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isVerified, isChecking, checkIP, openModal, showModal } = useCaptchaStore();

  useEffect(() => {
    checkIP();
  }, [checkIP]);

  // Still checking IP
  if (isChecking) {
    return (
      <div className="cv-gate">
        <span className="cv-gate-dots">...</span>
      </div>
    );
  }

  // Not verified - show gate
  if (!isVerified) {
    return (
      <>
        <div className="cv-gate">
          <div className="cv-gate-box">
            <span className="cv-gate-title">!</span>
            <span className="cv-gate-text">quick check needed</span>
            <button className="cv-gate-btn" onClick={openModal}>
              verify
            </button>
          </div>
        </div>
        {showModal && <CaptchaVerificationModal />}
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
  return <span className="cv-badge">OK</span>;
};

/**
 * Hook
 */
export const useRequireCaptcha = () => {
  const { isVerified, openModal, checkIP } = useCaptchaStore();

  const requireVerification = useCallback(async (action: () => void | Promise<void>) => {
    const verified = await checkIP();
    if (!verified) {
      openModal();
      return false;
    }
    await action();
    return true;
  }, [checkIP, openModal]);

  return { isVerified, requireVerification, openModal };
};

export default CaptchaVerificationModal;
