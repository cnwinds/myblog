import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = `切换到${theme === 'light' ? '暗色' : '亮色'}主题`;

  return (
    <button type="button" onClick={toggleTheme} className="icon-btn" title={label} aria-label={label}>
      {theme === 'light' ? <FiMoon /> : <FiSun />}
    </button>
  );
}
