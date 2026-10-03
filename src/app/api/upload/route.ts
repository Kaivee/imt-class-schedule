import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// The simple password for the sister
const ADMIN_PASSWORD = "password123";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const weekName: string = data.get('weekName') as string;
    const password: string = data.get('password') as string;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Incorrect admin password' }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!weekName) {
      return NextResponse.json({ success: false, error: 'No week name provided' }, { status: 400 });
    }

    // Convert spaces to hyphens and make it clean
    const safeWeekName = weekName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    
    // Upload directly to Vercel Blob
    const blob = await put(`schedules/${safeWeekName}.pdf`, file, {
      access: 'public',
      addRandomSuffix: false // We overwrite if the same week name is uploaded!
    });
    
    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file to Vercel Blob' }, { status: 500 });
  }
}
