import db from '../utils/db';

export interface Provider {
  id: number;
  name: string;
  type: 'llm' | 'embedding' | 'both' | 'image';
  apiKey: string | null;
  apiBase: string | null;
  models: string; // JSON字符串，存储模型列表
  enabled: number; // 0或1
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderData {
  name: string;
  type: 'llm' | 'embedding' | 'both' | 'image';
  apiKey?: string;
  apiBase?: string;
  models: string[];
  enabled?: boolean;
}

export interface UpdateProviderData {
  name?: string;
  type?: 'llm' | 'embedding' | 'both' | 'image';
  apiKey?: string;
  apiBase?: string;
  models?: string[];
  enabled?: boolean;
}

export class ProviderModel {
  static findAll(): Provider[] {
    return db.prepare('SELECT * FROM providers ORDER BY createdAt DESC').all() as Provider[];
  }

  static findById(id: number): Provider | undefined {
    return db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as Provider | undefined;
  }

  static findByName(name: string): Provider | undefined {
    return db.prepare('SELECT * FROM providers WHERE name = ?').get(name) as Provider | undefined;
  }

  static create(data: CreateProviderData): Provider {
    const modelsJson = JSON.stringify(data.models);
    const enabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1;
    
    const result = db
      .prepare(
        'INSERT INTO providers (name, type, apiKey, apiBase, models, enabled) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        data.name,
        data.type,
        data.apiKey || null,
        data.apiBase || null,
        modelsJson,
        enabled
      );
    
    return this.findById(result.lastInsertRowid as number)!;
  }

  static update(id: number, data: UpdateProviderData): Provider | null {
    const provider = this.findById(id);
    if (!provider) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.apiKey !== undefined) {
      updates.push('apiKey = ?');
      values.push(data.apiKey || null);
    }
    if (data.apiBase !== undefined) {
      updates.push('apiBase = ?');
      values.push(data.apiBase || null);
    }
    if (data.models !== undefined) {
      updates.push('models = ?');
      values.push(JSON.stringify(data.models));
    }
    if (data.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(data.enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return provider;
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE providers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  }

  static delete(id: number): boolean {
    const provider = this.findById(id);
    if (!provider) {
      return false;
    }

    db.prepare('DELETE FROM providers WHERE id = ?').run(id);
    return true;
  }
}
