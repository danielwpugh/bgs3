import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

import { jwtSecret } from '@/lib/secret';

export interface AdminSession {
  id: number;
  username: string;
}

export function createToken(session: AdminSession): string {
  return jwt.sign(session, jwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AdminSession | null {
  try {
    return jwt.verify(token, jwtSecret()) as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get('admin-token')?.value;
  if (!token) return null;
  
  const session = verifyToken(token);
  if (!session) return null;

  // Verify user still exists
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.id },
  });

  return admin ? session : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

