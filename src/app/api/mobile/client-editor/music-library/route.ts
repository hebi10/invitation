import { NextResponse } from 'next/server';

import { INVITATION_MUSIC_LIBRARY } from '@/lib/musicLibrary';

export async function GET() {
  const categories = INVITATION_MUSIC_LIBRARY.map((category) => ({
    id: category.id,
    label: category.label,
    tracks: category.tracks.filter((track) => track.active).map((track) => ({
      id: track.id,
      categoryId: track.categoryId,
      title: track.title,
      artist: track.artist,
      storagePath: track.storagePath,
      active: track.active,
    })),
  })).filter((category) => category.tracks.length > 0);

  return NextResponse.json({ categories });
}
