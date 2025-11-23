// src/components/notes/RichTextEditor.tsx
import React, {useEffect} from "react";
import {EditorContent, useEditor, BubbleMenu, FloatingMenu} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({value, onChange}) => {
    const editor = useEditor({
        extensions: [
            Color.configure({types: ["textStyle"]}),
            TextStyle,
            StarterKit.configure({
                heading: {
                    levels: [2, 3]
                },
                codeBlock: {
                    HTMLAttributes: {
                        class: "rte-code-block"
                    }
                }
            }),
            Underline,
            Highlight,
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    rel: "noopener noreferrer",
                    target: "_blank"
                }
            }),
            Image.configure({
                inline: false,
                HTMLAttributes: {
                    class: "rte-image"
                }
            })
        ],
        content: value,
        onUpdate: ({editor}) => {
            onChange(editor.getHTML());
        }
    });

    // синхроним проп в редактор при открытии модалки / редактировании
    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (current !== value) {
            editor.commands.setContent(value || "", false);
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Введите URL", previousUrl || "https://");

        if (url === null) return;
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({href: url})
            .run();
    };

    const insertImageByUrl = () => {
        const url = window.prompt("URL картинки");
        if (!url) return;
        editor.chain().focus().setImage({src: url}).run();
    };

    const clearFormatting = () => {
        editor.chain().focus().clearNodes().unsetAllMarks().run();
    };

    const isSlashContext = () => {
        const {state} = editor;
        const {selection} = state;
        const {$from} = selection;
        const parent = $from.parent;
        const text = parent.textBetween(0, parent.content.size, "\n", "\0");
        const trimmed = text.trim();
        return trimmed === "/" || trimmed === "/.";
    };

    const runSlashCommand = (cmd: "h2" | "h3" | "bullet" | "ordered" | "code" | "quote") => {
        const {state} = editor;
        const {selection} = state;
        const {$from} = selection;

        const from = $from.start();
        const to = from + 1;

        const chain = editor.chain().focus().deleteRange({from, to});

        switch (cmd) {
            case "h2":
                chain.setNode("heading", {level: 2}).run();
                break;
            case "h3":
                chain.setNode("heading", {level: 3}).run();
                break;
            case "bullet":
                chain.toggleBulletList().run();
                break;
            case "ordered":
                chain.toggleOrderedList().run();
                break;
            case "code":
                chain.toggleCodeBlock().run();
                break;
            case "quote":
                chain.toggleBlockquote().run();
                break;
        }
    };

    return (
        <div className="rte-root">
            {/* Тулбар */}
            <div className="rte-toolbar">
                <div className="rte-toolbar-group">
                    <button
                        type="button"
                        title="Заголовок H2"
                        className={
                            "rte-btn" + (editor.isActive("heading", {level: 2}) ? " active" : "")
                        }
                        onClick={() =>
                            editor.chain().focus().toggleHeading({level: 2}).run()
                        }
                    >
                        H2
                    </button>
                    <button
                        type="button"
                        title="Заголовок H3"
                        className={
                            "rte-btn" + (editor.isActive("heading", {level: 3}) ? " active" : "")
                        }
                        onClick={() =>
                            editor.chain().focus().toggleHeading({level: 3}).run()
                        }
                    >
                        H3
                    </button>
                    <button
                        type="button"
                        title="Обычный текст"
                        className={"rte-btn" + (editor.isActive("paragraph") ? " active" : "")}
                        onClick={() => editor.chain().focus().setParagraph().run()}
                    >
                        P
                    </button>
                </div>

                <div className="rte-toolbar-group">
                    <button
                        type="button"
                        title="Жирный"
                        className={"rte-btn" + (editor.isActive("bold") ? " active" : "")}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                        B
                    </button>
                    <button
                        type="button"
                        title="Курсив"
                        className={"rte-btn" + (editor.isActive("italic") ? " active" : "")}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                        I
                    </button>
                    <button
                        type="button"
                        title="Подчёркивание"
                        className={"rte-btn" + (editor.isActive("underline") ? " active" : "")}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                    >
                        U
                    </button>
                    <button
                        type="button"
                        title="Зачёркивание"
                        className={"rte-btn" + (editor.isActive("strike") ? " active" : "")}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    >
                        S
                    </button>
                    <button
                        type="button"
                        title="Подсветка текста"
                        className={
                            "rte-btn" + (editor.isActive("highlight") ? " active" : "")
                        }
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                    >
                        ⧉
                    </button>
                </div>

                <div className="rte-toolbar-group">
                    <button
                        type="button"
                        title="Маркированный список"
                        className={
                            "rte-btn" + (editor.isActive("bulletList") ? " active" : "")
                        }
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    >
                        ••
                    </button>
                    <button
                        type="button"
                        title="Нумерованный список"
                        className={
                            "rte-btn" + (editor.isActive("orderedList") ? " active" : "")
                        }
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    >
                        1.
                    </button>
                    <button
                        type="button"
                        title="Блок кода"
                        className={
                            "rte-btn" + (editor.isActive("codeBlock") ? " active" : "")
                        }
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    >
                        {"</>"}
                    </button>
                    <button
                        type="button"
                        title="Цитата"
                        className={
                            "rte-btn" + (editor.isActive("blockquote") ? " active" : "")
                        }
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    >
                        ❝
                    </button>
                </div>

                <div className="rte-toolbar-group">
                    <button
                        type="button"
                        title="Ссылка"
                        className={"rte-btn" + (editor.isActive("link") ? " active" : "")}
                        onClick={setLink}
                    >
                        🔗
                    </button>
                    <button
                        type="button"
                        title="Вставить картинку по URL"
                        className="rte-btn"
                        onClick={insertImageByUrl}
                    >
                        🖼
                    </button>
                </div>

                <div className="rte-toolbar-group">
                    <button
                        type="button"
                        title="Красный текст"
                        className="rte-btn"
                        onClick={() =>
                            editor.chain().focus().setColor("#ef4444").run()
                        }
                    >
                        <span style={{color: "#ef4444"}}>A</span>
                    </button>
                    <button
                        type="button"
                        title="Зелёный текст"
                        className="rte-btn"
                        onClick={() =>
                            editor.chain().focus().setColor("#16a34a").run()
                        }
                    >
                        <span style={{color: "#16a34a"}}>A</span>
                    </button>
                    <button
                        type="button"
                        title="Синий текст"
                        className="rte-btn"
                        onClick={() =>
                            editor.chain().focus().setColor("#2563eb").run()
                        }
                    >
                        <span style={{color: "#2563eb"}}>A</span>
                    </button>
                    <button
                        type="button"
                        title="Сброс цвета текста"
                        className="rte-btn"
                        onClick={() => editor.chain().focus().unsetColor().run()}
                    >
                        ⨯
                    </button>
                </div>

                <div className="rte-toolbar-group">
                    <button
                        type="button"
                        title="Отменить"
                        className="rte-btn"
                        onClick={() => editor.chain().focus().undo().run()}
                    >
                        ↺
                    </button>
                    <button
                        type="button"
                        title="Повторить"
                        className="rte-btn"
                        onClick={() => editor.chain().focus().redo().run()}
                    >
                        ↻
                    </button>
                    <button
                        type="button"
                        title="Очистить форматирование"
                        className="rte-btn"
                        onClick={clearFormatting}
                    >
                        CLR
                    </button>
                </div>
            </div>

            {/* Bubble menu */}
            <BubbleMenu
                editor={editor}
                className="rte-bubble-menu"
                tippyOptions={{duration: 120}}
            >
                <button
                    type="button"
                    title="Жирный"
                    className={
                        "rte-bubble-btn" + (editor.isActive("bold") ? " active" : "")
                    }
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    B
                </button>
                <button
                    type="button"
                    title="Курсив"
                    className={
                        "rte-bubble-btn" + (editor.isActive("italic") ? " active" : "")
                    }
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    I
                </button>
                <button
                    type="button"
                    title="Подчёркивание"
                    className={
                        "rte-bubble-btn" +
                        (editor.isActive("underline") ? " active" : "")
                    }
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    U
                </button>
                <button
                    type="button"
                    title="Ссылка"
                    className={
                        "rte-bubble-btn" + (editor.isActive("link") ? " active" : "")
                    }
                    onClick={setLink}
                >
                    🔗
                </button>
            </BubbleMenu>

            {/* Slash menu */}
            <FloatingMenu
                editor={editor}
                className="rte-slash-menu"
                tippyOptions={{duration: 120, placement: "right"}}
                shouldShow={() => isSlashContext()}
            >
                <div className="rte-slash-menu-inner">
                    <div className="rte-slash-title">Команды</div>
                    <button
                        type="button"
                        className="rte-slash-item"
                        onClick={() => runSlashCommand("h2")}
                    >
                        <span className="rte-slash-label">Заголовок H2</span>
                        <span className="rte-slash-desc">Основные секции заметки</span>
                    </button>
                    <button
                        type="button"
                        className="rte-slash-item"
                        onClick={() => runSlashCommand("h3")}
                    >
                        <span className="rte-slash-label">Заголовок H3</span>
                        <span className="rte-slash-desc">Подзаголовки и подпункты</span>
                    </button>
                    <button
                        type="button"
                        className="rte-slash-item"
                        onClick={() => runSlashCommand("bullet")}
                    >
                        <span className="rte-slash-label">Маркированный список</span>
                        <span className="rte-slash-desc">Пункты задач, идеи</span>
                    </button>
                    <button
                        type="button"
                        className="rte-slash-item"
                        onClick={() => runSlashCommand("ordered")}
                    >
                        <span className="rte-slash-label">Нумерованный список</span>
                        <span className="rte-slash-desc">Шаги, порядок действий</span>
                    </button>
                    <button
                        type="button"
                        className="rte-slash-item"
                        onClick={() => runSlashCommand("code")}
                    >
                        <span className="rte-slash-label">Кодовый блок</span>
                        <span className="rte-slash-desc">Фрагменты кода, логи</span>
                    </button>
                    <button
                        type="button"
                        className="rte-slash-item"
                        onClick={() => runSlashCommand("quote")}
                    >
                        <span className="rte-slash-label">Цитата</span>
                        <span className="rte-slash-desc">Важные мысли, выдержки</span>
                    </button>
                </div>
            </FloatingMenu>

            <div className="rte-editor-wrap">
                <EditorContent editor={editor} className="rte-editor"/>
            </div>
        </div>
    );
};
