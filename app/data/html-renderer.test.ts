import { describe, expect, test } from 'vitest';
import { styleHtmlContent } from './html-renderer.js';

describe('styleHtmlContent', () => {
  test('it no-ops on empty content', () => {
    expect(styleHtmlContent('')).toMatchInlineSnapshot('""');
  });

  test('renders headers correctly', () => {
    expect(styleHtmlContent('<h1>Foo</h1>')).toMatchInlineSnapshot(`
      "<h1 class="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Foo</h1>"
    `);
  });

  test('renders absurd headers correctly', () => {
    expect(styleHtmlContent('<h6>Foo</h6>')).toMatchInlineSnapshot(`
      "<h6 class="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">Foo</h6>"
    `);
  });

  test('renders links correctly', () => {
    expect(styleHtmlContent('<a href="https://electronjs.org">foo</a>')).toMatchInlineSnapshot(`
      "<a href="https://electronjs.org" target="_blank" rel="noopener noreferrer" class="text-[#2f3241] dark:text-[#9feaf9] hover:underline font-medium">foo</a>"
    `);
  });

  test('renders inline code correctly', () => {
    expect(styleHtmlContent('<code>foo</code>')).toMatchInlineSnapshot(`
      "<code class="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono text-red-600 dark:text-red-400">foo</code>"
    `);
  });

  test('renders code fences correctly', () => {
    expect(styleHtmlContent('<pre><code>const foo = 123</code></pre>')).toMatchInlineSnapshot(`
      "<pre class="bg-gray-900 text-gray-100 p-4 rounded mb-4 overflow-auto"><code>const foo = 123</code></pre>"
    `);
  });

  test('renders code fences correctly when missing code inner block', () => {
    expect(styleHtmlContent('<pre>const foo = 123</pre>')).toMatchInlineSnapshot(`
      "<pre class="bg-gray-900 text-gray-100 p-4 rounded mb-4 overflow-auto"><code>const foo = 123</code></pre>"
    `);
  });

  test('renders lists correctly', () => {
    expect(styleHtmlContent('<ul><li><p>foo</p></li><li><p>bar</p></li></ul>'))
      .toMatchInlineSnapshot(`
      "<ul><li class="mb-1 list-disc ml-6 text-gray-800 dark:text-gray-200"><p class="mb-2 text-base text-gray-800 dark:text-gray-200">foo</p></li><li class="mb-1 list-disc ml-6 text-gray-800 dark:text-gray-200"><p class="mb-2 text-base text-gray-800 dark:text-gray-200">bar</p></li></ul>"
    `);
  });
});
