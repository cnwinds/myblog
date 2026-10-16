import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import type { Article } from '../../services/article';
import { siteConfig } from '../../config/site';
import { formatChinaDotDate, parseChinaDateTime } from '../../utils/dateUtils';
import WindField from './WindField';

interface BlogHeroProps {
  posts: Article[];
  labs: Article[];
  loading: boolean;
  onStartReading: () => void;
}

const CHIP_SLOTS = [
  { style: { left: '7%', top: '17%' }, color: '#ff8a66' },
  { style: { right: '6%', top: '27%' }, color: '#5fe0bb' },
  { style: { left: '26%', top: '41%' }, color: '#ffc23d' },
];

function latestDate(articles: Article[]): string | null {
  let latest: Article | null = null;
  for (const article of articles) {
    if (!latest || parseChinaDateTime(article.createdAt) > parseChinaDateTime(latest.createdAt)) {
      latest = article;
    }
  }
  return latest ? formatChinaDotDate(latest.createdAt).slice(5) : null;
}

export default function BlogHero({ posts, labs, loading, onStartReading }: BlogHeroProps) {
  const playable = labs.filter((lab) => lab.demoUrl).length;
  const stats = [
    { value: posts.length, label: 'POSTS' },
    { value: labs.length, label: 'EXPERIMENTS' },
    { value: playable, label: 'PLAYABLE' },
    { value: latestDate([...posts, ...labs]) ?? '—', label: 'LAST UPDATE' },
  ];
  const latestPost = posts[0];
  const latestLab = labs[0];

  return (
    <section className="hero container">
      <div className="hero-copy">
        <span className="eyebrow">{siteConfig.heroEyebrow}</span>
        <h1 className="hero-title">
          风吹过的地方，
          <br />
          留下
          <span className="wind-underline">
            代码
            <svg viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
              <path d="M3 10 C 50 3, 90 14, 140 8 S 210 4, 237 9" />
            </svg>
          </span>
          与<span className="latin hero-accent">生活</span>。
        </h1>
        <p className="hero-lead">{siteConfig.heroLead}</p>
        <div className="hero-cta">
          <button type="button" className="btn btn-ink" onClick={onStartReading}>
            开始阅读 <FiArrowRight />
          </button>
          <Link to="/lab" className="btn btn-ghost">
            逛逛实验室 ↗
          </Link>
        </div>
        <dl className="hero-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="hero-stat">
              <dt>{stat.label}</dt>
              <dd className="latin">{loading ? '—' : stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="art-panel" aria-hidden="true">
        <span className="art-aurora art-aurora-1" />
        <span className="art-aurora art-aurora-2" />
        <span className="art-aurora art-aurora-3" />
        <WindField className="art-flow" />
        <span className="art-label">FIG.01 — WIND FIELD</span>
        <span className="art-coord">31.23°N 121.47°E</span>
        {labs.slice(0, CHIP_SLOTS.length).map((lab, i) => (
          <Link key={lab.id} to={`/article/${lab.id}`} className="art-chip" style={CHIP_SLOTS[i].style} tabIndex={-1}>
            <i style={{ background: CHIP_SLOTS[i].color }} />
            {lab.title}
          </Link>
        ))}
        <div className="art-term">
          <div className="art-term-bar">
            <span style={{ background: '#ff5f57' }} />
            <span style={{ background: '#febc2e' }} />
            <span style={{ background: '#28c840' }} />
            <em>~/{siteConfig.name} — zsh</em>
          </div>
          <div>
            <span className="t-prompt">❯</span> {siteConfig.name} <span className="t-flag">--status</span>
          </div>
          {latestPost && (
            <div className="t-line">
              <span className="t-dim">writing </span> {latestPost.title}
            </div>
          )}
          {latestLab && (
            <div className="t-line">
              <span className="t-dim">building</span> {latestLab.title} <span className="t-ok">● shipped</span>
            </div>
          )}
          <div>
            <span className="t-prompt">❯</span> <span className="t-caret" />
          </div>
        </div>
      </div>
    </section>
  );
}
