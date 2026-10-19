/**
 * IMPOR MASSAL PDF PENETAPAN DARI GOOGLE DRIVE + AI CLAUDE HEMAT TOKEN
 *
 * Cara pasang (sekali saja, di proyek Apps Script "Dokumen Penyumpahan"):
 *   1. File → + → Skrip, beri nama  ImporMassal  lalu tempel SELURUH isi file ini, Simpan.
 *   2. Terapkan → Kelola deployment → Edit → Versi baru → Terapkan.
 *   3. Folder Drive sumber PDF harus bisa dibuka oleh akun pemilik proyek Apps Script ini
 *      (minimal akses Pelihat). Bila folder milik orang lain, minta dibagikan ke akun tersebut.
 *
 * Kunci API Claude TIDAK perlu diisi lagi: dipakai kunci yang sudah disimpan lewat
 * Pengaturan → AI Claude (dicari otomatis di Script Properties, nilai berawalan "sk-ant-").
 *
 * Kenapa hemat token:
 *   - PDF yang punya lapisan teks (umumnya salinan direktori putusan MA) TIDAK dikirim sebagai PDF;
 *     yang dikirim hanya teks bersihnya (watermark sudah dibuang di browser) → jauh lebih sedikit token
 *     dibanding PDF (teks + gambar tiap halaman).
 *   - Instruksi panjang (sama untuk semua berkas) ditaruh di "system" dengan cache_control, jadi
 *     berkas ke-2 dst. membaca instruksi dari cache (sekitar 5–10% harga normal).
 *   - Jawaban dipaksa sesuai skema JSON (structured outputs) → tidak ada JSON rusak, tidak perlu ulang.
 *   - PDF hasil scan (tanpa teks) dibaca langsung dari Drive oleh server, tidak bolak-balik lewat browser.
 */
const IMPOR_MODEL_DEFAULT = 'claude-opus-5-5';
const IMPOR_MODEL_BOLEH = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
const IMPOR_KUNCI_PROP = ''; // isi nama Script Property kunci Claude bila pencarian otomatis gagal
const IMPOR_POTONG_BYTE = 3 * 1024 * 1024; // PDF dikirim ke browser per 3 MB
const IMPOR_MAKS_BYTE_AI = 30 * 1024 * 1024; // batas ukuran PDF yang dikirim ke Claude

/* sesi: dicek sekali lewat apiInit lalu disimpan 30 menit (supaya tidak berat untuk ratusan file) */
function cekSesiImpor_(t) {
  const cache = CacheService.getScriptCache(), k = 'imporok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t || '')));
  if (cache.get(k)) return;
  apiInit(t); // melempar error SESI_HABIS bila token tidak berlaku
  cache.put(k, '1', 1800);
}

