import { put, list, del } from '@vercel/blob';

const DB_FILENAME = 'movies.json';

async function getBlobUrl() {
  const { blobs } = await list({
    prefix: DB_FILENAME,
    limit: 10,
  });

  const exact = blobs.find((item) => item.pathname === DB_FILENAME);
  return exact?.url || null;
}

export async function readDb() {
  try {
    const url = await getBlobUrl();

    if (!url) {
      return {};
    }

    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return {};
    }

    return await res.json();
  } catch (error) {
    console.error('DB oqishda xatolik:', error);
    return {};
  }
}

export async function writeDb(data) {
  try {
    await put(DB_FILENAME, JSON.stringify(data, null, 2), {
      access: 'public',
      allowOverwrite: true,
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('DB yozishda xatolik:', error);
    throw error;
  }
}

export async function deleteDb() {
  try {
    const url = await getBlobUrl();
    if (!url) return;
    await del(url);
  } catch (error) {
    console.error('DB o‘chirishda xatolik:', error);
  }
}
