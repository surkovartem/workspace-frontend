import React, {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import type {Task, TaskPriority} from "../types/task";
import {useBodyPageClass} from "../hooks/useBodyPageClass";
import {API_BASE_URL, apiGet, apiPost} from "../config/api";

type LoadStatus = "loading" | "ok" | "error";

interface KanbanColumn {
    id: number;
    code: string;
    title: string;
    position: number;
}

interface BoardDto {
    columns: KanbanColumn[];
    tasksByColumnId: Record<string, Task[]>;
}

interface TaskFormState {
    id?: number;
    columnId: number | null;
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string; // "YYYY-MM-DD" либо ""
}

const defaultForm: TaskFormState = {
    columnId: null,
    title: "",
    description: "",
    priority: "P2",
    dueDate: ""
};

interface TaskComment {
    id: number;
    taskId: number;
    text: string;
    createdAt: string;
}

export const KanbanPage: React.FC = () => {
    useBodyPageClass("kanban-page");

    const [status, setStatus] = useState<LoadStatus>("loading");
    const [board, setBoard] = useState<BoardDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isSyncing, setIsSyncing] = useState(false);

    // Фильтры
    const [priorityFilter, setPriorityFilter] = useState<string>("");
    const [dateFilter, setDateFilter] = useState<string>("");

    // DnD
    const [dragTaskId, setDragTaskId] = useState<number | null>(null);
    const [dragSourceColumnId, setDragSourceColumnId] = useState<number | null>(null);
    const [hoverColumnId, setHoverColumnId] = useState<number | null>(null);
    const [hoverCardId, setHoverCardId] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<"above" | "below" | null>(null);

    // Модалки
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const [createForm, setCreateForm] = useState<TaskFormState>({...defaultForm});
    const [editForm, setEditForm] = useState<TaskFormState>({...defaultForm});

    // Комментарии по задачам
    const [commentsByTaskId, setCommentsByTaskId] = useState<Record<number, TaskComment[]>>({});
    const [newCommentText, setNewCommentText] = useState("");

    // ---- вспомогательное: загрузка комментариев к задачам доски ----

    const loadCommentsForBoard = async (data: BoardDto) => {
        const allTasks: Task[] = Object.values(data.tasksByColumnId ?? {})
            .flat()
            .filter(Boolean);

        const ids = Array.from(new Set(allTasks.map((t) => t.id)));
        if (ids.length === 0) {
            setCommentsByTaskId({});
            return;
        }

        try {
            const entries = await Promise.all(
                ids.map(async (taskId) => {
                    try {
                        const res = await apiGet(`/tasks/api/${taskId}/comments`);
                        return [taskId, res as TaskComment[]] as const;
                    } catch (e) {
                        console.error("Failed to load comments for task", taskId, e);
                        return [taskId, []] as const;
                    }
                })
            );

            const map: Record<number, TaskComment[]> = {};
            for (const [taskId, list] of entries) {
                map[taskId] = list;
            }
            setCommentsByTaskId(map);
        } catch (e) {
            console.error("Failed to load comments for board", e);
        }
    };

    // ---- загрузка доски ----

    const loadBoard = async (withSpinner: boolean) => {
        if (withSpinner) {
            setStatus((prev) => (prev === "ok" ? prev : "loading"));
            setError(null);
        }

        try {
            const resp = await fetch(`${API_BASE_URL}/kanban/api/board`, {
                credentials: "include"
            });
            if (!resp.ok) {
                throw new Error("HTTP " + resp.status);
            }
            const data: BoardDto = await resp.json();
            setBoard(data);
            setStatus("ok");
            setError(null);

            // подтягиваем комментарии ко всем задачам
            await loadCommentsForBoard(data);
        } catch (e) {
            console.error(e);
            if (!board) {
                setStatus("error");
            }
            setError("Не удалось загрузить доску.");
        }
    };

    useEffect(() => {
        void loadBoard(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- вычисление задач по колонкам с учётом фильтров ----

    const columnsWithTasks = useMemo(() => {
        if (!board) return [];

        const now = new Date();

        const parseDate = (str: string | null) => {
            if (!str) return null;
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        };

        return board.columns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((col) => {
                const key = String(col.id);
                const tasks = (board.tasksByColumnId[key] ?? []).filter((t) => {
                    if (priorityFilter && t.priority !== priorityFilter) {
                        return false;
                    }

                    if (!dateFilter) return true;

                    const d = parseDate(t.dueDate);
                    if (!d) return false;

                    const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    const today = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate()
                    );
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    if (dateFilter === "overdue") {
                        return taskDate < today;
                    }
                    if (dateFilter === "today") {
                        return taskDate.getTime() === today.getTime();
                    }
                    if (dateFilter === "tomorrow") {
                        return taskDate.getTime() === tomorrow.getTime();
                    }
                    return true;
                });

                return {column: col, tasks};
            });
    }, [board, priorityFilter, dateFilter]);

    const isInitialLoading = status === "loading" && !board;

    // ---- DnD ----

    const resetHover = () => {
        setHoverColumnId(null);
        setHoverCardId(null);
        setHoverPosition(null);
    };

    const handleCardDragStart = (taskId: number, columnId: number) => {
        setDragTaskId(taskId);
        setDragSourceColumnId(columnId);
        resetHover();
    };

    const handleCardDragEnd = () => {
        setDragTaskId(null);
        setDragSourceColumnId(null);
        resetHover();
    };

    const handleColumnDragOver = (
        e: React.DragEvent<HTMLDivElement>,
        columnId: number
    ) => {
        if (!dragTaskId) return;
        e.preventDefault();
        setHoverColumnId(columnId);
    };

    const handleCardDragOver = (
        e: React.DragEvent<HTMLElement>,
        columnId: number,
        cardId: number
    ) => {
        if (!dragTaskId || dragTaskId === cardId) return;
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const middleY = rect.top + rect.height / 2;

        const position: "above" | "below" =
            e.clientY < middleY ? "above" : "below";

        setHoverColumnId(columnId);
        setHoverCardId(cardId);
        setHoverPosition(position);
    };

    const handleColumnDrop = async (
        e: React.DragEvent<HTMLDivElement>,
        targetColumnId: number
    ) => {
        e.preventDefault();

        if (!board || dragTaskId == null || dragSourceColumnId == null) {
            handleCardDragEnd();
            return;
        }

        const sourceKey = String(dragSourceColumnId);
        const targetKey = String(targetColumnId);

        const originalSourceList = board.tasksByColumnId[sourceKey] ?? [];
        const originalTargetList = board.tasksByColumnId[targetKey] ?? [];

        const fromIndex = originalSourceList.findIndex(
            (t) => t.id === dragTaskId
        );
        if (fromIndex === -1) {
            handleCardDragEnd();
            return;
        }

        let insertIndex = originalTargetList.length;

        if (
            hoverCardId != null &&
            hoverColumnId === targetColumnId &&
            originalTargetList.length > 0
        ) {
            const hoverIndexOriginal = originalTargetList.findIndex(
                (t) => t.id === hoverCardId
            );

            if (hoverIndexOriginal !== -1) {
                insertIndex =
                    hoverPosition === "above"
                        ? hoverIndexOriginal
                        : hoverIndexOriginal + 1;
            }
        }

        if (sourceKey === targetKey && insertIndex > fromIndex) {
            insertIndex -= 1;
        }

        const finalIndexForBackend = insertIndex;

        {
            const newTasksByColumnId: Record<string, Task[]> = {
                ...board.tasksByColumnId
            };

            const newSourceList = [...originalSourceList];
            const [task] = newSourceList.splice(fromIndex, 1);

            if (!task) {
                handleCardDragEnd();
                return;
            }

            if (sourceKey === targetKey) {
                const newTargetList = newSourceList;
                if (finalIndexForBackend < 0) {
                    newTargetList.unshift(task);
                } else if (finalIndexForBackend >= newTargetList.length) {
                    newTargetList.push(task);
                } else {
                    newTargetList.splice(finalIndexForBackend, 0, task);
                }
                newTasksByColumnId[sourceKey] = newTargetList;
            } else {
                const newTargetList = [...originalTargetList];
                if (finalIndexForBackend < 0) {
                    newTargetList.unshift(task);
                } else if (finalIndexForBackend >= newTargetList.length) {
                    newTargetList.push(task);
                } else {
                    newTargetList.splice(finalIndexForBackend, 0, task);
                }

                newTasksByColumnId[sourceKey] = newSourceList;
                newTasksByColumnId[targetKey] = newTargetList;
            }

            setBoard({
                ...board,
                tasksByColumnId: newTasksByColumnId
            });
        }

        const quietReload = async () => {
            try {
                await fetch(
                    `${API_BASE_URL}/kanban/api/task/${dragTaskId}/move?columnId=${targetColumnId}&index=${finalIndexForBackend}`,
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );
                setIsSyncing(true);
                await loadBoard(false);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSyncing(false);
            }
        };

        void quietReload();
        handleCardDragEnd();
    };

    // ---- модалки ----

    const openCreateModal = (columnId: number | null = null) => {
        setCreateForm({
            ...defaultForm,
            columnId: columnId ?? (board?.columns[0]?.id ?? null)
        });
        setIsCreateOpen(true);
    };

    const openEditModal = (task: Task, columnId: number) => {
        setEditForm({
            id: task.id,
            columnId,
            title: task.title,
            description: task.description ?? "",
            priority: task.priority,
            dueDate: task.dueDate ?? ""
        });
        setNewCommentText("");
        setIsEditOpen(true);
    };

    const closeAllModals = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setNewCommentText("");
    };

    // ---- загрузка доски тихо ----

    const refreshQuietly = async () => {
        setIsSyncing(true);
        try {
            await loadBoard(false);
        } finally {
            setIsSyncing(false);
        }
    };

    // ---- CRUD задач ----

    const handleCreateSave = async () => {
        if (!createForm.columnId) {
            alert("Не выбрана колонка");
            return;
        }
        const payload = {
            columnId: createForm.columnId,
            title: createForm.title.trim(),
            description: createForm.description.trim() || null,
            priority: createForm.priority,
            dueDate: createForm.dueDate || null
        };

        try {
            const resp = await fetch(`${API_BASE_URL}/kanban/api/task`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const text = await resp.text();
                console.error("Create task failed", text);
                alert("Не удалось создать задачу (" + resp.status + ")");
                return;
            }
            closeAllModals();
            await refreshQuietly();
        } catch (e) {
            console.error(e);
            alert("Ошибка при создании задачи");
        }
    };

    const handleEditSave = async () => {
        if (!editForm.id) return;

        const payload = {
            title: editForm.title.trim(),
            description: editForm.description.trim() || null,
            priority: editForm.priority,
            dueDate: editForm.dueDate || null
        };

        try {
            const resp = await fetch(
                `${API_BASE_URL}/kanban/api/task/${editForm.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                }
            );
            if (!resp.ok) {
                const text = await resp.text();
                console.error("Update task failed", text);
                alert("Не удалось сохранить задачу (" + resp.status + ")");
                return;
            }
            closeAllModals();
            await refreshQuietly();
        } catch (e) {
            console.error(e);
            alert("Ошибка при сохранении задачи");
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        const ok = window.confirm("Точно удалить задачу?");
        if (!ok) return;

        try {
            const resp = await fetch(
                `${API_BASE_URL}/kanban/api/task/${taskId}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );
            if (!resp.ok) {
                const text = await resp.text();
                console.error("Delete task failed", text);
                alert("Не удалось удалить задачу (" + resp.status + ")");
                return;
            }
            await refreshQuietly();
        } catch (e) {
            console.error(e);
            alert("Ошибка при удалении задачи");
        }
    };

    // ---- Архивирование задачи ----

    const handleArchiveTask = async (taskId: number) => {
        const ok = window.confirm("Отправить задачу в архив?");
        if (!ok) return;

        try {
            // можно через apiPost, чтобы не дублировать fetch
            await apiPost(`/kanban/api/task/${taskId}/archive`, {});
            await refreshQuietly();
        } catch (e) {
            console.error(e);
            alert("Не удалось архивировать задачу");
        }
    };

    // ---- CRUD комментариев ----

    const handleAddComment = async () => {
        if (!editForm.id) return;

        const text = newCommentText.trim();
        if (!text) return;

        try {
            const res = await apiPost(
                `/tasks/api/${editForm.id}/comments`,
                {text}
            );
            const created = res as TaskComment;

            setCommentsByTaskId((prev) => {
                const existing = prev[editForm.id!] ?? [];
                return {
                    ...prev,
                    [editForm.id!]: [...existing, created]
                };
            });
            setNewCommentText("");
        } catch (e) {
            console.error(e);
            alert("Не удалось добавить комментарий");
        }
    };

    const handleDeleteComment = async (taskId: number, commentId: number) => {
        try {
            const resp = await fetch(
                `${API_BASE_URL}/tasks/api/${taskId}/comments/${commentId}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );
            if (!resp.ok) {
                const text = await resp.text();
                console.error("Delete comment failed", text);
                alert("Не удалось удалить комментарий (" + resp.status + ")");
                return;
            }

            setCommentsByTaskId((prev) => {
                const copy = {...prev};
                copy[taskId] = (copy[taskId] ?? []).filter((c) => c.id !== commentId);
                return copy;
            });
        } catch (e) {
            console.error(e);
            alert("Ошибка при удалении комментария");
        }
    };

    // ---- рендер ----

    return (
        <div className="kanban-page">
            <ThemeToggle/>

            <div className="wrap-wide">
                <div className="head-line">
                    <div className="brand-pill">
                        <span className="brand-dot"/>
                        <span className="brand-name">Workspace</span>
                        <span>• канбан-доска</span>
                    </div>

                    <div style={{display: "flex", alignItems: "center", gap: 12}}>
                        {isSyncing && (
                            <span className="muted" style={{fontSize: 12}}>
                                Сохраняю изменения…
                            </span>
                        )}
                        <Link to="/" className="link">
                            <span>⟵</span>
                            <span>К Workspace</span>
                        </Link>
                    </div>
                </div>

                <h1>Личная канбан-доска</h1>
                <p className="sub">
                    Простая доска для твоих задач. Дальше на этих данных можно строить матрицу
                    Эйзенхауэра и аналитику.
                </p>

                {/* Тулбар фильтров */}
                <div className="kanban-toolbar">
                    <div className="toolbar-group">
                        <label className="toolbar-label" htmlFor="priorityFilter">
                            Приоритет
                        </label>
                        <select
                            id="priorityFilter"
                            className="toolbar-select"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="">Все</option>
                            <option value="P0">🔥P0 — срочное реагирование</option>
                            <option value="P1">🔴P1 — важно и срочно</option>
                            <option value="P2">🟠P2 — важно, не срочно</option>
                            <option value="P3">🟡P3 — срочно, не важно</option>
                            <option value="P4">⚪P4 — не срочно, не важно</option>
                        </select>
                    </div>

                    <div className="toolbar-group">
                        <label className="toolbar-label" htmlFor="dateFilter">
                            Срок
                        </label>
                        <select
                            id="dateFilter"
                            className="toolbar-select"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="">Все</option>
                            <option value="overdue">Просрочено</option>
                            <option value="today">Сегодня</option>
                            <option value="tomorrow">Завтра</option>
                        </select>
                    </div>

                    <div className="toolbar-spacer"/>

                    <button
                        type="button"
                        className="btn-primary kanban-new-task-btn"
                        onClick={() => openCreateModal(null)}
                    >
                        + Новая задача
                    </button>
                </div>

                {error && (
                    <p className="error">{error}</p>
                )}

                {isInitialLoading && (
                    <p className="muted" style={{marginTop: 16}}>
                        Загружаю доску…
                    </p>
                )}

                {!isInitialLoading && board && (
                    <div className="board">
                        {columnsWithTasks.map(({column, tasks}) => {
                            const colClasses = ["column"];
                            if (column.code === "TODO") colClasses.push("column-todo");
                            if (column.code === "IN_PROGRESS") colClasses.push("column-inprogress");
                            if (column.code === "DONE") colClasses.push("column-done");
                            if (hoverColumnId === column.id) colClasses.push("drag-over");

                            return (
                                <div
                                    key={column.id}
                                    className={colClasses.join(" ")}
                                    data-column-id={column.id}
                                    onDragOver={(e) => handleColumnDragOver(e, column.id)}
                                    onDrop={(e) => handleColumnDrop(e, column.id)}
                                >
                                    <div className="column-header">
                                        <div className="column-title">
                                            {column.title}
                                        </div>
                                    </div>

                                    <div className="column-tasks">
                                        {tasks.map((t) => {
                                            const isDropTop =
                                                hoverCardId === t.id &&
                                                hoverColumnId === column.id &&
                                                hoverPosition === "above";

                                            const isDropBottom =
                                                hoverCardId === t.id &&
                                                hoverColumnId === column.id &&
                                                hoverPosition === "below";

                                            const comments = commentsByTaskId[t.id] ?? [];

                                            return (
                                                <article
                                                    key={t.id}
                                                    className={
                                                        "task-card" +
                                                        (dragTaskId === t.id ? " dragging" : "") +
                                                        (isDropTop ? " drop-target-top" : "") +
                                                        (isDropBottom ? " drop-target-bottom" : "")
                                                    }
                                                    draggable
                                                    onDragStart={() =>
                                                        handleCardDragStart(t.id, column.id)
                                                    }
                                                    onDragEnd={handleCardDragEnd}
                                                    onDragOver={(e) =>
                                                        handleCardDragOver(e, column.id, t.id)
                                                    }
                                                    data-task-id={t.id}
                                                    data-task-due-date={t.dueDate ?? ""}
                                                    data-task-priority={t.priority}
                                                    onClick={() => openEditModal(t, column.id)}
                                                >
                                                    {/* Верхняя строка: приоритет + действия */}
                                                    <div className="task-card-top">
                                                        <div className="task-priority-row">
                                                            <span className="task-priority-chip">
                                                                {t.priority === "P0" &&
                                                                    "🔥P0 — срочное реагирование"}
                                                                {t.priority === "P1" &&
                                                                    "🔴P1 — важно и срочно"}
                                                                {t.priority === "P2" &&
                                                                    "🟠P2 — важно, не срочно"}
                                                                {t.priority === "P3" &&
                                                                    "🟡P3 — срочно, не важно"}
                                                                {t.priority === "P4" &&
                                                                    "⚪P4 — не срочно, не важно"}
                                                            </span>
                                                        </div>
                                                        <div className="task-actions">
                                                            <button
                                                                type="button"
                                                                className="task-archive-button"
                                                                title="В архив"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    void handleArchiveTask(t.id);
                                                                }}
                                                            >
                                                                📦
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="task-delete-button"
                                                                title="Удалить"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    void handleDeleteTask(t.id);
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Заголовок */}
                                                    <div className="task-title">{t.title}</div>

                                                    {/* Описание */}
                                                    {t.description && (
                                                        <div className="task-body">
                                                            {t.description}
                                                        </div>
                                                    )}

                                                    {/* Комментарии под описанием */}
                                                    {comments.length > 0 && (
                                                        <div className="task-comments">
                                                            {comments
                                                                .slice(-3)
                                                                .map((c) => (
                                                                    <div
                                                                        key={c.id}
                                                                        className="task-comment-line"
                                                                    >
                                                                        <span className="task-comment-bullet">
                                                                            •
                                                                        </span>
                                                                        <span className="task-comment-text">
                                                                            {c.text}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            {comments.length > 3 && (
                                                                <div className="task-comments-more">
                                                                    + ещё {comments.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Метаданные */}
                                                    <div className="task-meta">
                                                        <div className="task-meta-left">
                                                            {t.dueDate && (
                                                                <span className="task-chip task-due-chip">
                                                                    ⏱ <span>{t.dueDate}</span>
                                                                </span>
                                                            )}
                                                            {t.completedAt && (
                                                                <span className="task-chip">
                                                                    ✔ <span>{t.completedAt}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-secondary column-add-btn"
                                        onClick={() => openCreateModal(column.id)}
                                    >
                                        + Добавить
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Модалка СОЗДАНИЯ */}
            {isCreateOpen && (
                <div className="modal-backdrop" style={{display: "flex"}}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Новая задача</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeAllModals}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-form">
                            <label className="modal-label">
                                Колонка
                                <select
                                    value={createForm.columnId ?? ""}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            columnId: e.target.value
                                                ? Number(e.target.value)
                                                : null
                                        }))
                                    }
                                >
                                    {board?.columns.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="modal-label">
                                Приоритет
                                <select
                                    value={createForm.priority}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            priority: e.target.value as TaskPriority
                                        }))
                                    }
                                >
                                    <option value="P0">
                                        🔥P0 — срочное реагирование
                                    </option>
                                    <option value="P1">
                                        🔴P1 — важно и срочно
                                    </option>
                                    <option value="P2">
                                        🟠P2 — важно, не срочно
                                    </option>
                                    <option value="P3">
                                        🟡P3 — срочно, не важно
                                    </option>
                                    <option value="P4">
                                        ⚪P4 — не срочно, не важно
                                    </option>
                                </select>
                            </label>

                            <label className="modal-label">
                                Заголовок
                                <input
                                    type="text"
                                    required
                                    value={createForm.title}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            title: e.target.value
                                        }))
                                    }
                                />
                            </label>

                            <label className="modal-label">
                                Описание
                                <textarea
                                    rows={4}
                                    placeholder="Опционально"
                                    value={createForm.description}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            description: e.target.value
                                        }))
                                    }
                                />
                            </label>

                            <label className="modal-label inline">
                                Дата
                                <input
                                    type="date"
                                    value={createForm.dueDate}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            dueDate: e.target.value
                                        }))
                                    }
                                />
                            </label>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={closeAllModals}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleCreateSave}
                                >
                                    Создать
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка РЕДАКТИРОВАНИЯ */}
            {isEditOpen && (
                <div className="modal-backdrop" style={{display: "flex"}}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Редактировать задачу</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeAllModals}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-form">
                            <label className="modal-label">
                                Приоритет
                                <select
                                    value={editForm.priority}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            priority: e.target.value as TaskPriority
                                        }))
                                    }
                                >
                                    <option value="P0">
                                        🔥P0 — срочное реагирование
                                    </option>
                                    <option value="P1">
                                        🔴P1 — важно и срочно
                                    </option>
                                    <option value="P2">
                                        🟠P2 — важно, не срочно
                                    </option>
                                    <option value="P3">
                                        🟡P3 — срочно, не важно
                                    </option>
                                    <option value="P4">
                                        ⚪P4 — не срочно, не важно
                                    </option>
                                </select>
                            </label>

                            <label className="modal-label">
                                Заголовок
                                <input
                                    type="text"
                                    required
                                    value={editForm.title}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            title: e.target.value
                                        }))
                                    }
                                />
                            </label>

                            <label className="modal-label">
                                Описание
                                <textarea
                                    rows={4}
                                    placeholder="Опционально"
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            description: e.target.value
                                        }))
                                    }
                                />
                            </label>

                            <label className="modal-label inline">
                                Дата
                                <input
                                    type="date"
                                    value={editForm.dueDate}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            dueDate: e.target.value
                                        }))
                                    }
                                />
                            </label>

                            {/* Блок комментариев — сразу после даты */}
                            {editForm.id && (
                                <div className="modal-comments">
                                    <div className="modal-comments-title">
                                        Комментарии
                                    </div>

                                    <div className="modal-comments-list">
                                        {(
                                            commentsByTaskId[editForm.id] ?? []
                                        ).length === 0 && (
                                            <div className="modal-comments-empty muted">
                                                Пока нет комментариев.
                                            </div>
                                        )}

                                        {(commentsByTaskId[editForm.id] ?? []).map((c) => (
                                            <div
                                                key={c.id}
                                                className="modal-comment-item"
                                            >
                                                <div className="modal-comment-text">
                                                    {c.text}
                                                </div>
                                                <div className="modal-comment-meta">
                                                    <span className="modal-comment-date">
                                                        {new Date(c.createdAt)
                                                            .toLocaleString()}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="modal-comment-delete"
                                                        title="Удалить комментарий"
                                                        onClick={() =>
                                                            handleDeleteComment(
                                                                editForm.id!,
                                                                c.id
                                                            )
                                                        }
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="modal-comments-add">
                                        <textarea
                                            rows={3}
                                            placeholder="Новый комментарий…"
                                            value={newCommentText}
                                            onChange={(e) =>
                                                setNewCommentText(e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="btn-primary modal-comments-submit"
                                            onClick={handleAddComment}
                                        >
                                            Добавить комментарий
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={closeAllModals}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleEditSave}
                                >
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
