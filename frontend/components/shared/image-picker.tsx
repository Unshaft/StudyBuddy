'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'

interface ImagePickerProps {
  onSelect: (file: File) => void
  accept?: string
  label?: string
  disabled?: boolean
}

export function ImagePicker({
  onSelect,
  accept = 'image/*',
  label = 'Choisir une photo',
  disabled = false,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
          e.target.value = ''
        }}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {label}
      </Button>
    </>
  )
}
