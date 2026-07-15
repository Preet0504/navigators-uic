import React, { useRef, useEffect } from 'react';

// A deliberately small formatting toolbar over a contentEditable region. It uses
// document.execCommand — deprecated but universally supported and perfect for a
// low-stakes admin-only editor without pulling in a heavy WYSIWYG dependency.
// Output HTML is sanitized on save/render (see lib/richtext.js).

const HILITES = ['#fff2a8', '#c7f0d2', '#ffd0dc', '#cfe6ff', '#e7d6f7'];
const COLORS = ['#24201e', '#008c95', '#d19f2a', '#e16b2a', '#228cc0', '#7f4182', '#c0392b'];

export default function RichTextEditor({ value, onChange, placeholder = 'Write the details…' }) {
  const ref = useRef(null);

  // Seed the editor once. We intentionally don't sync `value` back in on every
  // render — doing so would fight the user's cursor while they type.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML || '');
  const exec = (cmd, arg) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };
  const keepFocus = (e) => e.preventDefault(); // stop the button from stealing the selection

  const link = () => {
    const url = window.prompt('Link URL (https://…)');
    if (url) exec('createLink', url);
  };

  return (
    <div className="rte">
      <style>{`
        .rte { border: 1.5px solid var(--border); border-radius: var(--r-sm); overflow: hidden; background: #fff; }
        .rte-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); background: var(--paper); }
        .rte-btn { min-width: 30px; height: 30px; padding: 0 0.5rem; border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: var(--ink); display: inline-flex; align-items: center; justify-content: center; }
        .rte-btn:hover { border-color: var(--teal); color: var(--teal); }
        .rte-sep { width: 1px; height: 20px; background: var(--border); margin: 0 0.15rem; }
        .rte-swatch { width: 20px; height: 20px; border-radius: 5px; border: 1px solid rgba(0,0,0,0.15); cursor: pointer; padding: 0; }
        .rte-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin: 0 0.1rem 0 0.3rem; }
        .rte-area { min-height: 150px; max-height: 340px; overflow-y: auto; padding: 0.85rem 0.95rem; font-family: var(--font-body); font-size: 1rem; line-height: 1.6; color: var(--text); outline: none; }
        .rte-area:empty::before { content: attr(data-ph); color: #a8a29b; }
        .rte-area a { color: var(--teal); text-decoration: underline; }
        .rte-area ul, .rte-area ol { padding-left: 1.4rem; margin: 0.4rem 0; }
        .rte-area:focus-within { }
        .rte:focus-within { border-color: var(--teal); box-shadow: 0 0 0 4px rgba(0,140,149,0.12); }
      `}</style>

      <div className="rte-bar">
        <button type="button" className="rte-btn" title="Bold" onMouseDown={keepFocus} onClick={() => exec('bold')}><b>B</b></button>
        <button type="button" className="rte-btn" title="Italic" onMouseDown={keepFocus} onClick={() => exec('italic')}><i>I</i></button>
        <button type="button" className="rte-btn" title="Underline" onMouseDown={keepFocus} onClick={() => exec('underline')}><u>U</u></button>
        <button type="button" className="rte-btn" title="Strikethrough" onMouseDown={keepFocus} onClick={() => exec('strikeThrough')}><s>S</s></button>
        <span className="rte-sep" />
        <span className="rte-label">Aa</span>
        {COLORS.map((c) => (
          <button key={c} type="button" className="rte-swatch" style={{ background: c }} title={`Text ${c}`} onMouseDown={keepFocus} onClick={() => exec('foreColor', c)} />
        ))}
        <span className="rte-sep" />
        <span className="rte-label">Mark</span>
        {HILITES.map((c) => (
          <button key={c} type="button" className="rte-swatch" style={{ background: c }} title="Highlight" onMouseDown={keepFocus} onClick={() => exec('hiliteColor', c)} />
        ))}
        <span className="rte-sep" />
        <button type="button" className="rte-btn" title="Bulleted list" onMouseDown={keepFocus} onClick={() => exec('insertUnorderedList')}>• —</button>
        <button type="button" className="rte-btn" title="Numbered list" onMouseDown={keepFocus} onClick={() => exec('insertOrderedList')}>1.</button>
        <button type="button" className="rte-btn" title="Add link" onMouseDown={keepFocus} onClick={link}>🔗</button>
        <button type="button" className="rte-btn" title="Clear formatting" onMouseDown={keepFocus} onClick={() => exec('removeFormat')}>⌫</button>
      </div>

      <div
        ref={ref}
        className="rte-area"
        contentEditable
        suppressContentEditableWarning
        data-ph={placeholder}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
