import { useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowUpRight } from 'react-icons/fi';
import { useArticles } from '../../hooks/useArticles';
import type { Article } from '../../services/article';
import { formatIndex, getArticleExcerpt, getCoverImage, readingMinutes } from '../../utils/articleText';
import { formatChinaDotDate } from '../../utils/dateUtils';
import CoverImage from '../Article/CoverImage';
import BlogHero from './BlogHero';
import HomeSidebar from './HomeSidebar';
import './Home.css';

function ArticleMeta({ article, index }: { article: Article; index?: number }) {
  return (
    <div className="post-meta">
      <span>{formatChinaDotDate(article.createdAt)}</span>
      <span className="sep" />
      <span>阅读 {readingMinutes(article.content)} 分钟</span>
      {index !== undefined && (
        <>
          <span className="sep" />
          <span>{formatIndex(index)}</span>
        </>
      )}
    </div>
  );
}

export default function BlogHome() {
  const blog = useArticles('blog');
  const lab = useArticles('lab');
  const postsRef = useRef<HTMLDivElement>(null);

  const scrollToPosts = useCallback(() => {
    postsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const [featured, ...rest] = blog.articles;

  return (
    <div className="blog-home">
      <BlogHero posts={blog.articles} labs={lab.articles} loading={blog.loading || lab.loading} onStartReading={scrollToPosts} />

      <div className="container" ref={postsRef} style={{ scrollMarginTop: 100 }}>
        {blog.loading ? (
          <div className="loading">LOADING</div>
        ) : blog.error ? (
          <div className="empty-state">文章加载失败，请稍后刷新重试</div>
        ) : !featured ? (
          <div className="empty-state">还没有文章，风还在路上</div>
        ) : (
          <>
            <div className="section-head">
              <div>
                <span className="eyebrow">latest · 最新</span>
                <h2>新鲜出炉</h2>
              </div>
              <span className="section-count">共 {blog.articles.length} 篇</span>
            </div>

            <Link to={`/article/${featured.id}`} className="featured">
              <div className="featured-img">
                <CoverImage src={getCoverImage(featured)} title={featured.title} seed={featured.id} eager />
                <span className="sticker">NEW · {formatChinaDotDate(featured.createdAt).slice(5)}</span>
              </div>
              <div className="featured-body">
                <ArticleMeta article={featured} index={1} />
                <h3>{featured.title}</h3>
                <p>{getArticleExcerpt(featured, 160)}</p>
                <div className="featured-foot">
                  <span>READ THE NOTE</span>
                  <span className="arrow-circle">
                    <FiArrowUpRight />
                  </span>
                </div>
              </div>
            </Link>

            <div className="home-grid">
              <div>
                {rest.length > 0 && (
                  <>
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">archive · 随笔</span>
                        <h2>慢慢写，慢慢读</h2>
                      </div>
                    </div>
                    <div className="post-rows">
                      {rest.map((article, i) => (
                        <Link
                          key={article.id}
                          to={`/article/${article.id}`}
                          className="post-row"
                          style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                        >
                          <span className="post-idx">{formatIndex(i + 2)}</span>
                          <div className="post-main">
                            <ArticleMeta article={article} />
                            <h3>{article.title}</h3>
                            <p>{getArticleExcerpt(article)}</p>
                          </div>
                          <CoverImage
                            src={getCoverImage(article)}
                            title={article.title}
                            seed={article.id}
                            className="post-thumb"
                          />
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <HomeSidebar posts={blog.articles} labs={lab.articles} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
