import { useState, useEffect } from 'react'
import { useSubredditsStore, useAuthStore } from '../../store'
import { useNavigate } from 'react-router-dom'
import './CreateSubredditForm.css'

interface CreateSubredditFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const CreateSubredditForm = ({ onSuccess, onCancel }: CreateSubredditFormProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [rules, setRules] = useState<string[]>(['Hãy tôn trọng các thành viên khác'])
  const [newRule, setNewRule] = useState('')
  const navigate = useNavigate()
  
  const { createSubreddit, isLoading, error, clearError } = useSubredditsStore()
  const { user } = useAuthStore()
  
  useEffect(() => {
    // Kiểm tra nếu người dùng chưa đăng nhập, chuyển hướng đến trang đăng nhập
    if (!user) {
      navigate('/login', { state: { from: '/create-community' } })
    }
  }, [user, navigate])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !description) return
    
    // Xóa các ký tự đặc biệt, chỉ cho phép chữ cái, số và dấu gạch dưới
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '')
    
    if (sanitizedName !== name) {
      alert('Tên subreddit chỉ được chứa chữ cái thường, số và dấu gạch dưới')
      setName(sanitizedName)
      return
    }
    
    try {
      await createSubreddit({
        name,
        description,
        isPrivate,
        rules
      })
      
      // Reset form
      setName('')
      setDescription('')
      setIsPrivate(false)
      setRules(['Hãy tôn trọng các thành viên khác'])
      
      if (onSuccess) onSuccess()
      
      // Chuyển hướng đến trang subreddit vừa tạo
      navigate(`/r/${name}`)
    } catch (error) {
      console.error('Lỗi khi tạo subreddit:', error)
    }
  }
  
  const addRule = () => {
    if (!newRule.trim()) return
    setRules([...rules, newRule.trim()])
    setNewRule('')
  }
  
  const removeRule = (index: number) => {
    const updatedRules = [...rules]
    updatedRules.splice(index, 1)
    setRules(updatedRules)
  }
  
  if (!user) {
    return (
      <div className="create-subreddit-container">
        <div className="auth-message">
          <div className="auth-icon">🔒</div>
          <h2>Bạn cần đăng nhập để tạo subreddit</h2>
          <button 
            onClick={() => navigate('/login')}
            className="auth-button"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="create-subreddit-container">
      <div className="create-subreddit-card">
        <h2 className="create-subreddit-title">Tạo Subreddit mới</h2>
        
        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="error-close-button"
            >
              ✕
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="create-subreddit-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Tên Subreddit
            </label>
            <div className="subreddit-name-input">
              <span className="subreddit-prefix">r/</span>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="tên_cộng_đồng"
                maxLength={21}
                required
              />
            </div>
            <p className="form-hint">
              {name.length}/21 ký tự • Chỉ được chứa chữ cái thường, số và dấu gạch dưới
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Mô tả
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={4}
              maxLength={500}
              required
            />
            <p className="form-hint">
              {description.length}/500 ký tự
            </p>
          </div>
          
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="checkbox-input"
            />
            <label htmlFor="isPrivate" className="checkbox-label">
              Subreddit riêng tư (chỉ thành viên mới có thể xem)
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              Quy tắc cộng đồng
            </label>
            
            <ul className="rules-list">
              {rules.map((rule, index) => (
                <li key={index} className="rule-item">
                  <span>{rule}</span>
                  <button 
                    type="button"
                    onClick={() => removeRule(index)}
                    className="rule-remove-button"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            
            <div className="rule-input-group">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="form-input"
                placeholder="Nhập quy tắc mới"
              />
              <button
                type="button"
                onClick={addRule}
                className="rule-add-button"
                disabled={!newRule.trim()}
              >
                Thêm
              </button>
            </div>
          </div>
          
          <div className="form-actions">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                Hủy
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !name || !description}
              className="btn-primary"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo Subreddit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSubredditForm 