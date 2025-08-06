import React, { useState } from 'react';
import { REGIONS, getRegionCode, generateCustomUID, validateUserNumbers, validateAtName } from '../../constants/regions';
import { useAuthStore } from '../../store';
import { updateUserProfile, checkAtNameAvailability } from '../../collections/users';
import './OnboardingModal.css';

interface OnboardingModalProps {
  onComplete: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [atName, setAtName] = useState('');
  const [userNumbers, setUserNumbers] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const handleAtNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setAtName(value);
    
    // Clear error when user types
    if (errors.atName) {
      setErrors(prev => ({ ...prev, atName: '' }));
    }
  };
  
  const handleUserNumbersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
    setUserNumbers(value);
    
    // Clear error when user types
    if (errors.userNumbers) {
      setErrors(prev => ({ ...prev, userNumbers: '' }));
    }
  };
  
  const validateStep1 = async () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!atName) {
      newErrors.atName = 'Tên @name là bắt buộc';
    } else if (!validateAtName(atName)) {
      newErrors.atName = 'Tên @name phải từ 3-20 ký tự (chỉ chữ, số và _)';
    } else {
      // Kiểm tra availability
      setIsCheckingName(true);
      try {
        const isAvailable = await checkAtNameAvailability(atName);
        if (!isAvailable) {
          newErrors.atName = 'Tên @name này đã được sử dụng. Vui lòng chọn tên khác.';
        }
      } catch (error) {
        newErrors.atName = 'Không thể kiểm tra tên @name. Vui lòng thử lại.';
      } finally {
        setIsCheckingName(false);
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep2 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!userNumbers) {
      newErrors.userNumbers = '3 chữ số là bắt buộc';
    } else if (!validateUserNumbers(userNumbers)) {
      newErrors.userNumbers = 'Phải là 3 chữ số';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateStep3 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!selectedRegion) {
      newErrors.region = 'Vui lòng chọn khu vực của bạn';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = async () => {
    if (step === 1) {
      if (await validateStep1()) {
        setStep(2);
      }
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4); // Final confirmation step
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const handleComplete = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const regionCode = getRegionCode(selectedRegion);
      const customUID = generateCustomUID(userNumbers, regionCode);
      
      await updateUserProfile(user.uid, {
        atName,
        customUID,
        region: selectedRegion,
        regionCode,
        onboardingCompleted: true
      });
      
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setErrors({ general: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStep1 = () => (
    <div className="onboarding-step">
      <div className="step-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 10.65 13.65 12 12 12C10.35 12 9 10.65 9 9V7L3 7V9C3 11.76 5.24 14 8 14L16 14C18.76 14 21 11.76 21 9ZM12 13C8.69 13 6 15.69 6 19V21H18V19C18 15.69 15.31 13 12 13Z"/>
        </svg>
      </div>
      <h2>Chọn tên @name của bạn</h2>
      <p>Đây sẽ là định danh duy nhất của bạn trên nền tảng. Tên này không thể thay đổi sau khi đã chọn.</p>
      
      <div className="form-group">
        <label htmlFor="atName">Tên @name</label>
        <div className="input-wrapper">
          <span className="input-prefix">@</span>
          <input
            type="text"
            id="atName"
            value={atName}
            onChange={handleAtNameChange}
            placeholder="tenminhthich"
            maxLength={20}
            className={errors.atName ? 'error' : ''}
            disabled={isCheckingName}
          />
        </div>
        {isCheckingName && <span className="checking-text">Đang kiểm tra...</span>}
        {errors.atName && <span className="error-text">{errors.atName}</span>}
        <small>3-20 ký tự. Chỉ sử dụng chữ cái, số và dấu gạch dưới (_)</small>
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div className="onboarding-step">
      <div className="step-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.48 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
        </svg>
      </div>
      <h2>Chọn 3 chữ số của bạn</h2>
      <p>3 chữ số này sẽ là một phần của mã ID duy nhất của bạn. Hãy chọn những con số có ý nghĩa với bạn!</p>
      
      <div className="uid-preview">
        <div className="uid-parts">
          <span className="uid-part random">XXX</span>
          <span className="uid-separator">-</span>
          <span className="uid-part user">{userNumbers || 'YYY'}</span>
          <span className="uid-separator">-</span>
          <span className="uid-part region">ZZZ</span>
        </div>
        <small>Số ngẫu nhiên - Số của bạn - Mã vùng</small>
      </div>
      
      <div className="form-group">
        <label htmlFor="userNumbers">3 chữ số của bạn</label>
        <input
          type="text"
          id="userNumbers"
          value={userNumbers}
          onChange={handleUserNumbersChange}
          placeholder="123"
          maxLength={3}
          className={errors.userNumbers ? 'error' : ''}
        />
        {errors.userNumbers && <span className="error-text">{errors.userNumbers}</span>}
        <small>Ví dụ: ngày sinh, số may mắn, hoặc bất kỳ 3 chữ số nào bạn thích</small>
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div className="onboarding-step">
      <div className="step-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z"/>
        </svg>
      </div>
      <h2>Chọn khu vực của bạn</h2>
      <p>Khu vực này sẽ được sử dụng để tạo mã vùng trong ID của bạn và giúp kết nối với cộng đồng địa phương.</p>
      
      <div className="form-group">
        <label htmlFor="region">Khu vực của bạn</label>
        <select
          id="region"
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className={errors.region ? 'error' : ''}
        >
          <option value="">Chọn khu vực</option>
          {REGIONS.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
        {errors.region && <span className="error-text">{errors.region}</span>}
      </div>
      
      {selectedRegion && (
        <div className="region-preview">
          <p>Mã vùng: <strong>{getRegionCode(selectedRegion)}</strong></p>
        </div>
      )}
    </div>
  );
  
  const renderStep4 = () => {
    const regionCode = getRegionCode(selectedRegion);
    const finalUID = generateCustomUID(userNumbers, regionCode);
    
    return (
      <div className="onboarding-step">
        <div className="step-icon success">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59Z"/>
          </svg>
        </div>
        <h2>Xác nhận thông tin</h2>
        <p>Vui lòng kiểm tra thông tin của bạn. Sau khi xác nhận, bạn không thể thay đổi tên @name và ID.</p>
        
        <div className="confirmation-details">
          <div className="detail-item">
            <strong>Tên @name:</strong>
            <span>@{atName}</span>
          </div>
          <div className="detail-item">
            <strong>ID duy nhất:</strong>
            <span className="uid-display">{finalUID}</span>
          </div>
          <div className="detail-item">
            <strong>Khu vực:</strong>
            <span>{selectedRegion} ({regionCode})</span>
          </div>
        </div>
        
        {errors.general && <div className="error-text">{errors.general}</div>}
      </div>
    );
  };
  
  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-modal">
        <div className="onboarding-header">
          <div className="step-indicator">
            <span className="step-number">{step}</span>
            <span className="step-total">/ 4</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="onboarding-content">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
        
        <div className="onboarding-actions">
          {step > 1 && (
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Quay lại
            </button>
          )}
          
          {step < 4 ? (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleNext}
              disabled={isCheckingName}
            >
              {isCheckingName ? 'Đang kiểm tra...' : 'Tiếp tục'}
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang hoàn thành...' : 'Hoàn thành'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal; 