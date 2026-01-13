import db from '../utils/db';
import { hashPassword, comparePassword } from '../utils/password';

export interface User {
  id: number;
  username: string;
  password: string;
  createdAt: string;
}

export interface CreateUserData {
  username: string;
  password: string;
}

export class UserModel {
  static findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  }

  static findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  static async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await hashPassword(data.password);
    const result = db
      .prepare('INSERT INTO users (username, password) VALUES (?, ?)')
      .run(data.username, hashedPassword);
    
    return this.findById(result.lastInsertRowid as number)!;
  }

  static async verifyPassword(
    username: string,
    password: string
  ): Promise<User | null> {
    const user = this.findByUsername(username);
    if (!user) {
      console.log('[verifyPassword] 用户不存在:', username);
      return null;
    }

    try {
      const isValid = await comparePassword(password, user.password);
      console.log('[verifyPassword] 密码验证结果:', isValid, {
        username,
        passwordHashPrefix: user.password.substring(0, 20),
        passwordLength: password.length
      });
      return isValid ? user : null;
    } catch (error) {
      console.error('[verifyPassword] 密码验证出错:', error);
      return null;
    }
  }

  static async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await hashPassword(newPassword);
    const result = db
      .prepare('UPDATE users SET password = ? WHERE id = ?')
      .run(hashedPassword, userId);
    
    return result.changes > 0;
  }
}
