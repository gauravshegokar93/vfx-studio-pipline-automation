type NamedArtist = {
  fullName?: string;
  FullName?: string;
  artistName?: string;
  assignedArtistName?: string;
};

const artistName = (artist: NamedArtist) =>
  (artist.fullName || artist.FullName || artist.artistName || artist.assignedArtistName || '').trim();

/** Search and sort a copy of the full list, leaving assignment data untouched. */
export function searchArtists<T extends NamedArtist>(artists: readonly T[], query = ''): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return [...artists]
    .sort((a, b) => artistName(a).localeCompare(artistName(b), 'en', { sensitivity: 'base' }))
    .filter(artist => artistName(artist).toLowerCase().includes(normalizedQuery));
}
