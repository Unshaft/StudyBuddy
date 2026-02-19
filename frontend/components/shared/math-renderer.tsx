'use client'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown text with KaTeX math support.
 * Supports:
 *  - Standard markdown (bold, italic, lists, headers, etc.)
 *  - Inline math: $...$
 *  - Block math: $$...$$
 */
export function MathRenderer({ content, className }: MathRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
