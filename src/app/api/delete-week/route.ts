import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';

const ADMIN_PASSWORD = "imtg#05";

export async function POST(request: Request) {
  try {
    const { url, password } = await request.json();

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Incorrect admin password' }, { status: 403 });
    }

    if (!url) {
      return NextResponse.json({ success: false, error: 'No URL provided' }, { status: 400 });
    }

    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_wOFkqq5uZ6RGczE7_QjpFfR5U6IREawZ4AOmszMeoGrL8QX"
    });
    
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting blob:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
  }
}
