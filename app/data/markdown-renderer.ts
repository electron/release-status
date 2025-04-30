import MarkdownIt from 'markdown-it';

export const makeMD = (opts: {
  tailwindLists: boolean;
  md?: MarkdownIt;
  inlineCodeSmall?: boolean;
}) => {
  const md =
    opts.md ||
    new MarkdownIt({
      html: true,
    }).use(smallStyleCleanupPlugin);

  // Tailwind styling for markdown-it output
  // Paragraphs
  md.renderer.rules.paragraph_open = () =>
    '<p class="mb-2 text-base text-gray-800 dark:text-gray-200">';

  // Headings
  const headingSizes = {
    '1': 'text-xl font-bold mb-3',
    '2': 'text-xl font-semibold mb-3',
    '3': 'text-xl font-semibold mb-3',
    '4': 'text-xl font-semibold mb-3',
    '5': 'text-lg font-medium mb-2',
    '6': 'text-base font-medium mb-1',
  } as const;
  md.renderer.rules.heading_open = (tokens, idx) => {
    const level = tokens[idx].tag.slice(1) as '1' | '2' | '3' | '4' | '5' | '6';
    return `<h${level} class="${headingSizes[level]} text-gray-900 dark:text-gray-100">`;
  };

  // Lists
  if (opts.tailwindLists) {
    md.renderer.rules.list_item_open = () =>
      '<li class="mb-1 list-disc ml-6 text-gray-800 dark:text-gray-200">';
  }

  // Inline code
  md.renderer.rules.code_inline = (tokens, idx) => {
    const content = md.utils.escapeHtml(tokens[idx].content);
    return `<code class="bg-gray-100 dark:bg-gray-800 rounded ${opts.inlineCodeSmall ? 'text-sm ' : ''}px-1 py-0.5 font-mono text-red-600 dark:text-red-400">${content}</code>`;
  };

  // Code blocks (indented or fenced)
  md.renderer.rules.code_block = (tokens, idx) => {
    return `<pre class="bg-gray-900 text-gray-100 p-4 rounded mb-4 overflow-auto"><code>${md.utils.escapeHtml(
      tokens[idx].content,
    )}</code></pre>`;
  };

  // Fence
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    return `<pre class="bg-gray-900 text-gray-100 p-4 rounded mb-4 overflow-auto"><code class="language-${token.info.trim()}">${md.utils.escapeHtml(
      token.content,
    )}</code></pre>`;
  };

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    // Add target="_blank" and rel for security
    tokens[idx].attrPush(['target', '_blank']);
    tokens[idx].attrPush(['rel', 'noopener noreferrer']);

    // Add Tailwind classes
    tokens[idx].attrPush([
      'class',
      'text-[#0366d6] dark:text-[#58a6ff] hover:underline font-medium',
    ]);

    return self.renderToken(tokens, idx, options);
  };

  function smallStyleCleanupPlugin(md: MarkdownIt) {
    const className = 'text-sm text-gray-500 dark:text-gray-400';

    const STYLE_REGEX = /<span\s+style\s*=\s*["']font-size\s*:\s*small;?["']>/gi;

    md.core.ruler.push('replace_small_font_spans', (state) => {
      state.tokens.forEach((token) => {
        if (token.type === 'inline' && token.children) {
          token.children.forEach((child) => {
            if (child.type === 'html_inline' && STYLE_REGEX.test(child.content)) {
              child.content = child.content.replace(STYLE_REGEX, `<span class="${className}">`);
            }
          });
        }
      });
    });
  }

  return md;
};
