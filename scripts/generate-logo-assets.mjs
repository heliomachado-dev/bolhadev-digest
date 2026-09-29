#!/usr/bin/env node
/**
 * Gera os ativos de marca a partir da logo original (JPEG/JFIF, fundo branco).
 *
 *   node scripts/generate-logo-assets.mjs [caminho-da-logo]
 *
 * Saídas:
 *   public/logo-emblem.png        # só o emblema circular (quadrado) -> site/favicon/PWA/avatar
 *   public/logo.png               # logo inteira aparada            -> README
 *   src/app/favicon.ico           # 16/32/48/64 px
 *   public/icon-192.png           # PWA
 *   public/icon-512.png           # PWA
 *   public/icon-maskable-512.png  # PWA (zona segura)
 *   src/app/apple-icon.png        # iOS (180 px)
 *   docs/github-avatar.png        # 1024x1024 (upload manual)
 *   docs/github-social-preview.png # 1280x640 (upload manual)
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC =
  process.argv[2] ||
  'D:/Dados/Documents/projetos/Gemini_Generated_Image_xbpgmhxbpgmhxbpg.jfif';

const WHITE = '#ffffff';
const TH = 242; // abaixo disso = conteúdo (o brilho fraco vira fundo)

async function main() {
  const { data, info } = await sharp(SRC)
    .flatten({ background: WHITE })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H, channels: C } = info;
  const at = (x, y) => {
    const o = (y * W + x) * C;
    return data[o] < TH || data[o + 1] < TH || data[o + 2] < TH;
  };

  // Perfil de linhas -> grupos. Limiar estrito (210) ignora o glow fraco, que
  // caso contrário "costura" o emblema ao texto e estraga o recorte.
  const ST = 210;
  const strongAt = (x, y) => {
    const o = (y * W + x) * C;
    return data[o] < ST || data[o + 1] < ST || data[o + 2] < ST;
  };
  const rowHas = new Uint8Array(H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (strongAt(x, y)) {
        rowHas[y] = 1;
        break;
      }
    }
  }

  const groups = [];
  let start = -1;
  let gap = 0;
  for (let y = 0; y < H; y++) {
    if (rowHas[y]) {
      if (start < 0) start = y;
      gap = 0;
    } else if (start >= 0 && ++gap > 6) {
      groups.push([start, y - gap]);
      start = -1;
    }
  }
  if (start >= 0) groups.push([start, H - 1]);
  if (groups.length === 0) throw new Error('Nenhum conteúdo encontrado na imagem.');

  const [r0, r1] = groups[0]; // primeiro grupo = emblema
  const textTop = groups.length > 1 ? groups[1][0] : H;

  // Bounding box do emblema (limiar solto pega o glow, mas restrito às linhas
  // do emblema — o texto nunca entra)
  let c0 = W - 1;
  let c1 = 0;
  for (let y = r0; y <= r1; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y)) {
        if (x < c0) c0 = x;
        if (x > c1) c1 = x;
      }
    }
  }

  // Crop quadrado: folga embaixo pequena, o excesso vai para cima (há muito
  // branco acima e o texto logo abaixo limita a altura)
  const bw = c1 - c0 + 1;
  const bh = r1 - r0 + 1;
  const side = Math.max(bw, bh);
  let bottom = Math.min(10, side - bh);
  if (bottom < 0) bottom = 0;
  let top = side - bh - bottom;
  let cropTop = r0 - top;
  const maxBottom = textTop - 4;
  if (r1 + bottom > maxBottom) cropTop -= r1 + bottom - maxBottom;
  cropTop = Math.max(0, cropTop);
  const cropLeft = Math.max(0, Math.min(Math.round((c0 + c1) / 2 - side / 2), W - side));
  const size = side;

  const emblem = sharp(SRC)
    .flatten({ background: WHITE })
    .extract({ left: cropLeft, top: cropTop, width: size, height: size });

  // Logo inteira aparada (com folga)
  let fx0 = W - 1;
  let fx1 = 0;
  let fy0 = H - 1;
  let fy1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y)) {
        if (x < fx0) fx0 = x;
        if (x > fx1) fx1 = x;
        if (y < fy0) fy0 = y;
        if (y > fy1) fy1 = y;
      }
    }
  }
  const fpad = 24;
  const fLeft = Math.max(0, fx0 - fpad);
  const fTop = Math.max(0, fy0 - fpad);
  const fWidth = Math.min(W - fLeft, fx1 - fx0 + 1 + fpad * 2);
  const fHeight = Math.min(H - fTop, fy1 - fy0 + 1 + fpad * 2);
  const full = sharp(SRC)
    .flatten({ background: WHITE })
    .extract({ left: fLeft, top: fTop, width: fWidth, height: fHeight });

  const out = (p) => path.join(ROOT, p);

  // ---------- ativos ----------
  await mkdir(path.join(ROOT, 'public'), { recursive: true });
  await mkdir(path.join(ROOT, 'docs'), { recursive: true });
  await mkdir(path.join(ROOT, 'src', 'app'), { recursive: true });

  await emblem.clone().resize(512, 512).png().toFile(out('public/logo-emblem.png'));
  await full.clone().png().toFile(out('public/logo.png'));

  // favicon.ico (entradas PNG, aceitas por navegadores e pelo Windows)
  const sizes = [16, 32, 48, 64];
  const pngs = [];
  for (const size of sizes) {
    const buf = await emblem.clone().resize(size, size).ensureAlpha().png().toBuffer();
    pngs.push({ size, buf });
  }
  await writeFile(out('src/app/favicon.ico'), buildIco(pngs));

  // PWA / iOS
  await emblem.clone().resize(192, 192).png().toFile(out('public/icon-192.png'));
  await emblem.clone().resize(512, 512).png().toFile(out('public/icon-512.png'));
  await emblem
    .clone()
    .resize(320, 320) // 62,5% do canvas -> zona segura do maskable
    .extend({
      top: 96,
      bottom: 96,
      left: 96,
      right: 96,
      background: WHITE,
    })
    .png()
    .toFile(out('public/icon-maskable-512.png'));
  await emblem.clone().resize(180, 180).png().toFile(out('src/app/apple-icon.png'));

  // GitHub
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: WHITE } })
    .composite([{ input: await emblem.clone().resize(860, 860).png().toBuffer(), gravity: 'centre' }])
    .png()
    .toFile(out('docs/github-avatar.png'));

  const logoWide = await full
    .clone()
    .resize({ width: 1180, height: 580, fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1280, height: 640, channels: 3, background: WHITE } })
    .composite([{ input: logoWide, gravity: 'centre' }])
    .png()
    .toFile(out('docs/github-social-preview.png'));

  console.log(
    [
      `fonte: ${SRC} (${W}x${H})`,
      `emblema: crop ${size}px em (${cropLeft},${cropTop})  [linhas ${r0}-${r1}, colunas ${c0}-${c1}]`,
      `logo inteira: ${fWidth}x${fHeight}`,
      'gerados:',
      '  public/logo-emblem.png · public/logo.png',
      '  src/app/favicon.ico (16/32/48/64) · src/app/apple-icon.png (180)',
      '  public/icon-192.png · public/icon-512.png · public/icon-maskable-512.png',
      '  docs/github-avatar.png (1024) · docs/github-social-preview.png (1280x640)',
    ].join('\n')
  );
}

/** Monta um .ico com entradas PNG (16/32/48/64). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(entries.length, 4);

  const dirEntries = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, buf } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dirEntries.push(e);
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.buf)]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
