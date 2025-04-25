import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export function styleHtmlContent(rawHtml: string) {
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
  });

  const dom = new JSDOM(cleanHtml);
  const doc = dom.window.document;

  // Paragraphs
  doc.querySelectorAll('p').forEach((p) => {
    p.classList.add('mb-2', 'text-base', 'text-gray-800', 'dark:text-gray-200');
  });

  // Headings
  const headingStyles: Record<string, string[]> = {
    H1: ['text-xl', 'font-bold', 'mb-3'],
    H2: ['text-xl', 'font-semibold', 'mb-3'],
    H3: ['text-xl', 'font-semibold', 'mb-3'],
    H4: ['text-xl', 'font-semibold', 'mb-3'],
    H5: ['text-lg', 'font-medium', 'mb-2'],
    H6: ['text-base', 'font-medium', 'mb-1'],
  };

  (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => {
      const classes = headingStyles[tag.toUpperCase()];
      if (classes) {
        el.classList.add(...classes, 'text-gray-900', 'dark:text-gray-100');
      }
    });
  });

  // Lists
  doc.querySelectorAll('li').forEach((li) => {
    li.classList.add('mb-1', 'list-disc', 'ml-6', 'text-gray-800', 'dark:text-gray-200');
  });

  // Inline code
  doc.querySelectorAll('code').forEach((code) => {
    const parent = code.parentElement;
    if (parent?.tagName.toLowerCase() === 'pre') {
      // Handled separately below
      return;
    }
    code.classList.add(
      'bg-gray-100',
      'dark:bg-gray-800',
      'rounded',
      'px-1',
      'py-0.5',
      'text-sm',
      'font-mono',
      'text-red-600',
      'dark:text-red-400',
    );
  });

  // Code blocks
  doc.querySelectorAll('pre').forEach((pre) => {
    pre.classList.add('bg-gray-900', 'text-gray-100', 'p-4', 'rounded', 'mb-4', 'overflow-auto');
    if (!pre.querySelector('code')) {
      const code = doc.createElement('code');
      code.innerHTML = pre.innerHTML;
      pre.innerHTML = '';
      pre.appendChild(code);
    }
  });

  // Links
  doc.querySelectorAll('a').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.classList.add('text-[#2f3241]', 'dark:text-[#9feaf9]', 'hover:underline', 'font-medium');
  });

  return doc.body.innerHTML;
}
