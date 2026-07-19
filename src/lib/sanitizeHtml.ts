/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Minimal allow-list HTML sanitizer for the rich text description field.
// The editor's toolbar only ever produces this small tag set, but content
// can also arrive via paste or a future direct API call, so rendering
// still sanitizes defensively: unknown tags are unwrapped (their text/allowed
// children survive) and every attribute is stripped (no href/style/onClick etc).
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN']);

export function sanitizeDescriptionHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;

  const walk = (node: ParentNode) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const el = child as HTMLElement;
      Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name));

      if (!ALLOWED_TAGS.has(el.tagName)) {
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        node.removeChild(el);
        return;
      }

      walk(el);
    });
  };

  walk(template.content);
  return template.innerHTML;
}
