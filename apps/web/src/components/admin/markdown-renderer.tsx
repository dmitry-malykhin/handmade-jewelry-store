'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-foreground',
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-h1:text-xl prose-h1:mb-3 prose-h1:mt-0',
        'prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h2:uppercase prose-h2:tracking-wide prose-h2:text-muted-foreground',
        'prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-1',
        'prose-p:text-sm prose-p:text-foreground prose-p:leading-relaxed',
        'prose-li:text-sm prose-li:text-foreground prose-ul:my-2 prose-ol:my-2',
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:rounded-md prose-pre:bg-muted prose-pre:p-3 prose-pre:text-xs',
        'prose-a:text-primary prose-a:underline-offset-2 hover:prose-a:underline',
        'prose-strong:text-foreground',
        'prose-table:text-sm prose-th:text-foreground prose-td:text-foreground',
        'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:font-normal prose-blockquote:not-italic',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href, children, ...rest }) => {
            const isExternal = typeof href === 'string' && /^https?:\/\//.test(href)
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                {...rest}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
