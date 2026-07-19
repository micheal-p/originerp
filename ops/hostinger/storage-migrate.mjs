// Copies every object in every Supabase Storage bucket from the old project
// to the new self-hosted one. Plain fetch against the Storage REST API —
// no @supabase/supabase-js needed for a one-off ops script.
//
// Usage:
//   SOURCE_URL=https://xxxx.supabase.co SOURCE_SERVICE_KEY=... \
//   TARGET_URL=https://api.collarone.com TARGET_SERVICE_KEY=... \
//   node storage-migrate.mjs

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`set ${name}`);
  return v;
};

const SOURCE_URL = need('SOURCE_URL');
const SOURCE_KEY = need('SOURCE_SERVICE_KEY');
const TARGET_URL = need('TARGET_URL');
const TARGET_KEY = need('TARGET_SERVICE_KEY');

const authHeaders = (key) => ({ Authorization: `Bearer ${key}`, apikey: key });

const listBuckets = async () => {
  const r = await fetch(`${SOURCE_URL}/storage/v1/bucket`, { headers: authHeaders(SOURCE_KEY) });
  if (!r.ok) throw new Error(`list buckets failed: ${r.status} ${await r.text()}`);
  return r.json();
};

const ensureBucket = async (bucket) => {
  const r = await fetch(`${TARGET_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders(TARGET_KEY), 'content-type': 'application/json' },
    body: JSON.stringify({ id: bucket.id, name: bucket.name, public: bucket.public }),
  });
  // 409 = already exists, fine
  if (!r.ok && r.status !== 409) throw new Error(`create bucket ${bucket.id} failed: ${r.status} ${await r.text()}`);
};

// Storage's list endpoint is folder-scoped, not recursive — walk it depth-first.
const listAllObjects = async (bucketId, prefix = '') => {
  const r = await fetch(`${SOURCE_URL}/storage/v1/object/list/${bucketId}`, {
    method: 'POST',
    headers: { ...authHeaders(SOURCE_KEY), 'content-type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!r.ok) throw new Error(`list objects ${bucketId}/${prefix} failed: ${r.status} ${await r.text()}`);
  const entries = await r.json();
  let files = [];
  for (const e of entries) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id === null) {
      // folder — recurse
      files = files.concat(await listAllObjects(bucketId, path));
    } else {
      files.push(path);
    }
  }
  return files;
};

const copyObject = async (bucketId, path) => {
  const dl = await fetch(`${SOURCE_URL}/storage/v1/object/${bucketId}/${path}`, { headers: authHeaders(SOURCE_KEY) });
  if (!dl.ok) throw new Error(`download ${bucketId}/${path} failed: ${dl.status}`);
  const contentType = dl.headers.get('content-type') || 'application/octet-stream';
  const buf = Buffer.from(await dl.arrayBuffer());

  const up = await fetch(`${TARGET_URL}/storage/v1/object/${bucketId}/${path}`, {
    method: 'POST',
    headers: { ...authHeaders(TARGET_KEY), 'content-type': contentType, 'x-upsert': 'true' },
    body: buf,
  });
  if (!up.ok) throw new Error(`upload ${bucketId}/${path} failed: ${up.status} ${await up.text()}`);
};

const main = async () => {
  const buckets = await listBuckets();
  console.log(`Found ${buckets.length} bucket(s): ${buckets.map((b) => b.id).join(', ')}`);

  for (const bucket of buckets) {
    await ensureBucket(bucket);
    const files = await listAllObjects(bucket.id);
    console.log(`==> ${bucket.id}: ${files.length} object(s)`);
    let done = 0;
    for (const path of files) {
      await copyObject(bucket.id, path);
      done += 1;
      if (done % 25 === 0) console.log(`    ${done}/${files.length}`);
    }
    console.log(`    ${done}/${files.length} done`);
  }
  console.log('Storage migration complete.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
