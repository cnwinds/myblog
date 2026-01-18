import api from './api';

export interface StatisticsData {
  totalVisits: number;
  todayVisits: number;
  totalUsers: number;
  totalArticles: number;
  publishedArticles: number;
  visitsByDate: Array<{ date: string; count: number }>;
}

export const statisticsService = {
  getStatistics: async (): Promise<StatisticsData> => {
    const response = await api.get<StatisticsData>('/statistics');
    return response.data;
  },
};
