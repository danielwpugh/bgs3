import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hashPassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const admin = await prisma.adminUser.findUnique({
      where: { id: session.id },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const isValid = await verifyPassword(currentPassword, admin.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.adminUser.update({
      where: { id: session.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

