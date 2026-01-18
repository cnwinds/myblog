import { useEffect, useState } from 'react';
import { statisticsService, StatisticsData } from '../../services/statistics';
import './Statistics.css';

export default function Statistics() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await statisticsService.getStatistics();
      setStatistics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载统计数据失败';
      setError(errorMessage);
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="statistics-loading">加载中...</div>;
  }

  if (error) {
    return <div className="statistics-error">{error}</div>;
  }

  if (!statistics) {
    return <div className="statistics-error">暂无数据</div>;
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h3>数据统计</h3>
        <button onClick={loadStatistics} className="btn btn-secondary refresh-btn">
          刷新
        </button>
      </div>

      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-label">总访问量</div>
          <div className="stat-value">{statistics.totalVisits.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">今日访问量</div>
          <div className="stat-value">{statistics.todayVisits.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">总用户数</div>
          <div className="stat-value">{statistics.totalUsers.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">总文章数</div>
          <div className="stat-value">{statistics.totalArticles.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">已发布文章</div>
          <div className="stat-value">{statistics.publishedArticles.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">草稿文章</div>
          <div className="stat-value">{(statistics.totalArticles - statistics.publishedArticles).toLocaleString()}</div>
        </div>
      </div>

      {statistics.visitsByDate.length > 0 && (
        <div className="statistics-chart">
          <h4>最近30天访问趋势</h4>
          <div className="chart-container">
            {statistics.visitsByDate.map((item, index) => {
              const maxCount = Math.max(...statistics.visitsByDate.map(d => d.count), 1);
              const height = (item.count / maxCount) * 100;
              return (
                <div key={index} className="chart-bar">
                  <div 
                    className="bar-fill" 
                    style={{ height: `${height}%` }}
                    title={`${item.date}: ${item.count}次访问`}
                  />
                  <div className="bar-label">{item.date.split('-')[2]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
