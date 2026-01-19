"use client";

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    List, 
    ListOrdered, 
    Quote, 
    Undo, 
    Redo,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Image as ImageIcon,
    Plus,
    Minus
} from "lucide-react";

// Font families available
const fontFamilies = [
    { name: 'Default', value: '' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
    { name: 'Impact', value: 'Impact, sans-serif' },
];

// Font sizes available
const fontSizes = [
    { label: 'Small', value: '12px' },
    { label: 'Normal', value: '14px' },
    { label: 'Medium', value: '16px' },
    { label: 'Large', value: '18px' },
    { label: 'XL', value: '20px' },
    { label: '2XL', value: '24px' },
    { label: '3XL', value: '30px' },
];

// Custom extension for font size with commands
const FontSize = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize,
                renderHTML: attributes => {
                    if (!attributes.fontSize) {
                        return {};
                    }
                    return {
                        style: `font-size: ${attributes.fontSize}`,
                    };
                },
            },
        };
    },

    addCommands() {
        return {
            setFontSize: (fontSize) => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

// Toolbar Component
const TipTapToolbar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file || !editor) return;

        if (!file.type.startsWith('image/')) {
            console.error("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result;
            if (base64) {
                editor.chain().focus().setImage({ src: base64 }).run();
            }
        };
        reader.readAsDataURL(file);
        
        // Reset file input
        event.target.value = '';
    };

    // Function to handle heading toggle with proper cycling
    const handleHeadingToggle = (level) => {
        if (editor.isActive('heading', { level })) {
            // If already active, toggle back to paragraph
            editor.chain().focus().setParagraph().run();
        } else {
            // Otherwise, set the heading level
            editor.chain().focus().toggleHeading({ level }).run();
        }
    };

    // Get current heading level or return null for paragraph
    const getCurrentHeadingLevel = () => {
        if (editor.isActive('heading', { level: 1 })) return 1;
        if (editor.isActive('heading', { level: 2 })) return 2;
        if (editor.isActive('heading', { level: 3 })) return 3;
        return null;
    };

    // Get current font size
    const getCurrentFontSize = () => {
        return editor.getAttributes('textStyle').fontSize || '14px';
    };

    // Increase font size
    const increaseFontSize = () => {
        const currentSize = getCurrentFontSize();
        const currentSizeNum = parseInt(currentSize);
        const newSize = isNaN(currentSizeNum) ? 16 : Math.min(currentSizeNum + 2, 36);
        editor.chain().focus().setFontSize(`${newSize}px`).run();
    };

    // Decrease font size
    const decreaseFontSize = () => {
        const currentSize = getCurrentFontSize();
        const currentSizeNum = parseInt(currentSize);
        const newSize = isNaN(currentSizeNum) ? 12 : Math.max(currentSizeNum - 2, 8);
        editor.chain().focus().setFontSize(`${newSize}px`).run();
    };

    // Set specific font size
    const setFontSize = (size) => {
        editor.chain().focus().setFontSize(size).run();
    };

    const currentHeadingLevel = getCurrentHeadingLevel();

    return (
        <div className="flex flex-wrap items-center gap-1 p-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
            {/* Font Family */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <select
                    value={editor.getAttributes('textStyle').fontFamily || ''}
                    onChange={(e) => {
                        const fontFamily = e.target.value;
                        if (fontFamily) {
                            editor.chain().focus().setFontFamily(fontFamily).run();
                        } else {
                            editor.chain().focus().unsetFontFamily().run();
                        }
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 cursor-pointer min-w-[100px]"
                    title="Font Family"
                    style={{ 
                        fontFamily: editor.getAttributes('textStyle').fontFamily || 'inherit'
                    }}
                >
                    {fontFamilies.map((font) => (
                        <option 
                            key={font.value} 
                            value={font.value}
                            style={{ fontFamily: font.value || 'inherit' }}
                        >
                            {font.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Font Size Controls */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                {/* Decrease Font Size */}
                <button
                    type="button"
                    onClick={decreaseFontSize}
                    className="p-2 rounded hover:bg-white transition-all duration-200 border border-transparent text-slate-600 hover:border-slate-300"
                    title="Decrease Font Size"
                >
                    <Minus className="h-4 w-4" />
                </button>

                {/* Font Size Selector */}
                <select
                    value={getCurrentFontSize()}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 cursor-pointer min-w-[80px]"
                    title="Font Size"
                >
                    {fontSizes.map((size) => (
                        <option key={size.value} value={size.value}>
                            {size.label}
                        </option>
                    ))}
                </select>

                {/* Increase Font Size */}
                <button
                    type="button"
                    onClick={increaseFontSize}
                    className="p-2 rounded hover:bg-white transition-all duration-200 border border-transparent text-slate-600 hover:border-slate-300"
                    title="Increase Font Size"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {/* Text Formatting */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive('bold') 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive('italic') 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive('underline') 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive('strike') 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Strikethrough"
                >
                    <s className="text-sm font-bold">S</s>
                </button>
            </div>

           
            {/* Lists */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive('bulletList') 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive('orderedList') 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive({ textAlign: 'left' }) 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive({ textAlign: 'center' }) 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-2 rounded hover:bg-white transition-all duration-200 border ${
                        editor.isActive({ textAlign: 'right' }) 
                            ? 'bg-white border-slate-300 text-slate-900 shadow-sm' 
                            : 'border-transparent text-slate-600 hover:border-slate-300'
                    }`}
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </button>
            </div>

            {/* Text Color */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <input
                    type="color"
                    onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()}
                    value={editor.getAttributes('textStyle').color || '#000000'}
                    title="Text Color"
                    className="w-8 h-8 p-1 rounded hover:bg-white transition-all duration-200 border border-transparent hover:border-slate-300 cursor-pointer"
                    style={{ padding: '2px' }}
                />
            </div>

            {/* Image Upload */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <label className="p-2 rounded hover:bg-white transition-all duration-200 border border-transparent text-slate-600 hover:border-slate-300 cursor-pointer" title="Insert Image">
                    <ImageIcon className="h-4 w-4" />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </label>
            </div>

           
            {/* History */}
            <div className="flex items-center gap-1 border-r border-slate-300 pr-2">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-2 rounded hover:bg-white transition-all duration-200 border border-transparent text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-2 rounded hover:bg-white transition-all duration-200 border border-transparent text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="h-4 w-4" />
                </button>
            </div>

         
        </div>
    );
};

const TipTapEditor = ({
    value,
    onChange,
    placeholder = "Start typing...",
    minHeight = "120px",
    maxHeight = "200px",
    showToolbar = true,
    editable = true
}) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    HTMLAttributes: {
                        class: 'bullet-list custom-bullet-list',
                    },
                    keepMarks: true,
                    keepAttributes: true,
                },
                orderedList: {
                    HTMLAttributes: {
                        class: 'ordered-list custom-ordered-list',
                    },
                    keepMarks: true,
                    keepAttributes: true,
                },
                listItem: {
                    HTMLAttributes: {
                        class: 'custom-list-item',
                    },
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'listItem'],
            }),
            TextStyle,
            Color,
            Underline,
            FontFamily.configure({
                types: ['textStyle'],
            }),
            FontSize, // Add the custom FontSize extension
            Image.configure({
                HTMLAttributes: {
                    class: 'rich-text-image',
                },
                allowBase64: true,
            }),
            Placeholder.configure({
                placeholder: placeholder,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none p-4 text-slate-700 leading-relaxed min-h-full',
                style: `
                    h1 { font-size: 1.875rem; font-weight: 700; margin: 0.5rem 0; line-height: 1.2; }
                    h2 { font-size: 1.5rem; font-weight: 600; margin: 0.5rem 0; line-height: 1.3; }
                    h3 { font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0; line-height: 1.4; }
                    p { margin: 0.5rem 0; line-height: 1.6; font-size: 1rem; }
                    
                    /* Enhanced list styles */
                    .custom-bullet-list { 
                        margin: 0.5rem 0; 
                        padding-left: 1.5rem; 
                        list-style-type: disc;
                    }
                    .custom-ordered-list { 
                        margin: 0.5rem 0; 
                        padding-left: 1.5rem; 
                        list-style-type: decimal;
                    }
                    .custom-list-item { 
                        margin: 0.25rem 0;
                        line-height: 1.6;
                    }
                    .custom-bullet-list .custom-list-item::marker {
                        color: #4f46e5;
                    }
                    .custom-ordered-list .custom-list-item::marker {
                        color: #059669;
                        font-weight: 600;
                    }
                    
                    .rich-text-image { max-width: 100%; height: auto; margin: 0.5rem 0; border-radius: 0.375rem; }
                    
                    /* Nested list styles */
                    .custom-bullet-list .custom-bullet-list {
                        list-style-type: circle;
                    }
                    .custom-bullet-list .custom-bullet-list .custom-bullet-list {
                        list-style-type: square;
                    }
                    .custom-ordered-list .custom-ordered-list {
                        list-style-type: lower-alpha;
                    }
                    .custom-ordered-list .custom-ordered-list .custom-ordered-list {
                        list-style-type: lower-roman;
                    }
                    
                    /* Enhanced TipTap List Styles */
                    .bullet-list, .custom-bullet-list {
                        list-style-type: disc;
                        margin: 0.5rem 0;
                        padding-left: 1.5rem;
                    }

                    .ordered-list, .custom-ordered-list {
                        list-style-type: decimal;
                        margin: 0.5rem 0;
                        padding-left: 1.5rem;
                    }

                    .custom-list-item {
                        margin: 0.25rem 0;
                        line-height: 1.6;
                    }

                    /* Nested list styles */
                    .bullet-list .bullet-list {
                        list-style-type: circle;
                    }

                    .bullet-list .bullet-list .bullet-list {
                        list-style-type: square;
                    }

                    .ordered-list .ordered-list {
                        list-style-type: lower-alpha;
                    }

                    .ordered-list .ordered-list .ordered-list {
                        list-style-type: lower-roman;
                    }

                    /* List item styling */
                    .ProseMirror ul, .ProseMirror ol {
                        padding-left: 1.5rem;
                    }

                    .ProseMirror ul li, .ProseMirror ol li {
                        margin: 0.25rem 0;
                    }

                    .ProseMirror ul li p, .ProseMirror ol li p {
                        margin: 0;
                    }
                `,
            },
        },
        editable,
        immediatelyRender: false,
        enableInputRules: true,
        enablePasteRules: true,
    });

    // Update editor content when value changes from outside
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, false);
        }
    }, [value, editor]);

    if (!isMounted) {
        return (
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white font-sans shadow-sm">
                {showToolbar && (
                    <div className="flex flex-wrap items-center gap-1 p-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
                        <div className="animate-pulse flex gap-1">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                )}
                <div style={{ minHeight, maxHeight }} className="p-4 bg-white">
                    <div className="animate-pulse">
                        <div className="h-4 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-slate-300 rounded-lg overflow-hidden bg-white font-sans shadow-sm hover:shadow-md transition-shadow duration-200">
            {showToolbar && editable && <TipTapToolbar editor={editor} />}
            <div 
                style={{ minHeight, maxHeight }} 
                className="overflow-y-auto bg-white custom-tiptap-styles"
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default TipTapEditor;