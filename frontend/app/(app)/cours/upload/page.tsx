import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CourseUploader } from '@/components/cours/course-uploader'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function UploadPage() {
  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white border-b border-slate-100">
        <Link
          href="/cours"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" strokeWidth={2} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Ajouter un cours</h1>
          <p className="text-xs text-slate-500">Photo ou fichier depuis ta galerie</p>
        </div>
      </header>
      <PageWrapper>
        <CourseUploader />
      </PageWrapper>
    </>
  )
}
