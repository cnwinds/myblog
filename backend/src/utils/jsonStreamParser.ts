/**
 * 增量JSON解析器
 * 用于从不完整的JSON流中提取已完成的数组项
 */
export class IncrementalJSONParser {
  private buffer: string = '';
  private inString: boolean = false;
  private escapeNext: boolean = false;
  private arrayStartIndex: number = -1;
  private completedItems: any[] = [];
  private processedIndex: number = 0; // 已处理的字符位置

  /**
   * 添加新的文本块并尝试解析已完成的项
   * @param chunk 新的文本块
   * @returns 已完成的JSON对象数组
   */
  addChunk(chunk: string): any[] {
    this.buffer += chunk;
    const newItems: any[] = [];

    // 查找数组开始位置
    if (this.arrayStartIndex === -1) {
      // 尝试找到数组开始，可能被markdown代码块包裹
      let arrayStart = this.buffer.indexOf('[');
      
      // 如果没找到，尝试查找json代码块
      if (arrayStart === -1) {
        const jsonBlockMatch = this.buffer.match(/```json\s*\[/);
        if (jsonBlockMatch) {
          arrayStart = this.buffer.indexOf('[', jsonBlockMatch.index || 0);
        } else {
          // 尝试查找普通的代码块
          const codeBlockMatch = this.buffer.match(/```\s*\[/);
          if (codeBlockMatch) {
            arrayStart = this.buffer.indexOf('[', codeBlockMatch.index || 0);
          }
        }
      }
      
      if (arrayStart !== -1) {
        this.arrayStartIndex = arrayStart;
        this.processedIndex = arrayStart + 1; // 跳过 '['
      } else {
        // 如果还没找到数组开始，继续等待
        return newItems;
      }
    }

    // 从上次处理的位置继续
    let i = this.processedIndex;
    let objectDepth = 0; // 对象嵌套深度
    let inObject = false; // 是否在对象中
    let objStart = -1; // 当前对象的开始位置

    while (i < this.buffer.length) {
      const char = this.buffer[i];

      // 处理转义字符
      if (this.escapeNext) {
        this.escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\' && this.inString) {
        this.escapeNext = true;
        i++;
        continue;
      }

      // 处理字符串
      if (char === '"') {
        this.inString = !this.inString;
        i++;
        continue;
      }

      // 只在非字符串状态下处理结构字符
      if (!this.inString) {
        if (char === '{') {
          if (!inObject) {
            // 新对象开始（在数组顶层）
            inObject = true;
            objectDepth = 1;
            objStart = i;
          } else {
            // 嵌套对象
            objectDepth++;
          }
          i++;
        } else if (char === '}') {
          if (inObject) {
            objectDepth--;
            if (objectDepth === 0) {
              // 对象完成
              const objStr = this.buffer.substring(objStart, i + 1);
              try {
                const obj = JSON.parse(objStr);
                // 检查这个对象是否已经解析过
                if (!this.isDuplicate(obj)) {
                  this.completedItems.push(obj);
                  newItems.push(obj);
                }
                // 重置状态，准备下一个对象
                inObject = false;
                objStart = -1;
                this.processedIndex = i + 1;
              } catch (e) {
                // JSON可能不完整，继续等待
                // 但这种情况理论上不应该发生，因为我们已经匹配了完整的 {}
              }
            }
          }
          i++;
        } else if (char === '[') {
          // 嵌套数组，增加深度（但在这个场景中我们主要关心顶层数组的对象）
          if (inObject) {
            objectDepth++;
          }
          i++;
        } else if (char === ']') {
          // 数组结束
          if (!inObject) {
            this.processedIndex = i + 1;
            break;
          } else {
            objectDepth--;
            i++;
          }
        } else if (char === ',' && !inObject) {
          // 对象之间的分隔符，跳过空白
          i++;
          // 跳过可能的空白字符
          while (i < this.buffer.length && /\s/.test(this.buffer[i])) {
            i++;
          }
          this.processedIndex = i;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }

    return newItems;
  }

  /**
   * 检查对象是否已经解析过（通过index字段）
   */
  private isDuplicate(obj: any): boolean {
    if (typeof obj.index === 'number') {
      return this.completedItems.some(item => item.index === obj.index);
    }
    return false;
  }

  /**
   * 获取所有已完成的项
   */
  getCompletedItems(): any[] {
    return [...this.completedItems];
  }

  /**
   * 重置解析器
   */
  reset(): void {
    this.buffer = '';
    this.inString = false;
    this.escapeNext = false;
    this.arrayStartIndex = -1;
    this.completedItems = [];
    this.processedIndex = 0;
  }

  /**
   * 尝试解析完整的JSON（用于最终解析）
   */
  tryParseFinal(): any[] | null {
    try {
      // 尝试从buffer中提取JSON数组
      const jsonMatch = this.buffer.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (e) {
      // 如果解析失败，返回已完成的项
      return this.completedItems.length > 0 ? this.completedItems : null;
    }
  }
}
