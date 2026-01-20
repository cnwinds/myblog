import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { createApiError, handleError } from '../utils/errorHandler';

// 确保在运行时读取环境变量
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'your-secret-key';
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw createApiError('Username and password are required', 400);
    }

    const user = await UserModel.verifyPassword(username, password);
    if (!user) {
      throw createApiError('Invalid credentials', 401);
    }

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
    handleError(res, error, '登录失败');
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw createApiError('Username and password are required', 400);
    }

    if (password.length < 6) {
      throw createApiError('Password must be at least 6 characters', 400);
    }

    const existingUser = UserModel.findByUsername(username);
    if (existingUser) {
      throw createApiError('Username already exists', 409);
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
    handleError(res, error, '注册失败');
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw createApiError('旧密码和新密码都是必填项', 400);
    }

    if (newPassword.length < 6) {
      throw createApiError('新密码长度至少为6个字符', 400);
    }

    if (!req.userId) {
      throw createApiError('未授权', 401);
    }

    const user = UserModel.findById(req.userId);
    if (!user) {
      throw createApiError('用户不存在', 404);
    }

    // 验证旧密码
    const isValid = await UserModel.verifyPassword(user.username, oldPassword);
    if (!isValid) {
      throw createApiError('旧密码不正确', 401);
    }

    // 更新密码
    const success = await UserModel.updatePassword(req.userId, newPassword);
    if (!success) {
      throw createApiError('密码更新失败', 500);
    }

    res.json({ message: '密码修改成功' });
  } catch (error) {
    handleError(res, error, '内部服务器错误');
  }
}
