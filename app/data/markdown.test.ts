import { describe, expect, test } from 'vitest';
import { renderGroupedReleaseNotes, renderMarkdownSafely } from './markdown';

describe('renderMarkdownSafely', () => {
  test('renders headers correctly', () => {
    expect(renderMarkdownSafely('# Foo')).toMatchInlineSnapshot(`
      "<h1 class="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Foo</h1>
      "
    `);
  });

  test('renders absurd headers correctly', () => {
    expect(renderMarkdownSafely('###### Foo')).toMatchInlineSnapshot(`
      "<h6 class="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">Foo</h6>
      "
    `);
  });

  test('renders links correctly', () => {
    expect(renderMarkdownSafely('[foo](https://electronjs.org)')).toMatchInlineSnapshot(`
      "<p class="mb-2 text-base text-gray-800 dark:text-gray-200"><a class="text-[#0366d6] dark:text-[#58a6ff] hover:underline font-medium" rel="noopener noreferrer" href="https://electronjs.org" target="_blank">foo</a></p>
      "
    `);
  });

  test('renders inline code correctly', () => {
    expect(renderMarkdownSafely('`foo`')).toMatchInlineSnapshot(`
      "<p class="mb-2 text-base text-gray-800 dark:text-gray-200"><code class="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono text-red-600 dark:text-red-400">foo</code></p>
      "
    `);
  });

  test('renders code fences correctly', () => {
    expect(renderMarkdownSafely('```\nconst foo = 123\n```')).toMatchInlineSnapshot(`
      "<pre class="bg-gray-900 text-gray-100 p-4 rounded mb-4 overflow-auto"><code class="language-">const foo = 123
      </code></pre>"
    `);
  });

  test('renders code fences correctly', () => {
    expect(renderMarkdownSafely('    const foo = 123')).toMatchInlineSnapshot(`
      "<pre class="bg-gray-900 text-gray-100 p-4 rounded mb-4 overflow-auto"><code>const foo = 123
      </code></pre>"
    `);
  });

  test('renders lists correctly', () => {
    expect(renderMarkdownSafely('* foo\n* bar')).toMatchInlineSnapshot(`
      "<ul>
      <li class="mb-1 list-disc ml-6 text-gray-800 dark:text-gray-200"><p class="mb-2 text-base text-gray-800 dark:text-gray-200">foo</p></li>
      <li class="mb-1 list-disc ml-6 text-gray-800 dark:text-gray-200"><p class="mb-2 text-base text-gray-800 dark:text-gray-200">bar</p></li>
      </ul>
      "
    `);
  });

  test('renders the magic small notes correctly', () => {
    expect(
      renderMarkdownSafely('* We did a thing <span style="font-size: small">(Also in v24)</span>'),
    ).toMatchInlineSnapshot(`
      "<ul>
      <li class="mb-1 list-disc ml-6 text-gray-800 dark:text-gray-200"><p class="mb-2 text-base text-gray-800 dark:text-gray-200">We did a thing <span class="text-sm text-gray-500 dark:text-gray-400">(Also in v24)</span></p></li>
      </ul>
      "
    `);
  });
});

describe('renderGroupedReleaseNotes', () => {
  test('renders version grouped release notes correctly (basic case)', () => {
    const releaseNotes = [
      {
        version: 'v1.0.0',
        content: '## New Feature\n\n* Added new feature',
      },
      {
        version: 'v1.1.0',
        content: '## New Feature\n\n* Added another feature',
      },
    ];

    expect(renderGroupedReleaseNotes(releaseNotes)).toMatchInlineSnapshot(`
      {
        "New Feature": [
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Added another feature</p></li>
      </ul>
      ",
            "version": "v1.1.0",
          },
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Added new feature</p></li>
      </ul>
      ",
            "version": "v1.0.0",
          },
        ],
      }
    `);
  });

  test('renders version grouped release notes correctly (multi case)', () => {
    const releaseNotes = [
      {
        version: 'v1.0.0',
        content:
          '## New Feature\n\n* Added new feature\n\n## Other Stuff\n\n* More stuff\n* Even more stuff',
      },
      {
        version: 'v1.1.0',
        content:
          '## New Feature\n\n* Added new feature\n\n## Other Stuff\n\n* Random thing\n\n## Another Group\n\n* Stuff',
      },
    ];

    expect(renderGroupedReleaseNotes(releaseNotes)).toMatchInlineSnapshot(`
      {
        "Another Group": [
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Stuff</p></li>
      </ul>
      ",
            "version": "v1.1.0",
          },
        ],
        "New Feature": [
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Added new feature</p></li>
      </ul>
      ",
            "version": "v1.1.0",
          },
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Added new feature</p></li>
      </ul>
      ",
            "version": "v1.0.0",
          },
        ],
        "Other Stuff": [
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Random thing</p></li>
      </ul>
      ",
            "version": "v1.1.0",
          },
          {
            "content": "<ul>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">More stuff</p></li>
      <li><p class="mb-2 text-base text-gray-800 dark:text-gray-200">Even more stuff</p></li>
      </ul>
      ",
            "version": "v1.0.0",
          },
        ],
      }
    `);
  });
});
