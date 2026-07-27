import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_ROOT = 'https://api.openstreetcam.org';
const OUTPUT_ROOT = path.resolve('generated');
const IMAGE_ROOT = path.join(OUTPUT_ROOT, 'street');
const TARGET_ROUNDS = 8;
const PHOTOS_PER_ROUND = 6;

const seeds = [
  ['New York', 40.7580, -73.9855],
  ['Seattle', 47.6097, -122.3331],
  ['San Francisco', 37.7749, -122.4194],
  ['Toronto', 43.6532, -79.3832],
  ['Mexico City', 19.4326, -99.1332],
  ['São Paulo', -23.5505, -46.6333],
  ['Buenos Aires', -34.6037, -58.3816],
  ['London', 51.5074, -0.1278],
  ['Paris', 48.8566, 2.3522],
  ['Berlin', 52.5200, 13.4050],
  ['Amsterdam', 52.3676, 4.9041],
  ['Rome', 41.9028, 12.4964],
  ['Stockholm', 59.3293, 18.0686],
  ['Helsinki', 60.1699, 24.9384],
  ['Lisbon', 38.7223, -9.1393],
  ['Athens', 37.9838, 23.7275],
  ['Cape Town', -33.9249, 18.4241],
  ['Johannesburg', -26.2041, 28.0473],
  ['Dubai', 25.2048, 55.2708],
  ['Tel Aviv', 32.0853, 34.7818],
  ['Jakarta', -6.1939, 106.8494],
  ['Singapore', 1.3521, 103.8198],
  ['Tokyo', 35.6762, 139.6503],
  ['Seoul', 37.5665, 126.9780],
  ['Sydney', -33.8688, 151.2093],
  ['Melbourne', -37.8136, 144.9631]
];

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'application/json,image/avif,image/webp,image/*,*/*;q=0.8',
          'User-Agent': 'GeoScope-GitHub-Pages/1.0'
        },
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

function imageUrl(photo) {
  let value = photo.fileurlProc || photo.fileurl || photo.fileUrl || photo.fileurlLTh || photo.filepath || photo.filePath;
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `${API_ROOT}${value.startsWith('/') ? '' : '/'}${value}`;
  return value;
}

function extension(contentType) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('avif')) return 'avif';
  return 'jpg';
}

async function downloadPhoto(photo, roundIndex, photoIndex) {
  const remoteUrl = imageUrl(photo);
  if (!remoteUrl) return null;

  const response = await request(remoteUrl, 2);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`Unexpected image response: ${contentType}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 12000) throw new Error('Image payload is too small');

  const filename = `round-${roundIndex + 1}-${photoIndex + 1}.${extension(contentType)}`;
  await writeFile(path.join(IMAGE_ROOT, filename), bytes);

  const lat = Number(photo.lat);
  const lng = Number(photo.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: Number(photo.id) || 0,
    url: `generated/street/${filename}`,
    lat,
    lng,
    heading: Number(photo.heading) || 0
  };
}

async function nearbySequence(name, lat, lng, roundIndex) {
  const url = new URL('/2.0/photo/', API_ROOT);
  url.search = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: '5000',
    zoomLevel: '15',
    join: 'sequence',
    orderBy: 'id',
    orderDirection: 'desc',
    itemsPerPage: '100'
  }).toString();

  const response = await request(url);
  const payload = await response.json();
  const records = Array.isArray(payload?.result?.data) ? payload.result.data : [];

  const groups = new Map();
  for (const photo of records) {
    const sequenceId = String(photo?.sequence?.id || photo?.sequenceId || '');
    if (!sequenceId || !imageUrl(photo)) continue;
    if (!groups.has(sequenceId)) groups.set(sequenceId, []);
    groups.get(sequenceId).push(photo);
  }

  const candidates = [...groups.values()]
    .filter(group => group.length >= 3)
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates.slice(0, 6)) {
    candidate.sort((a, b) => Number(a.id) - Number(b.id));
    const middle = Math.floor(candidate.length / 2);
    const start = Math.max(0, Math.min(candidate.length - PHOTOS_PER_ROUND, middle - Math.floor(PHOTOS_PER_ROUND / 2)));
    const selected = candidate.slice(start, start + PHOTOS_PER_ROUND);
    const photos = [];

    for (let index = 0; index < selected.length; index += 1) {
      try {
        const downloaded = await downloadPhoto(selected[index], roundIndex, photos.length);
        if (downloaded) photos.push(downloaded);
      } catch (error) {
        console.warn(`[${name}] skipped image: ${error.message}`);
      }
    }

    if (photos.length >= 3) {
      return {
        source: 'KartaView',
        area: name,
        photos,
        start: Math.floor(photos.length / 2)
      };
    }
  }

  return null;
}

await rm(OUTPUT_ROOT, { recursive: true, force: true });
await mkdir(IMAGE_ROOT, { recursive: true });

const rounds = [];
for (const [name, lat, lng] of shuffle(seeds)) {
  if (rounds.length >= TARGET_ROUNDS) break;
  try {
    console.log(`Searching KartaView imagery near ${name}…`);
    const round = await nearbySequence(name, lat, lng, rounds.length);
    if (round) {
      rounds.push(round);
      console.log(`Added ${name}: ${round.photos.length} images.`);
    }
  } catch (error) {
    console.warn(`[${name}] ${error.message}`);
  }
}

if (rounds.length < 5) {
  throw new Error(`Only ${rounds.length} playable KartaView rounds were generated; at least 5 are required.`);
}

await writeFile(
  path.join(OUTPUT_ROOT, 'rounds.json'),
  JSON.stringify({
    provider: 'KartaView',
    generatedAt: new Date().toISOString(),
    rounds
  }, null, 2)
);

console.log(`Generated ${rounds.length} real street-imagery rounds.`);
