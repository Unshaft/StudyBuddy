interface SourceCardProps {
  source: string
  index: number
}

export function SourceCard({ source, index }: SourceCardProps) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
          Extrait de cours
        </span>
      </div>
      <blockquote className="text-sm text-slate-700 leading-relaxed pl-1 border-l-2 border-indigo-300">
        {source}
      </blockquote>
    </div>
  )
}
