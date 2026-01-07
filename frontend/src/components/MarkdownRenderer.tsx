import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div
      className="prose dark:prose-invert max-w-none
        prose-headings:text-foreground prose-headings:font-semibold
        prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
        prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
        prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
        prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-4
        prose-a:text-blue-400 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-300
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:text-purple-400 prose-code:bg-secondary/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-secondary/30 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500/50 prose-blockquote:bg-secondary/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-foreground/80
        prose-ul:my-4 prose-ul:text-foreground/90
        prose-ol:my-4 prose-ol:text-foreground/90
        prose-li:my-1 prose-li:marker:text-muted-foreground
        prose-hr:border-border/50 prose-hr:my-8
        prose-img:rounded-lg prose-img:max-h-80 prose-img:mx-auto
        prose-table:border-collapse prose-table:w-full
        prose-th:border prose-th:border-border/50 prose-th:bg-secondary/30 prose-th:px-3 prose-th:py-2 prose-th:text-left
        prose-td:border prose-td:border-border/50 prose-td:px-3 prose-td:py-2
        prose-tr:even:bg-secondary/10"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          input: ({ checked, ...props }) => (
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mr-2 accent-blue-500"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
