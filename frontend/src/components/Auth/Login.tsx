import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/errorHandler';
import { siteConfig } from '../../config/site';
import Backdrop from '../Layout/Backdrop';
import BrandMark from '../Layout/BrandMark';
import ThemeToggle from '../ThemeToggle';
import '../Layout/Layout.css';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, '登录失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Backdrop />
      <div className="login-topbar">
        <Link to="/" className="login-back mono">
          <FiArrowLeft />
          <span>回到首页</span>
        </Link>
        <ThemeToggle />
      </div>
      <div className="login-box">
        <div className="login-brand">
          <BrandMark size={44} />
          <span className="mono">{siteConfig.name}</span>
        </div>
        <span className="eyebrow">Sign in · 管理入口</span>
        <h1>
          欢迎回来，<span className="latin">welcome.</span>
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="mono">USERNAME · 用户名</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="mono">PASSWORD · 密码</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-wind submit-btn">
            <span>{loading ? '登录中...' : '登录'}</span>
            {!loading && <FiArrowRight />}
          </button>
        </form>
      </div>
    </div>
  );
}
