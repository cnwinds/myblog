import path from 'path';

/**
 * 获取当前日期所在的年份和周数（ISO 8601 标准）
 * @returns { year: number, week: number, weekStr: string }
 */
export function getYearAndWeek(): { year: number; week: number; weekStr: string } {
  const now = new Date();
  
  // 获取ISO周数
  const date = new Date(now.getTime());
  date.setHours(0, 0, 0, 0);
  
  // ISO 8601: 周从周一开始，第一周是包含1月4日的那一周
  const dayOfWeek = date.getDay() || 7; // 0=周日改为7
  date.setDate(date.getDate() + 4 - dayOfWeek); // 调整到周四
  
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((days + 1) / 7);
  
  // 格式化为两位数字符串，如 "01", "02", "52"
  const weekStr = week.toString().padStart(2, '0');
  
  return { year, week, weekStr };
}

/**
 * 获取年/周目录路径（一级目录，格式：202601）
 * @param baseDir 基础目录
 * @returns 完整的目录路径，如 "uploads/202601"
 */
export function getYearWeekDir(baseDir: string): string {
  const { year, weekStr } = getYearAndWeek();
  return path.join(baseDir, `${year}${weekStr}`);
}
