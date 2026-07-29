import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
} from 'lucide-react';

// Tiptap core ships no font-size mark; extend the official TextStyle mark with one.
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FONT_SIZES = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '' },
  { label: 'Medium', value: '18px' },
  { label: 'Large', value: '22px' },
  { label: 'X-Large', value: '28px' },
  { label: 'Huge', value: '36px' },
];

const HEADING_LEVELS = [1, 2, 3, 4];

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarSelect({ title, value, onChange, children }) {
  return (
    <select
      title={title}
      onMouseDown={(e) => e.stopPropagation()}
      value={value}
      onChange={onChange}
      className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
    >
      {children}
    </select>
  );
}

/**
 * Rich text (HTML) editor built on Tiptap. Stores/returns sanitizable HTML via onChange.
 * Drop-in replacement for AutoGrowTextarea wherever formatted text is needed.
 * The toolbar stays outside the scrolling content area so it's always reachable,
 * even when the content is longer than the visible box.
 */
export default function RichTextEditor({ value, onChange, placeholder = '', dir, className = '', maxHeight = '20rem' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: HEADING_LEVELS } }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        dir: dir || 'auto',
        class: `prose-editor-content focus:outline-none text-sm leading-relaxed min-h-[100px] px-4 py-3${dir === 'rtl' ? ' text-right font-arabic' : ''}`,
      },
    },
  });

  const activeHeadingLevel = HEADING_LEVELS.find((level) => editor?.isActive('heading', { level }));
  const headingValue = activeHeadingLevel ? String(activeHeadingLevel) : 'p';
  const fontSizeValue = editor?.getAttributes('textStyle').fontSize || '';

  return (
    <div className={`border border-slate-200 rounded-xl bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-colors overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-100/60">
        <ToolbarSelect
          title="Heading"
          value={headingValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(v, 10) }).run();
          }}
        >
          <option value="p">Paragraph</option>
          {HEADING_LEVELS.map((level) => (
            <option key={level} value={level}>Heading {level}</option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          title="Font size"
          value={fontSizeValue}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
          }}
        >
          {FONT_SIZES.map(({ label, value: v }) => (
            <option key={label} value={v}>{label}</option>
          ))}
        </ToolbarSelect>
        <span className="w-px h-5 bg-slate-300 mx-0.5" />
        <ToolbarButton title="Bold" active={editor?.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor?.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor?.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor?.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <ToolbarButton title="Align left" active={editor?.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton title="Align center" active={editor?.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton title="Align right" active={editor?.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton title="Justify" active={editor?.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <ToolbarButton title="Bullet list" active={editor?.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor?.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
      </div>
      <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
