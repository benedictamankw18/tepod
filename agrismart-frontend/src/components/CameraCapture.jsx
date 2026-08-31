import { useEffect, useMemo, useRef, useState } from 'react'

const PREVIEW = 'h-14 w-14 rounded-md object-cover'

export default function CameraCapture({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [usingCamera, setUsingCamera] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : ''), [value])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const openCamera = async () => {
    setError('')
    stopStream()
    if (!navigator.mediaDevices?.getUserMedia) {
      // Not a secure context / unsupported — let the phone's native camera app handle it.
      if (fileRef.current) fileRef.current.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      setUsingCamera(false)
      setOpen(true)
    } catch {
      setError('Could not access the camera. Allow camera access and try again, or use the gallery picker below.')
      if (fileRef.current) fileRef.current.click()
    }
  }

  useEffect(() => {
    if (!open) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [open])

  const capture = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    // Reject a frame that literally never decoded (fully black) instead of
    // silently uploading it.
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let anyLight = false
    for (let i = 0; i < data.length; i += 4 * 400) {
      if (data[i] + data[i + 1] + data[i + 2] > 10) {
        anyLight = true
        break
      }
    }
    if (!anyLight) {
      setError('Could not read a clear frame. Wait a moment and capture again.')
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Could not read the camera frame. Try again.')
        return
      }
      onChange(new File([blob], 'live-photo.jpg', { type: 'image/jpeg' }))
      close()
    }, 'image/jpeg', 0.85)
  }

  const close = () => {
    setOpen(false)
    setUsingCamera(false)
    stopStream()
  }

  useEffect(() => () => stopStream(), [])

  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-3">
          <img src={previewUrl} alt="Live photo preview" className={PREVIEW} />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm text-ink">Live photo captured</p>
            <p className="font-sans text-[11px] text-muted">If it looks unclear, take it again.</p>
          </div>
          <button type="button" onClick={openCamera} className="font-sans text-sm font-semibold text-leaf hover:underline">
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openCamera}
          className="flex w-full items-center gap-3 rounded-[10px] border border-dashed border-line bg-surface px-3 py-3 text-left hover:border-leaf"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-lime/30 text-2xl text-leaf">+</span>
          <span className="font-sans text-sm text-muted">Open camera to take a live photo</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0]
          if (f) onChange(f)
          e.target.value = ''
        }}
      />

      {error && <p className="mt-1.5 font-sans text-[11px] text-bad-text">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-[18px] bg-paper p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 font-sans text-sm font-semibold text-ink">Position your face in the frame</p>
            <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setUsingCamera(true)} className="max-h-[60vh] w-full rounded-[10px] bg-black object-contain" />
            <div className="mt-3 flex justify-between gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-[10px] border border-line px-4 py-2 font-sans text-sm font-semibold text-ink hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={!usingCamera}
                className="rounded-[10px] bg-leaf px-4 py-2 font-sans text-sm font-bold text-white hover:bg-leaf-dark disabled:opacity-50"
              >
                Capture photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}