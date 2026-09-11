import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
export async function GET(_request: NextRequest, {params}:{params:Promise<{path:string[]}>}) {
  const root = resolve('uploads');
  const file = resolve(root,...(await params).path);
  const types: Record<string,string> = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
  if (!file.startsWith(root+sep) || !types[extname(file).toLowerCase()]) return new NextResponse(null,{status:404});
  try {return new NextResponse(await readFile(file),{headers:{'Content-Type':types[extname(file).toLowerCase()],'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});}
  catch {return new NextResponse(null,{status:404});}
}
