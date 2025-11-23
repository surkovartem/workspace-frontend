// src/pages/NotesPage.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {useBodyPageClass} from "../hooks/useBodyPageClass";
import {RichTextEditor} from "../components/notes/RichTextEditor";
import type {Note} from "../types/note";
import {API_BASE_URL} from "../config/api";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy
} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";

import "../styles/notes.css";

type LoadStatus = "loading" | "ok" | "error";
type ModalMode = "create" | "edit";
type Scope = "active" | "archived";

interface NoteDraft {
    id?: number;
    title: string;
    contentHtml: string;
    color: string;
    tagsInput: string;
}

const COLOR_OPTIONS: string[] = [
    "#fef3c7",
    "#bfdbfe",
    "#bbf7d0",
    "#fecaca",
    "#e9d5ff",
    "#f5f5f5",
    "#fee2e2",
    "#dbeafe",
    "#dcfce7"
];

const defaultDraft: NoteDraft = {
    title: "",
    contentHtml: "",
    color: COLOR_OPTIONS[0],
    tagsInput: ""
};

interface SortableNoteCardProps {
    note: Note;
    onOpen: (note: Note) => void;
    onArchive: (note: Note) => void;
    dndEnabled: boolean;
}

const SortableNoteCard: React.FC<SortableNoteCardProps> = ({
                                                               note,
                                                               onOpen,
                                                               onArchive,
                                                               dndEnabled
                                                           }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({id: note.id});

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
        cursor: dndEnabled ? "grab" : "default"
    };

    const handleCardClick = () => {
        if (!isDragging) {
            onOpen(note);
        }
    };

    const dragProps = dndEnabled ? {...attributes, ...listeners} : {};

    return (
        <div
            ref={setNodeRef}
            style={{...style, background: note.color}}
            className="note-card"
            onClick={handleCardClick}
            {...dragProps}
        >
            <div className="note-card-inner">
                <div className="note-card-header">
                    <h3 className="note-title">{note.title}</h3>
                    {note.archived && (
                        <span className="note-pill-archived">
                            Архив
                        </span>
                    )}
                </div>

                <div
                    className="note-text"
                    dangerouslySetInnerHTML={{__html: note.contentHtml}}
                />

                {note.tags.length > 0 && (
                    <div className="note-tags">
                        {note.tags.map((t) => (
                            <button
                                type="button"
                                key={t}
                                className="note-tag-chip"
                            >
                                #{t}
                            </button>
                        ))}
                    </div>
                )}

                <div className="note-card-footer">
                    {!note.archived && (
                        <button
                            type="button"
                            className="note-archive-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onArchive(note);
                            }}
                        >
                            Архивировать
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const NotesPage: React.FC = () => {
    useBodyPageClass("notes-page");

    const [status, setStatus] = useState<LoadStatus>("loading");
    const [activeNotes, setActiveNotes] = useState<Note[]>([]);
    const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const [scope, setScope] = useState<Scope>("active");
    const [search, setSearch] = useState<string>("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("create");
    const [draft, setDraft] = useState<NoteDraft>(defaultDraft);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {distance: 5}
        })
    );

    // ---------- ЗАГРУЗКА ----------

    const loadNotes = async (withSpinner: boolean) => {
        if (withSpinner) {
            setStatus(prev => (prev === "ok" ? prev : "loading"));
            setError(null);
        }

        try {
            const [activeResp, archivedResp] = await Promise.all([
                fetch(`${API_BASE_URL}/notes/api`, {credentials: "include"}),
                fetch(`${API_BASE_URL}/notes/api/archived`, {credentials: "include"})
            ]);

            if (!activeResp.ok || !archivedResp.ok) {
                throw new Error(
                    `HTTP active=${activeResp.status}, archived=${archivedResp.status}`
                );
            }

            const activeData: any[] = await activeResp.json();
            const archivedData: any[] = await archivedResp.json();

            const mapNote = (n: any): Note => ({
                id: n.id,
                title: n.title,
                contentHtml: n.contentHtml,
                color: n.color ?? COLOR_OPTIONS[0],
                tags: Array.isArray(n.tags) ? n.tags : [],
                archived: Boolean(n.archived),
                position: n.position ?? 0,
                createdAt: n.createdAt ?? "",
                updatedAt: n.updatedAt ?? null
            });

            setActiveNotes(activeData.map(mapNote));
            setArchivedNotes(archivedData.map(mapNote));

            setStatus("ok");
            setError(null);
        } catch (e) {
            console.error(e);
            if (activeNotes.length === 0 && archivedNotes.length === 0) {
                setStatus("error");
            }
            setError("Не удалось загрузить заметки.");
        }
    };

    useEffect(() => {
        void loadNotes(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isInitialLoading =
        status === "loading" && activeNotes.length === 0 && archivedNotes.length === 0;

    const refreshQuietly = async () => {
        setIsSyncing(true);
        try {
            await loadNotes(false);
        } finally {
            setIsSyncing(false);
        }
    };

    // ---------- МОДАЛКА ----------

    const openCreateModal = () => {
        setModalMode("create");
        setDraft(defaultDraft);
        setIsModalOpen(true);
    };

    const openEditModal = (note: Note) => {
        setModalMode("edit");
        setDraft({
            id: note.id,
            title: note.title,
            contentHtml: note.contentHtml,
            color: note.color,
            tagsInput: note.tags.map(t => `#${t}`).join(" ")
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target;
        setDraft(prev => ({...prev, title: value}));
    };

    const handleColorChange = (color: string) => {
        setDraft(prev => ({...prev, color}));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {value} = e.target;
        setDraft(prev => ({...prev, tagsInput: value}));
    };

    const handleContentChange = (html: string) => {
        setDraft(prev => ({...prev, contentHtml: html}));
    };

    const addTagToDraft = (tag: string) => {
        setDraft(prev => {
            const raw = prev.tagsInput || "";
            const existing = raw
                .split(/\s+/)
                .map(t => t.replace(/^#/, "").trim())
                .filter(Boolean);
            if (existing.includes(tag)) {
                return prev;
            }
            const newInput = (raw.trim() + " #" + tag).trim();
            return {...prev, tagsInput: newInput};
        });
    };

    // ---------- СОХРАНЕНИЕ ----------

    const stripHtml = (html: string): string =>
        html.replace(/<style([\s\S]*?)<\/style>/gi, "")
            .replace(/<script([\s\S]*?)<\/script>/gi, "")
            .replace(/<\/(.*?)>/gi, "")
            .replace(/<(.*?)>/gi, "")
            .replace(/\s+/g, " ")
            .trim();

    const handleSave = async () => {
        const tags = draft.tagsInput
            .split(/\s+/)
            .map(t => t.replace(/^#/, "").trim())
            .filter(Boolean);

        const payload = {
            title: draft.title.trim(),
            contentHtml: draft.contentHtml,
            color: draft.color,
            tags,
            archived: false
        };

        try {
            let resp: Response;

            if (modalMode === "create") {
                resp = await fetch(`${API_BASE_URL}/notes/api`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                });
            } else {
                if (!draft.id) return;
                resp = await fetch(`${API_BASE_URL}/notes/api/${draft.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                });
            }

            if (!resp.ok) {
                const text = await resp.text();
                console.error("Save note failed", text);
                alert("Не удалось сохранить заметку (" + resp.status + ")");
                return;
            }

            closeModal();
            await refreshQuietly();
        } catch (e) {
            console.error(e);
            alert("Ошибка при сохранении заметки");
        }
    };

    const isSaveDisabled =
        draft.title.trim().length === 0 &&
        stripHtml(draft.contentHtml).length === 0;

    // ---------- АРХИВ ----------

    const handleArchive = async (note: Note) => {
        try {
            const resp = await fetch(`${API_BASE_URL}/notes/api/${note.id}/archive`, {
                method: "POST",
                credentials: "include"
            });

            if (!resp.ok) {
                const text = await resp.text();
                console.error("Archive note failed", text);
                alert("Не удалось архивировать заметку (" + resp.status + ")");
                return;
            }

            await refreshQuietly();
        } catch (e) {
            console.error(e);
            alert("Ошибка при архивировании заметки");
        }
    };

    // ---------- ФИЛЬТРЫ / ПОИСК ----------

    const currentNotes = scope === "active" ? activeNotes : archivedNotes;

    const allTags = useMemo(() => {
        const set = new Set<string>();
        activeNotes.concat(archivedNotes).forEach(n => {
            n.tags.forEach(t => set.add(t));
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [activeNotes, archivedNotes]);

    const filteredNotes = useMemo(() => {
        let list = currentNotes;

        if (selectedTag) {
            list = list.filter(n => n.tags.includes(selectedTag));
        }

        if (search.trim().length > 0) {
            const q = search.trim().toLowerCase();
            list = list.filter(n => {
                const title = n.title.toLowerCase();
                const text = stripHtml(n.contentHtml).toLowerCase();
                return title.includes(q) || text.includes(q);
            });
        }

        return list;
    }, [currentNotes, selectedTag, search]);

    // ---------- ТЕГ-СУГГЕСТЫ ИЗ ТЕКСТА ----------

    const tagSuggestions = useMemo(() => {
        const text = stripHtml(draft.contentHtml).toLowerCase();
        if (!text) return [];

        const words = text
            .split(/[^a-zа-я0-9ё]+/i)
            .map(w => w.trim())
            .filter(w => w.length >= 4);

        const freq = new Map<string, number>();
        for (const w of words) {
            freq.set(w, (freq.get(w) ?? 0) + 1);
        }

        const candidates = Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([w]) => w);

        const existing = new Set(
            (draft.tagsInput || "")
                .split(/\s+/)
                .map(t => t.replace(/^#/, "").trim().toLowerCase())
                .filter(Boolean)
        );

        const result: string[] = [];
        for (const w of candidates) {
            if (existing.has(w)) continue;
            result.push(w);
            if (result.length >= 6) break;
        }

        return result;
    }, [draft.contentHtml, draft.tagsInput]);

    // ---------- DnD ----------

    const handleDragEnd = async (event: DragEndEvent) => {
        if (scope !== "active") return;

        const {active, over} = event;
        if (!over || active.id === over.id) return;

        const oldIndex = filteredNotes.findIndex((n) => n.id === active.id);
        const newIndex = filteredNotes.findIndex((n) => n.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const idsFiltered = filteredNotes.map(n => n.id);
        const reorderedIds = arrayMove(idsFiltered, oldIndex, newIndex);

        const idToNote = new Map(activeNotes.map(n => [n.id, n]));
        const reorderedActive: Note[] = [];

        reorderedIds.forEach(id => {
            const note = idToNote.get(id);
            if (note) reorderedActive.push(note);
        });

        activeNotes.forEach(n => {
            if (!reorderedIds.includes(n.id)) {
                reorderedActive.push(n);
            }
        });

        setActiveNotes(reorderedActive);

        try {
            await fetch(`${API_BASE_URL}/notes/api/reorder`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    ids: reorderedActive.map((n) => n.id)
                })
            });
        } catch (e) {
            console.error(e);
        }
    };

    // ---------- RENDER ----------

    return (
        <div className="notes-page">
            <ThemeToggle/>

            <div className="wrap-wide">
                <div className="head-line notes-head-line">
                    <div className="brand-pill">
                        <span className="brand-dot"/>
                        <span className="brand-name">Workspace</span>
                        <span>• заметки</span>
                    </div>

                    <div className="notes-head-actions">
                        {isSyncing && (
                            <span className="muted" style={{fontSize: 12}}>
                                Синхронизирую…
                            </span>
                        )}
                        <Link to="/" className="back-link">
                            <span>⟵</span>
                            <span>К рабочему пространству</span>
                        </Link>
                    </div>
                </div>

                <h1>Мои заметки</h1>
                <p className="sub">
                    Богатый редактор, цветные стикеры, теги, поиск и сортировка. Активные отдельно от архива.
                </p>

                <div className="notes-toolbar">
                    <div className="notes-scope-toggle">
                        <button
                            type="button"
                            className={
                                "notes-scope-btn" + (scope === "active" ? " active" : "")
                            }
                            onClick={() => setScope("active")}
                        >
                            Активные
                        </button>
                        <button
                            type="button"
                            className={
                                "notes-scope-btn" + (scope === "archived" ? " active" : "")
                            }
                            onClick={() => setScope("archived")}
                        >
                            Архив
                        </button>
                    </div>

                    <div className="notes-search-box">
                        <input
                            type="text"
                            placeholder="Поиск по заголовку и тексту…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {allTags.length > 0 && (
                    <div className="notes-tags-filter">
                        <button
                            type="button"
                            className={
                                "notes-tag-filter-chip" + (selectedTag === null ? " active" : "")
                            }
                            onClick={() => setSelectedTag(null)}
                        >
                            Все теги
                        </button>
                        {allTags.map((t) => (
                            <button
                                key={t}
                                type="button"
                                className={
                                    "notes-tag-filter-chip" +
                                    (selectedTag === t ? " active" : "")
                                }
                                onClick={() => setSelectedTag(t)}
                            >
                                #{t}
                            </button>
                        ))}
                    </div>
                )}

                {error && (
                    <p className="error">{error}</p>
                )}

                {isInitialLoading && (
                    <p className="muted">Загружаю заметки…</p>
                )}

                {!isInitialLoading && status === "ok" && (
                    <div className="notes-grid">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredNotes.map(n => n.id)}
                                strategy={rectSortingStrategy}
                            >
                                {filteredNotes.map((n) => (
                                    <SortableNoteCard
                                        key={n.id}
                                        note={n}
                                        onOpen={openEditModal}
                                        onArchive={handleArchive}
                                        dndEnabled={scope === "active"}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        <div
                            className="note-create-btn"
                            onClick={openCreateModal}
                        >
                            + Создать заметку
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-backdrop open">
                    <div className="modal notes-modal">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {modalMode === "create"
                                    ? "Новая заметка"
                                    : "Редактировать заметку"}
                            </h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeModal}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-form notes-modal-form">
                            <label className="modal-label">
                                Заголовок
                                <input
                                    type="text"
                                    value={draft.title}
                                    onChange={handleTitleChange}
                                    placeholder="Например: План на неделю"
                                />
                            </label>

                            <div className="notes-modal-row">
                                <div className="notes-color-block">
                                    <div className="notes-label">Цвет стикера</div>
                                    <div className="notes-color-row">
                                        {COLOR_OPTIONS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                className={
                                                    "notes-color-swatch" +
                                                    (draft.color === c ? " selected" : "")
                                                }
                                                style={{background: c}}
                                                onClick={() => handleColorChange(c)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="notes-editor-block">
                                <div className="notes-label">Текст</div>
                                <RichTextEditor
                                    value={draft.contentHtml}
                                    onChange={handleContentChange}
                                />
                                <div className="muted" style={{fontSize: 11, marginTop: 4}}>
                                    Подсказка: нажми <code>/</code> в пустой строке, чтобы открыть меню
                                    команд (заголовки, списки, код, цитаты).
                                </div>
                            </div>

                            <label className="modal-label">
                                Хэштеги
                                <input
                                    type="text"
                                    value={draft.tagsInput}
                                    onChange={handleTagsChange}
                                    placeholder="#work #idea #focus"
                                />
                            </label>

                            {tagSuggestions.length > 0 && (
                                <div className="notes-tags-filter" style={{marginTop: 4}}>
                                    {tagSuggestions.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className="notes-tag-filter-chip"
                                            onClick={() => addTagToDraft(tag)}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={closeModal}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={isSaveDisabled}
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
