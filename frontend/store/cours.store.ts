'use client'

import { create } from 'zustand'
import type { CourseListItem, Chapter, UploadStatus } from '@/types'

interface CoursStore {
  courses: CourseListItem[]
  chapters: Chapter[]
  isUploading: boolean
  uploadProgress: UploadStatus
  setCourses: (courses: CourseListItem[]) => void
  setChapters: (chapters: Chapter[]) => void
  setIsUploading: (v: boolean) => void
  setUploadProgress: (p: UploadStatus) => void
  removeCourse: (id: string) => void
}

export const useCoursStore = create<CoursStore>((set) => ({
  courses: [],
  chapters: [],
  isUploading: false,
  uploadProgress: 'idle',
  setCourses: (courses) => set({ courses }),
  setChapters: (chapters) => set({ chapters }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  removeCourse: (id) =>
    set((state) => ({ courses: state.courses.filter((c) => c.id !== id) })),
}))
