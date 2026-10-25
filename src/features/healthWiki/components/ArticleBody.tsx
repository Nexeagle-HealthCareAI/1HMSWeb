import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Article text comes from outside contributors, so it is never trusted: react-markdown builds React
// elements (no innerHTML), rehype-sanitize drops anything outside a small allow-list, and links and
// images are limited to https. The same rules as the public Doctor Dekho page.
const schema = {
  ...defaultSchema,
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'], src: ['https'] },
};

const okSrc = (src: string) => (src.startsWith('/') ? !src.startsWith('//') : src.startsWith('https://') || src.startsWith('data:image/'));

const components: Components = {
  h1: ({ node: _n, children }) => <h2 className="mt-8 mb-3 text-xl font-bold text-foreground border-b border-border pb-2">{children}</h2>,
  h2: ({ node: _n, children }) => <h2 className="mt-8 mb-3 text-xl font-bold text-foreground border-b border-border pb-2">{children}</h2>,
  h3: ({ node: _n, children }) => <h3 className="mt-6 mb-2 text-lg font-bold text-foreground">{children}</h3>,
  p: ({ node: _n, children }) => <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>,
  ul: ({ node: _n, children }) => <ul className="mb-4 ml-5 list-disc space-y-1.5 text-muted-foreground">{children}</ul>,
  ol: ({ node: _n, children }) => <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-muted-foreground">{children}</ol>,
  strong: ({ node: _n, children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ node: _n, children }) => <blockquote className="mb-4 border-l-4 border-teal-500 pl-4 text-muted-foreground italic">{children}</blockquote>,
  a: ({ node: _n, href, children }) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a href={href} className="font-semibold text-teal-600 underline" {...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } : {})}>
        {children}
      </a>
    );
  },
  img: ({ node: _n, src, alt }) => (typeof src === 'string' && okSrc(src) ? <img src={src} alt={alt ?? ''} loading="lazy" className="my-5 w-full rounded-2xl border border-border" /> : null),
};

export default function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
}
