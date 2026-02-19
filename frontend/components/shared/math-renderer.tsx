'use client'

import React from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'

interface MathRendererProps {
  content: string
  className?: string
}

function renderMath(str: string, displayMode: boolean): string {
  try {
    return katex.renderToString(str, {
      displayMode,
      throwOnError: false,
      output: 'html',
    })
  } catch {
    return str
  }
}

/**
 * Parses text containing $...$ (inline) and $$...$$ (block) LaTeX,
 * renders them with KaTeX, and returns React nodes.
 */
function parseAndRender(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Match $$...$$, $...$, and plain text
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index)
      nodes.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {text}
        </span>
      )
    }

    const raw = match[0]
    if (raw.startsWith('$$')) {
      const math = raw.slice(2, -2)
      nodes.push(
        <span
          key={match.index}
          className="block my-2"
          dangerouslySetInnerHTML={{ __html: renderMath(math, true) }}
        />
      )
    } else {
      const math = raw.slice(1, -1)
      nodes.push(
        <span
          key={match.index}
          dangerouslySetInnerHTML={{ __html: renderMath(math, false) }}
        />
      )
    }

    lastIndex = match.index + raw.length
  }

  if (lastIndex < content.length) {
    nodes.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>
    )
  }

  return nodes
}

export function MathRenderer({ content, className }: MathRendererProps) {
  return (
    <div className={className}>
      {parseAndRender(content)}
    </div>
  )
}
