import { useState } from 'react';
import { FiLock, FiSave, FiEye, FiEyeOff } from 'react-icons/fi';
import { authService } from '../../services/auth';
import './Settings.css';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // 验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度至少为6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密码和确认密码不一致');
      return;
    }

    if (oldPassword === newPassword) {
      setError('新密码不能与旧密码相同');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        oldPassword,
        newPassword,
      });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // 3秒后清除成功消息
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '密码修改失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>修改密码</h2>
      </div>

      <div className="info-box">
        <span className="info-icon">
          <FiLock />
        </span>
        <div>
          <strong>密码修改说明：</strong>
          请确保新密码长度至少为6个字符，并且与旧密码不同。修改密码后，请妥善保管新密码。
        </div>
      </div>

      <form onSubmit={handleSubmit} className="change-password-form">
        <div className="form-group">
          <label htmlFor="oldPassword">
            <span className="required">*</span> 旧密码
          </label>
          <div className="password-input-wrapper">
            <input
              id="oldPassword"
              type={showOldPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="请输入当前密码"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowOldPassword(!showOldPassword)}
              tabIndex={-1}
            >
              {showOldPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">
            <span className="required">*</span> 新密码
          </label>
          <div className="password-input-wrapper">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              placeholder="请输入新密码（至少6个字符）"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
            >
              {showNewPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">
            <span className="required">*</span> 确认新密码
          </label>
          <div className="password-input-wrapper">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              placeholder="请再次输入新密码"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">密码修改成功！</div>}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            <FiSave />
            <span>{loading ? '修改中...' : '修改密码'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
