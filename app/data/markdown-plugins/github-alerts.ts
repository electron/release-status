import MarkdownIt from 'markdown-it';

const alertTypes = {
  TIP: 'border-l-4 p-4 rounded-md bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-600 dark:text-green-100',
  NOTE: 'border-l-4 p-4 rounded-md bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-100',
  WARNING:
    'border-l-4 p-4 rounded-md bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-500 dark:text-yellow-100',
  IMPORTANT:
    'border-l-4 p-4 rounded-md bg-red-50 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-600 dark:text-red-100',
} as const;

export function githubAlerts(md: MarkdownIt) {
  md.core.ruler.after('block', 'github_alerts', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue;

      const blockquoteStart = i;
      let blockquoteEnd = i + 1;
      while (blockquoteEnd < tokens.length && tokens[blockquoteEnd].type !== 'blockquote_close') {
        blockquoteEnd++;
      }

      for (let j = blockquoteStart + 1; j < blockquoteEnd; j++) {
        if (tokens[j].type === 'inline') {
          const content = tokens[j].content.trimStart();

          const match = content.match(/^\[!(TIP|NOTE|WARNING|IMPORTANT)\]\s*\n?/i);
          if (!match) break;

          const type = match[1].toUpperCase() as keyof typeof alertTypes;

          tokens[blockquoteStart].attrSet(
            'class',
            `border-l-4 p-4 rounded-md mb-4 ${alertTypes[type]}`,
          );

          tokens[j].content = content.replace(match[0], '').trimStart();

          const titleToken = new state.Token('html_block', '', 0);
          titleToken.content = `<strong class="block font-semibold uppercase mb-1">${type}</strong>`;
          tokens.splice(j, 0, titleToken);

          break;
        }
      }

      i = blockquoteEnd;
    }
  });

  const defaultRender = md.renderer.rules.blockquote_open;
  md.renderer.rules.blockquote_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const cls = token.attrGet('class');
    if (cls) return `<blockquote class="${cls}">`;
    return defaultRender ? defaultRender(tokens, idx, options, env, slf) : '<blockquote>';
  };
}
