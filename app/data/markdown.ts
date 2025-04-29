import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { makeMD } from './markdown-renderer';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const listMD = makeMD({ tailwindLists: true });
const noListMD = makeMD({ tailwindLists: false });

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const renderMarkdownSafely = (content: string) => {
  return DOMPurify.sanitize(listMD.render(content));
};

const knownSections = [
  'Breaking Changes',
  'Features',
  'Fixes',
  'Documentation',
  'Other Changes',
  'Unknown',
];

export const renderGroupedReleaseNotes = (versions: { version: string; content: string }[]) => {
  const groups: Record<string, { version: string; content: string }[]> = Object.create(null);
  for (const key of knownSections) {
    groups[key] = [];
  }
  for (const { version, content } of versions) {
    const headers = content.split(/^## ([A-Za-z ]+)\n/gm).slice(1);
    for (let i = 0; i < headers.length; i += 2) {
      const groupName = headers[i];
      const groupContent = headers[i + 1];
      groups[groupName] = groups[groupName] || [];
      groups[groupName].unshift({
        version,
        content: DOMPurify.sanitize(noListMD.render(groupContent.trim())),
      });
    }
  }

  for (const key of knownSections) {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  }

  return groups;
};
