'use client'
import { useEffect, useState } from 'react'
import PixelAvatar from './PixelAvatar'

export default function CoachAvatar({ avatar, mode, size = 120 }) {
  const [pose, setPose] = useState('stand')
  const [sweat, setSweat] = useState(false)

  useEffect(() => {
    if (mode !== 'exercise') { setPose('stand'); return }
    const interval = setInterval(() => {
      setPose(p => (p === 'stand' ? 'lateral' : 'stand'))
    }, 650)
    return () => clearInterval(interval)
  }, [mode])

  useEffect(() => {
    if (mode !== 'resting') { setSweat(false); return }
    const interval = setInterval(() => {
      setSweat(s => !s)
    }, 850)
    return () => clearInterval(interval)
  }, [mode])

  if (!avatar) return null

  return <PixelAvatar avatar={avatar} pose={pose} sweat={sweat} size={size} />
}
