/**
 * JSON 解析工具函数
 * 用于从可能包含 markdown 代码块的文本中提取 JSON
 */

/**
 * 从文本中提取并解析 JSON 对象或数组
 * 支持从 markdown 代码块中提取 JSON
 */
export function parseJSONFromText(text: string): any {
  const trimmed = text.trim();
  
  // 尝试直接解析
  try {
    return JSON.parse(trimmed);
  } catch {
    // 如果失败，尝试提取 JSON 对象或数组
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    
    const jsonMatch = arrayMatch || objectMatch;
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('无法解析 JSON 格式');
      }
    }
    
    throw new Error('未找到有效的 JSON 内容');
  }
}
