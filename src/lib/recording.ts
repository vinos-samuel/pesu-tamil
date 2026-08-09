import { supabase } from "./supabase";

/** iOS Safari only emits audio/mp4, not audio/webm -- never hardcode a mimetype. */
function pickMimeType(): string {
  const candidates = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // let the browser pick
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export type Recorder = {
  stop: () => Promise<Blob>;
};

/** Starts recording immediately -- must be called from a user gesture (iOS). */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    };
  });

  recorder.start();

  return {
    stop: async () => {
      recorder.stop();
      return stopped;
    },
  };
}

export async function uploadRecording(params: {
  profile_id: string;
  phrase_id: string;
  blob: Blob;
}): Promise<string> {
  const ext = extensionFor(params.blob.type);
  const path = `${params.profile_id}/${params.phrase_id}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("say-it-recordings")
    .upload(path, params.blob, { contentType: params.blob.type });
  if (error) throw error;
  return path;
}

export function recordingUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/say-it-recordings/${path}`;
}
