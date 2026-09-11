import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize and optimize with sharp
    const optimized = await sharp(buffer)
      .resize(600, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Generate unique filename
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    const uploadDir = join(process.cwd(), 'uploads', 'players');
    
    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, optimized);

    // Return public URL
    const imageUrl = `/uploads/players/${filename}`;
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

