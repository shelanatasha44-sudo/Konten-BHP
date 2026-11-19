CREATE TABLE IF NOT EXISTS acara (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  dibuat TEXT NOT NULL,
  diubah TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS peserta (
  acara TEXT NOT NULL,
  pk TEXT NOT NULL,
  urut INTEGER NOT NULL,
  nomor TEXT NOT NULL,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  email TEXT,
  instansi TEXT,
  peran TEXT,
  status TEXT NOT NULL DEFAULT 'sah',
  sumber TEXT,
  waktu TEXT NOT NULL,
  PRIMARY KEY (acara, pk),
  UNIQUE (acara, urut)
);
CREATE INDEX IF NOT EXISTS idx_peserta_urut ON peserta (acara, urut);
