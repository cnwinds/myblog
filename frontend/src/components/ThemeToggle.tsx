import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className="theme-toggle" title={`切换到${theme === 'light' ? '暗色' : '亮色'}主题`}>
      {theme === 'light' ? <FiMoon /> : <FiSun />}
    </button>
  );
}
