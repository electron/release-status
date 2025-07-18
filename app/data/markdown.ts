import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { makeMD } from './markdown-renderer';
import MarkdownIt from 'markdown-it';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const titleMdIt = new MarkdownIt('zero', {
  html: false,
  linkify: false,
  typographer: false,
});
titleMdIt.inline.ruler.enable(['backticks']);
const listMD = makeMD({ tailwindLists: true, inlineCodeSmall: true });
const noListMD = makeMD({ tailwindLists: false, inlineCodeSmall: true, levelShift: 2 });
const titleMD = makeMD({
  tailwindLists: false,
  md: titleMdIt,
});

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const renderMarkdownSafely = (content: string) => {
  return DOMPurify.sanitize(listMD.render(content));
};

export const renderPRTitleMarkdownSafely = (title: string) => {
  // PR titles should not have newlines, but just in case, nuke em
  return DOMPurify.sanitize(titleMD.renderInline(title.replaceAll('\n', '')));
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
    const headers = content.split(/^## ([A-Za-z ]+)(?:\r\n|\n)/gm).slice(1);
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
