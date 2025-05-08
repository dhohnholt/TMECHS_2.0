import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRandomSoundPlayer() {
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const queueRef = useRef<string[]>([])

  useEffect(() => {
    async function loadSounds() {
      const { data: files, error } = await supabase
        .storage
        .from('sounds')
        .list('', { limit: 100 })

      if (error || !files) {
        console.error('Error loading sound files:', error)
        return
      }

      const urls = files.map(f =>
        supabase.storage.from('sounds').getPublicUrl(f.name).data?.publicUrl
      ).filter(Boolean) as string[]

      // Preload all sounds
      const audioMap = new Map<string, HTMLAudioElement>()
      urls.forEach(url => {
        const audio = new Audio(url)
        audio.preload = 'auto'
        audioMap.set(url, audio)
      })

      audioMapRef.current = audioMap
      queueRef.current = shuffleArray([...urls])
    }

    loadSounds()
  }, [])

  const shuffleArray = (array: string[]) => {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const playRandom = useCallback(() => {
    const map = audioMapRef.current
    if (!queueRef.current.length) {
      queueRef.current = shuffleArray([...map.keys()])
    }

    const nextUrl = queueRef.current.shift()
    if (nextUrl) {
      const sound = map.get(nextUrl)
      if (sound) {
        // Clone to allow overlapping playback if needed
        const clone = sound.cloneNode(true) as HTMLAudioElement
        clone.play().catch(err => console.warn('Audio play error:', err))
      }
    }
  }, [])

  return playRandom
}