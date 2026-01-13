import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { comparePassword } from '../utils/password';

// 确保在运行时读取环境变量
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'your-secret-key';
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 添加调试日志
    console.log('[Login] 尝试登录:', { username, passwordLength: password.length });
    
    const user = await UserModel.verifyPassword(username, password);
    
    if (!user) {
      console.log('[Login] 验证失败 - 用户不存在或密码错误');
      // 检查用户是否存在
      const userExists = UserModel.findByUsername(username);
      console.log('[Login] 用户是否存在:', !!userExists);
      if (userExists) {
        console.log('[Login] 用户密码哈希前缀:', userExists.password.substring(0, 20));
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('[Login] 验证成功:', { userId: user.id, username: user.username });

    const token = jwt.sign({ userId: user.id, username: user.username }, getJwtSecret(), {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = UserModel.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = await UserModel.create({ username, password });
    const token = jwt.sign({ userId: user.id, username: user.username }, getJwtSecret(), {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码都是必填项' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6个字符' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const user = UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证旧密码
    const isValid = await comparePassword(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '旧密码不正确' });
    }

    // 更新密码
    const success = await UserModel.updatePassword(req.userId, newPassword);
    if (!success) {
      return res.status(500).json({ error: '密码更新失败' });
    }

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '内部服务器错误' });
  }
}
