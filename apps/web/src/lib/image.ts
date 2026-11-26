import type { Bytes } from '@tnotes/shared';

export interface CompressedImage {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('图片压缩失败'));
      },
      mime,
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.82,
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持图片处理');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, 'image/webp', quality);
  if (blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  return { blob, mime: blob.type || 'image/jpeg', width, height };
}

export async function blobToUint8Array(blob: Blob): Promise<Bytes> {
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer) as Bytes;
}
