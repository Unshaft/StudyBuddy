'use client'

import { useState, useRef, useCallback } from 'react'

interface CameraState {
  stream: MediaStream | null
  error: string | null
  isActive: boolean
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isActive: false,
  })
  const videoRef = useRef<HTMLVideoElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setState({ stream, error: null, isActive: true })
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? "L'accès à la caméra a été refusé. Autorise l'accès dans les paramètres de ton navigateur."
          : "Impossible d'accéder à la caméra."
      setState({ stream: null, error: msg, isActive: false })
    }
  }, [])

  const stopCamera = useCallback(() => {
    state.stream?.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setState({ stream: null, error: null, isActive: false })
  }, [state.stream])

  const capturePhoto = useCallback((): File | null => {
    if (!videoRef.current) return null
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0)
    // Convert to blob then to File
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) u8arr[n] = bstr.charCodeAt(n)
    return new File([u8arr], `photo_${Date.now()}.jpg`, { type: mime })
  }, [])

  return { ...state, videoRef, startCamera, stopCamera, capturePhoto }
}
