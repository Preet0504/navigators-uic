import DOMPurify from 'dompurify';

// The event description is authored only by the authenticated admin, but we
// still sanitize on the way out so a compromised session (or a bad paste)
// can't inject script/style/event-handler attributes into every visitor's page.
const CONFIG = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'mark', 'span', 'a', 'ul', 'ol', 'li', 'p', 'br', 'div', 'blockquote', 'h3', 'h4'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
  ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:)/i,
};

// Force every link to open safely in a new tab.
let hookAdded = false;
function ensureHook() {
  if (hookAdded) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  hookAdded = true;
}

export function sanitizeHtml(html) {
  if (!html) return '';
  ensureHook();
  return DOMPurify.sanitize(html, CONFIG);
}

// Plain-text fallback (card teasers, emails, search) derived from the HTML.
export function htmlToText(html) {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
}
