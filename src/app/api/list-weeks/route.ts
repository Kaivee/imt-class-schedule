import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ 
      prefix: 'schedules/',
      token: process.env.BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_wOFkqq5uZ6RGczE7_QjpFfR5U6IREawZ4AOmszMeoGrL8QX"
    });
    // Sort by uploadedAt descending
    const sorted = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    return NextResponse.json({ success: true, blobs: sorted });
  } catch (error) {
    console.error('Error listing blobs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch weeks' }, { status: 500 });
  }
}
