import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
  userId?: number;
}

function getAgentApiKey(): string | undefined {
  const key = process.env.AGENT_API_KEY;
  if (typeof key !== 'string' || key.length === 0) {
    return undefined;
  }
  return key;
}

function headerToString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractBearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined;
  }
  const parts = authorization.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0]) && parts[1]) {
    return parts[1];
  }
  return undefined;
}

/**
 * Agent 请求归属站点所有者：users 表中 id 最小的用户
 *（通常即启动时创建的 admin，id 多为 1）。
 */
export function getSiteOwnerUserId(): number | undefined {
  return UserModel.findFirst()?.id;
}

function authenticateWithAgentKey(req: AuthRequest): 'ok' | 'bad-key' | 'no-owner' | 'skip' {
  const agentKey = getAgentApiKey();
  if (!agentKey) {
    return 'skip';
  }

  const headerKey = headerToString(req.headers['x-agent-key']);
  const bearer = extractBearerToken(headerToString(req.headers.authorization));
  const headerMatches = Boolean(headerKey && timingSafeEqualString(headerKey, agentKey));
  const bearerMatches = Boolean(bearer && timingSafeEqualString(bearer, agentKey));

  if (!headerMatches && !bearerMatches) {
    // 明确传了 X-Agent-Key 但值不对：不要再走 JWT
    if (headerKey) {
      return 'bad-key';
    }
    return 'skip';
  }

  const ownerId = getSiteOwnerUserId();
  if (!ownerId) {
    return 'no-owner';
  }

  req.userId = ownerId;
  return 'ok';
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const agentResult = authenticateWithAgentKey(req);
  if (agentResult === 'ok') {
    return next();
  }
  if (agentResult === 'no-owner') {
    return res.status(503).json({ error: 'Site owner account is not initialized' });
  }
  if (agentResult === 'bad-key') {
    return res.status(401).json({ error: 'Invalid agent key' });
  }

  const token = extractBearerToken(headerToString(req.headers.authorization));

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';

  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET not set in environment, using default');
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = (decoded as { userId: number }).userId;
    next();
  });
}
