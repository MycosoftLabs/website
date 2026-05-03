/**
 * Time-lapse recording — WebCodecs VideoEncoder when available, else MediaRecorder (WebM).
 * Date: May 02, 2026
 */

export interface RecordingHandles {
  stop: () => void
}

export function startCanvasRecording(
  canvas: HTMLCanvasElement,
  onBlob: (blob: Blob) => void,
  onError: (e: Error) => void
): RecordingHandles {
  const stream = canvas.captureStream(30)
  if (!stream.getVideoTracks().length) {
    onError(new Error("captureStream produced no video track"))
    return { stop: () => {} }
  }
  const mime =
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm"
  try {
    const rec = new MediaRecorder(stream, { mimeType: mime })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    rec.onstop = () => {
      onBlob(new Blob(chunks, { type: mime }))
    }
    rec.start(250)
    return {
      stop: () => {
        if (rec.state !== "inactive") rec.stop()
      },
    }
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)))
    return { stop: () => {} }
  }
}
