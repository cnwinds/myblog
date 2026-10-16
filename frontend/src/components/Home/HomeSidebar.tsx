import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '../../services/article';
import { siteConfig } from '../../config/site';
import { getArticleExcerpt, getCoverImage, weeklyActivity } from '../../utils/articleText';
import { parseChinaDateTime } from '../../utils/dateUtils';
import BrandMark from '../Layout/BrandMark';
import CoverImage from '../Article/CoverImage';

interface HomeSidebarProps {
  posts: Article[];
  labs: Article[];
}

const PULSE_WEEKS = 52;

function pulseLevel(count: number): string {
  if (count === 0) return '';
  if (count === 1) return 'l1';
  if (count === 2) return 'l2';
  if (count <= 4) return 'l3';
  return 'l4';
}

export default function HomeSidebar({ posts, labs }: HomeSidebarProps) {
  const pulse = useMemo(
    () => weeklyActivity([...posts, ...labs].map((article) => parseChinaDateTime(article.createdAt)), PULSE_WEEKS),
    [posts, labs],
  );
  const total = pulse.reduce((sum, count) => sum + count, 0);

  return (
    <aside className="home-side">
      <section className="side-card about">
        <div className="about-top">
          <div className="about-avatar">
            <BrandMark variant="plain" size={34} />
          </div>
          <div>
            <b>{siteConfig.name}</b>
            <span>{siteConfig.role}</span>
          </div>
        </div>
        <p className="about-motto">
          “{siteConfig.motto[0]}
          <br />
          {siteConfig.motto[1]}”
        </p>
        <div className="about-links">
          <a className="chip" href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
          <Link className="chip chip-violet" to="/lab">
            实验室 {labs.length || ''}
          </Link>
        </div>
      </section>

      {labs.length > 0 && (
        <section className="side-card">
          <h4 className="side-title">
            <span>FROM THE LAB</span>
            <Link to="/lab" aria-label="查看全部实验">→</Link>
          </h4>
          {labs.slice(0, 3).map((lab) => (
            <Link key={lab.id} to={`/article/${lab.id}`} className="side-mini">
              <CoverImage src={getCoverImage(lab)} title={lab.title} seed={lab.id} className="side-mini-img" />
              <span>
                <b>{lab.title}</b>
                <small>{getArticleExcerpt(lab, 24)}</small>
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="side-card">
        <h4 className="side-title">
          <span>WRITING PULSE</span>
          <span>近一年 {total} 篇</span>
        </h4>
        <div className="pulse-grid" role="img" aria-label={`近一年共发布 ${total} 篇`}>
          {pulse.map((count, i) => (
            <i key={i} className={pulseLevel(count)} title={`${count} 篇`} />
          ))}
        </div>
        <div className="pulse-legend">
          <span>一年前</span>
          <span className="pulse-scale">
            少 <i /> <i className="l1" /> <i className="l2" /> <i className="l3" /> <i className="l4" /> 多
          </span>
          <span>本周</span>
        </div>
      </section>
    </aside>
  );
}
