'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pingKeepalive, removeBackground } from './removeBackground';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB — keeps phone memory safe.

type Phase = 'idle' | 'ready' | 'working' | 'done' | 'error';
type BgPreview = 'transparent' | 'white' | 'green';

// Phones get a smaller working size: faster inference, less memory, and a
// smaller download is never the bottleneck — the model input is 320x320
// either way, so quality barely changes. Desktops get up to 2048px.
function pickMaxDimension(): number {
  if (typeof window === 'undefined') return 2048;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const smallestSide = Math.min(window.innerWidth, window.innerHeight);
  return coarsePointer && smallestSide < 700 ? 1024 : 2048;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to the <img> path below.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image. Please try a different photo.'));
    };
    img.src = url;
  });
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPG or WebP photo.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'That photo is over 20 MB. Please choose a smaller one.';
  }
  if (file.size === 0) {
    return 'That file looks empty. Please choose a different photo.';
  }
  return null;
}

export default function BackgroundRemover() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultSize, setResultSize] = useState('');
  const [status, setStatus] = useState('');
  const [fraction, setFraction] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [bgPreview, setBgPreview] = useState<BgPreview>('transparent');
  const fileRef = useRef<File | null>(null);
  const urlsRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const workingRef = useRef(false);

  const trackUrl = useCallback((url: string) => {
    urlsRef.current.push(url);
    return url;
  }, []);

  const revokeAllUrls = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  useEffect(() => revokeAllUrls, [revokeAllUrls]);

  const reset = useCallback(() => {
    revokeAllUrls();
    fileRef.current = null;
    setOriginalUrl(null);
    setResultUrl(null);
    setResultBlob(null);
    setResultSize('');
    setStatus('');
    setFraction(null);
    setError('');
    setBgPreview('transparent');
    setPhase('idle');
    if (inputRef.current) inputRef.current.value = '';
  }, [revokeAllUrls]);

  const acceptFile = useCallback(
    (file: File) => {
      const problem = validateFile(file);
      if (problem) {
        setError(problem);
        setPhase('error');
        return;
      }
      revokeAllUrls();
      fileRef.current = file;
      setFileName(file.name);
      setOriginalUrl(trackUrl(URL.createObjectURL(file)));
      setResultUrl(null);
      setResultBlob(null);
      setError('');
      setPhase('ready');
    },
    [revokeAllUrls, trackUrl],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) acceptFile(file);
    },
    [acceptFile],
  );

  // Pasting a copied photo anywhere on the page loads it into the tool.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (workingRef.current) return;
      const file = event.clipboardData?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        event.preventDefault();
        acceptFile(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [acceptFile]);

  const runRemoval = useCallback(async () => {
    const file = fileRef.current;
    if (!file || workingRef.current) return;
    workingRef.current = true;
    setPhase('working');
    setError('');
    setStatus('Preparing your photo…');
    setFraction(null);
    try {
      const bitmap = await loadBitmap(file);
      const result = await removeBackground(bitmap, pickMaxDimension(), (message, frac) => {
        setStatus(message);
        setFraction(frac);
      });
      if (bitmap instanceof ImageBitmap) bitmap.close();
      setResultBlob(result.blob);
      setResultSize(`${result.width} × ${result.height} px`);
      setResultUrl(trackUrl(URL.createObjectURL(result.blob)));
      setStatus('');
      setFraction(null);
      setPhase('done');
      // Only after a successful removal: one silent ping to the site's
      // own keepalive endpoint (a real Supabase query), so tool traffic
      // helps keep the database awake. Never blocks, never errors.
      pingKeepalive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPhase('error');
    } finally {
      workingRef.current = false;
    }
  }, [trackUrl]);

  const download = useCallback(() => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'springdrill-no-background.png';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [resultBlob]);

  const showDropzone = phase === 'idle' || phase === 'ready' || phase === 'error';

  return (
    <div className="sd-bg-tool">
      {showDropzone && (
        <div
          className={`sd-bg-dropzone${dragActive ? ' sd-bg-dropzone-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            className="sd-bg-file-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Choose a photo"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) acceptFile(file);
            }}
          />
          <p className="sd-bg-drop-title">Drop a photo here</p>
          <p className="sd-bg-drop-sub">or tap the button to choose one from your device. You can also paste a copied photo.</p>
          <button type="button" className="sd-btn sd-bg-choose" onClick={() => inputRef.current?.click()}>
            Choose a photo
          </button>
          <p className="sd-bg-drop-note">PNG, JPG or WebP · up to 20 MB · your photo never leaves your device</p>
        </div>
      )}

      {phase === 'ready' && originalUrl && (
        <div className="sd-bg-ready">
          <img className="sd-bg-thumb" src={originalUrl} alt="Your chosen photo" />
          <div className="sd-bg-ready-text">
            <p className="sd-bg-filename">{fileName}</p>
            <p>Ready. Tap the button and the background will be removed on your device — nothing is uploaded.</p>
          </div>
          <button type="button" className="sd-btn sd-bg-remove" onClick={runRemoval}>
            Remove background
          </button>
          <button type="button" className="sd-btn-outline sd-bg-change" onClick={reset}>
            Choose a different photo
          </button>
        </div>
      )}

      {phase === 'working' && (
        <div className="sd-bg-working" role="status" aria-live="polite">
          <div className="sd-bg-progress-track" aria-hidden="true">
            <div
              className={`sd-bg-progress-fill${fraction === null ? ' sd-bg-progress-busy' : ''}`}
              style={fraction === null ? undefined : { width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
          <p className="sd-bg-status">{status}</p>
          <p className="sd-bg-status-sub">
            First use downloads the removal engine (about 20 MB) and saves it on your device, so the next photo is much
            faster. The page may pause briefly while it works — that is normal.
          </p>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="sd-bg-error" role="alert">
          <p>{error}</p>
          {fileRef.current && (
            <button type="button" className="sd-btn sd-bg-retry" onClick={runRemoval}>
              Try again
            </button>
          )}
        </div>
      )}

      {phase === 'done' && originalUrl && resultUrl && (
        <div className="sd-bg-result">
          <div className="sd-bg-panels">
            <figure className="sd-bg-panel">
              <figcaption>Original</figcaption>
              <img src={originalUrl} alt="Original photo" />
            </figure>
            <figure className="sd-bg-panel">
              <figcaption>Background removed · {resultSize}</figcaption>
              <div className={`sd-bg-preview sd-bg-preview-${bgPreview}`}>
                <img src={resultUrl} alt="Photo with the background removed" />
              </div>
              <div className="sd-bg-preview-toggle" role="group" aria-label="Preview background">
                <button
                  type="button"
                  className={bgPreview === 'transparent' ? 'sd-bg-toggle-active' : undefined}
                  aria-pressed={bgPreview === 'transparent'}
                  onClick={() => setBgPreview('transparent')}
                >
                  Transparent
                </button>
                <button
                  type="button"
                  className={bgPreview === 'white' ? 'sd-bg-toggle-active' : undefined}
                  aria-pressed={bgPreview === 'white'}
                  onClick={() => setBgPreview('white')}
                >
                  White
                </button>
                <button
                  type="button"
                  className={bgPreview === 'green' ? 'sd-bg-toggle-active' : undefined}
                  aria-pressed={bgPreview === 'green'}
                  onClick={() => setBgPreview('green')}
                >
                  Green
                </button>
              </div>
            </figure>
          </div>
          <p className="sd-bg-result-note">
            The preview background is only for checking — the downloaded file is a transparent PNG, free, with no
            watermark.
          </p>
          <div className="sd-bg-actions">
            <button type="button" className="sd-btn sd-bg-download" onClick={download}>
              Download PNG (free)
            </button>
            <button type="button" className="sd-btn-outline sd-bg-again" onClick={reset}>
              Remove another photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