function idDrive_(s) {
  s = String(s || '').trim();
  const m = s.match(/(?:folders\/|[?&]id=|\/d\/)([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : s;
}

/** Daftar PDF/gambar di folder (beserta subfolder bila sub=true). */
function apiDaftarPdfDrive(t, folder, sub) {
  cekSesiImpor_(t);
  let root;
  try { root = DriveApp.getFolderById(idDrive_(folder)); }
  catch (e) { throw new Error('Folder Drive tidak bisa dibuka. Pastikan tautan benar dan folder dibagikan ke akun pemilik aplikasi (' + Session.getEffectiveUser().getEmail() + ').'); }
  const out = [], antre = [{ f: root, jalur: '' }];
  while (antre.length && out.length < 2000) {
    const x = antre.shift(), it = x.f.getFiles();
    while (it.hasNext()) {
      const f = it.next(), mime = f.getMimeType();
      if (mime !== 'application/pdf' && !/^image\/(png|jpe?g|webp)$/.test(mime)) continue;
      out.push({ id: f.getId(), nama: f.getName(), mime: mime, ukuran: f.getSize(), diubah: f.getLastUpdated().toISOString(), jalur: x.jalur, url: f.getUrl() });
    }
    if (sub) { const fs = x.f.getFolders(); while (fs.hasNext()) { const d = fs.next(); antre.push({ f: d, jalur: (x.jalur ? x.jalur + ' / ' : '') + d.getName() }); } }
  }
  out.sort(function (a, b) { return (a.jalur + a.nama).localeCompare(b.jalur + b.nama, 'id', { numeric: true }); });
  return { judul: root.getName(), url: root.getUrl(), file: out };
}

/** Isi file Drive (base64) per potongan 3 MB: {b64, total, lanjut} — lanjut=null bila sudah habis. */
function apiAmbilPdfDrive(t, id, mulai) {
  cekSesiImpor_(t);
  const f = DriveApp.getFileById(idDrive_(id)), b = f.getBlob().getBytes(), m = Number(mulai) || 0, s = Math.min(b.length, m + IMPOR_POTONG_BYTE);
  return { b64: Utilities.base64Encode(b.slice(m, s)), total: b.length, lanjut: s < b.length ? s : null, mime: f.getMimeType(), nama: f.getName() };
}

function kunciClaude_() {
  const p = PropertiesService.getScriptProperties();
  if (IMPOR_KUNCI_PROP && p.getProperty(IMPOR_KUNCI_PROP)) return p.getProperty(IMPOR_KUNCI_PROP);
  const semua = p.getProperties();
  for (const k in semua) if (/^sk-ant-/.test(String(semua[k]).trim())) return String(semua[k]).trim();
  throw new Error('KUNCI_AI_TIDAK_ADA: kunci Claude belum disimpan (Pengaturan → AI Claude).');
}

function panggilClaude_(o, konten) {
  const model = IMPOR_MODEL_BOLEH.indexOf(o.model) >= 0 ? o.model : IMPOR_MODEL_DEFAULT;
  const body = {
    model: model,
    max_tokens: Math.min(Number(o.maxTokens) || 16000, 32000),
    system: [{ type: 'text', text: String(o.system || ''), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: konten }],
    output_config: { effort: o.effort || 'low', format: { type: 'json_schema', schema: o.schema } }
  };
  const fallback = model !== 'claude-haiku-5-5';
  if (fallback) body.fallbacks = 'default';
  const kirim = function (pakaiFallback) {
    const h = { 'x-api-key': kunciClaude_(), 'anthropic-version': '2023-06-01' };
    const b = JSON.parse(JSON.stringify(body));
    if (pakaiFallback) h['anthropic-beta'] = 'server-side-fallback-2026-07-01'; else delete b.fallbacks;
    return UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', { method: 'post', contentType: 'application/json', headers: h, payload: JSON.stringify(b), muteHttpExceptions: true });
  };
  let res = kirim(fallback);
  if (fallback && res.getResponseCode() === 400 && /fallback/i.test(res.getContentText())) res = kirim(false);
  const kode = res.getResponseCode(), teks = res.getContentText();
  if (kode !== 200) {
    let pesan = teks;
    try { pesan = JSON.parse(teks).error.message; } catch (e) { }
    throw new Error('Claude ' + kode + ': ' + String(pesan).slice(0, 300));
  }
  const j = JSON.parse(teks);
  if (j.stop_reason === 'refusal') throw new Error('Claude menolak membaca dokumen ini.');
  if (j.stop_reason === 'max_tokens') throw new Error('Jawaban Claude terpotong (max_tokens).');
  const blok = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  return { data: JSON.parse(blok), usage: j.usage || {}, model: j.model || model };
}

/** Teks bersih (tanpa watermark) → JSON sesuai skema. o = {system, schema, model, effort, maxTokens} */
function apiClaudeTeks(t, o, teks) {
  cekSesiImpor_(t);
  return panggilClaude_(o, [{ type: 'text', text: '=== TRANSKRIP PENETAPAN (watermark sudah dibuang) ===\n' + String(teks || '') + '\n=== AKHIR TRANSKRIP ===' }]);
}

/** PDF/gambar scan langsung dari Drive (tanpa lewat browser) → JSON sesuai skema. */
function apiClaudeDrive(t, o, id) {
  cekSesiImpor_(t);
  const f = DriveApp.getFileById(idDrive_(id)), blob = f.getBlob(), mime = f.getMimeType();
  if (f.getSize() > IMPOR_MAKS_BYTE_AI) throw new Error('File terlalu besar untuk dibaca AI (' + Math.round(f.getSize() / 1048576) + ' MB).');
  const data = Utilities.base64Encode(blob.getBytes());
  const isi = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: data } }
    : { type: 'image', source: { type: 'base64', media_type: mime === 'image/jpg' ? 'image/jpeg' : mime, data: data } };
  return panggilClaude_(o, [isi, { type: 'text', text: 'Baca dokumen terlampir sesuai instruksi.' }]);
}
