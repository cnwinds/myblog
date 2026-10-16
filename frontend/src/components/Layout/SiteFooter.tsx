import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export default function SiteFooter() {
  return (
    <footer className="site-footer container">
      <div className="site-footer-row">
        <span>
          © {new Date().getFullYear()} {siteConfig.name} · {siteConfig.status}
        </span>
        <span className="site-footer-links">
          <Link to="/">博客</Link>
          <Link to="/lab">实验室</Link>
          <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </span>
      </div>
      <div className="site-footer-word" aria-hidden="true">
        {siteConfig.name}
      </div>
    </footer>
  );
}
