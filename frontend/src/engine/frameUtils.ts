export function extractFrameBase64(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string {
  const scale = 0.4;
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;

  const ctx = canvas.getContext("2d");
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
}
