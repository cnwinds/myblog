import db from '../utils/db';
import { getChinaDateTimeString } from '../utils/dateUtils';

export interface Setting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

export class SettingModel {
  static get(key: string): string | null {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return result ? result.value : null;
  }

  static set(key: string, value: string): void {
    const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key);
    const chinaTime = getChinaDateTimeString();
    
    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?').run(value, chinaTime, key);
    } else {
      db.prepare('INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(key, value, chinaTime);
    }
  }

  static getAll(): Setting[] {
    return db.prepare('SELECT * FROM settings').all() as Setting[];
  }
}
