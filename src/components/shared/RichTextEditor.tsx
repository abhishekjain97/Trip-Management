/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon: Icon, title, onClick }) => (
  <button
    type="button"
    // Without this, clicking the button blurs the editor first, collapsing
    // the text selection before the click handler runs — breaking bold/italic.
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all"
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Only seed the editor's content once, on mount. This component is always
  // used inside a modal that mounts fresh per open (never kept alive across
  // re-renders), so there's no need to re-sync on every value change — doing
  // so via innerHTML would reset the user's cursor position while typing.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Force plain-text paste so arbitrary HTML from the clipboard can't sneak in.
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-amber-500 transition-all bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <ToolbarButton icon={Bold} title="Bold" onClick={() => exec('bold')} />
        <ToolbarButton icon={Italic} title="Italic" onClick={() => exec('italic')} />
        <ToolbarButton icon={Underline} title="Underline" onClick={() => exec('underline')} />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton icon={List} title="Bullet List" onClick={() => exec('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} title="Numbered List" onClick={() => exec('insertOrderedList')} />
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="w-full px-4 py-2.5 min-h-30 text-sm font-semibold text-slate-900 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:font-medium"
      />
    </div>
  );
};
