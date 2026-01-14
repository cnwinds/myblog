/**
 * 将数据库返回的日期时间字符串（假设为中国时区）转换为 Date 对象
 * @param dateString 日期时间字符串（格式：YYYY-MM-DD HH:MM:SS）
 * @returns Date 对象
 */
function parseChinaDateTime(dateString: string): Date {
  // 如果字符串已经包含时区信息，直接解析
  if (dateString.includes('+') || dateString.includes('Z') || dateString.includes('T')) {
    return new Date(dateString);
  }
  
  // 如果格式是 "YYYY-MM-DD HH:MM:SS"，假设它是中国时区（UTC+8）
  // 将其转换为 ISO 格式并添加时区信息
  const isoString = dateString.replace(' ', 'T') + '+08:00';
  return new Date(isoString);
}

/**
 * 格式化日期时间为中国时区（Asia/Shanghai）
 * @param dateString 日期时间字符串（格式：YYYY-MM-DD HH:MM:SS）
 * @returns 格式化后的日期时间字符串
 */
export function formatChinaDateTime(dateString: string): string {
  const date = parseChinaDateTime(dateString);
  
  // 使用中国时区格式化
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * 格式化日期为中国时区（仅日期，不含时间）
 * @param dateString 日期时间字符串
 * @param locale 语言环境，默认为 'en-US'
 * @returns 格式化后的日期字符串
 */
export function formatChinaDate(dateString: string, locale: string = 'en-US'): string {
  const date = parseChinaDateTime(dateString);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return date.toLocaleDateString(locale, options);
}
