import type { ComponentPropsWithoutRef } from 'react';

export const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1
      className="mb-4 font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary"
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="mb-3 mt-8 font-[family-name:var(--font-display)] text-2xl font-semibold text-text-primary"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-text-primary" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-4 leading-relaxed text-text-primary" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-4 list-disc pl-6 text-text-primary" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-4 list-decimal pl-6 text-text-primary" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => <li className="mb-1" {...props} />,
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => (
    <code
      className={`rounded bg-bg-surface px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-sm text-accent-cyan ${className ?? ''}`}
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="mb-4 overflow-x-auto rounded-lg border border-bg-border bg-bg-surface p-4 font-[family-name:var(--font-mono)] text-sm text-text-primary"
      {...props}
    />
  ),
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a
      className="text-accent-cyan underline-offset-2 hover:underline"
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="mb-4 border-l-4 border-accent-cyan/40 pl-4 italic text-text-secondary"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<'th'>) => (
    <th
      className="border border-bg-border bg-bg-surface px-3 py-2 text-left font-semibold"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-bg-border px-3 py-2" {...props} />
  ),
  hr: () => <hr className="my-8 border-bg-border" />,
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold text-text-primary" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<'em'>) => <em className="italic" {...props} />,
} satisfies Record<string, unknown>;

export type MdxComponentsMap = typeof mdxComponents;
