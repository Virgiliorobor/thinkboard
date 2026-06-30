import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { cleanArticleMd } from '../lib/markdown';

const components: Components = {
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      className="rounded-lg max-w-full h-auto mx-auto my-6"
      {...props}
    />
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-accent/40 pl-4 italic text-muted" {...props}>
      {children}
    </blockquote>
  ),
};

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-stone max-w-none prose-headings:font-serif prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-img:my-6 prose-p:leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {cleanArticleMd(markdown)}
      </ReactMarkdown>
    </div>
  );
}
