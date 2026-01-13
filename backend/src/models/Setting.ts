import db from '../utils/db';

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
    
    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }

  static getAll(): Setting[] {
    return db.prepare('SELECT * FROM settings').all() as Setting[];
  }
}
