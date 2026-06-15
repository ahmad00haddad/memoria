// Browser-only watermarking utility using Canvas API.
// Adds a semi-transparent diagonal text watermark across an image.

export type WatermarkOptions = {
  text: string;
  opacity?: number; // 0..1
  // 'tile' = repeated diagonal pattern across image; 'corner' = bottom-right only
  mode?: "tile" | "corner";
  // Max output dimension (keeps long edge). 0 = keep original.
  maxDimension?: number;
  quality?: number; // 0..1 jpeg quality
};

export async function watermarkImageFile(file: File, opts: WatermarkOptions): Promise<File> {
  const { text, opacity = 0.22, mode = "tile", maxDimension = 2400, quality = 0.9 } = opts;
  if (!text) return file;

  const bitmap = await loadBitmap(file);
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  let outW = srcW;
  let outH = srcH;
  if (maxDimension > 0 && Math.max(srcW, srcH) > maxDimension) {
    const scale = maxDimension / Math.max(srcW, srcH);
    outW = Math.round(srcW * scale);
    outH = Math.round(srcH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, outW, outH);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.45)";

  if (mode === "corner") {
    const fontSize = Math.max(18, Math.round(Math.min(outW, outH) * 0.04));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "right";
    const pad = Math.round(fontSize * 0.8);
    ctx.lineWidth = Math.max(2, Math.round(fontSize / 12));
    ctx.strokeText(text, outW - pad, outH - pad);
    ctx.fillText(text, outW - pad, outH - pad);
  } else {
    const fontSize = Math.max(20, Math.round(Math.min(outW, outH) * 0.05));
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.lineWidth = Math.max(2, Math.round(fontSize / 14));
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate(-Math.PI / 6);
    const stepX = Math.round(fontSize * 10);
    const stepY = Math.round(fontSize * 5);
    const reach = Math.max(outW, outH);
    for (let y = -reach; y < reach; y += stepY) {
      for (let x = -reach; x < reach; x += stepX) {
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }
    }
  }
  ctx.restore();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
  const newName = file.name.replace(/\.(png|webp|jpg|jpeg|heic|heif)$/i, "") + "-wm.jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallthrough
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}