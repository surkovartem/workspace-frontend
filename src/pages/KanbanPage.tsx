// src/pages/KanbanPage.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import { useBodyPageClass } from "../hooks/useBodyPageClass";

type KanbanPriority = "P0" | "P1" | "P2" | "P3" | "P4";

interface KanbanColumn {
    id: number;
    code: string;
    title: string;
}

interface KanbanTask {
    id: number;
    title: string;
    description: string | null;
    priority: KanbanPriority;
    dueDate: string | null;
    completedAt: string | null;
    columnId: number;
}

interface KanbanTaskDto {
    id: number;
    title: string;
    description: string | null;
    priority: KanbanPriority | null;
    dueDate: string | null;
    completedAt: string | null;
}

interface BoardDto {
    columns: KanbanColumn[];
    // JSON от Map<Long, List<Task>>
    tasksByColumnId: Record<string, KanbanTaskDto[]>;
}

type LoadState =
    | { status: "loading" }
    | { status: "ok"; columns: KanbanColumn[]; tasks: KanbanTask[] }
    | { status: "error" };

type DateFilter = "" | "overdue" | "today" | "tomorrow";

interface TaskFormState {
    id?: number;
    columnId: number | null;
    title: string;
    description: string;
    priority: KanbanPriority;
    dueDate: string; // YYYY-MM-DD или ""
}

const defaultForm: TaskFormState = {
    columnId: null,
    title: "",
    description: "",
    priority: "P2",
    dueDate: ""
};

export const KanbanPage: React.FC = () => {
    useBodyPageClass("kanban-page");
    const [state, setState] = useState<LoadState>({status: "loading"});

    const [priorityFilter, setPriorityFilter] = useState<KanbanPriority | "">(
        ""
    );
    const [dateFilter, setDateFilter] = useState<DateFilter>("");

    const [dragTaskId, setDragTaskId] = useState<number | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [createForm, setCreateForm] = useState<TaskFormState>({
        ...defaultForm
    });
    const [editForm, setEditForm] = useState<TaskFormState>({
        ...defaultForm
    });
    const [modalError, setModalError] = useState<string | null>(null);

    // ------------ загрузка доски ------------

    const loadBoard = () => {
        setState({status: "loading"});

        fetch("/kanban/api/board", {
            credentials: "include"
        })
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error("HTTP " + resp.status);
                }
                return resp.json();
            })
            .then((data: BoardDto) => {
                const columns = data.columns ?? [];

                const tasks: KanbanTask[] = [];
                if (data.tasksByColumnId) {
                    Object.entries(data.tasksByColumnId).forEach(
                        ([columnIdStr, list]) => {
                            const columnId = Number(columnIdStr);
                            (list || []).forEach((t) => {
                                tasks.push({
                                    id: t.id,
                                    title: t.title,
                                    description: t.description ?? null,
                                    priority: (t.priority as KanbanPriority) ?? "P2",
                                    dueDate: t.dueDate ?? null,
                                    completedAt: t.completedAt ?? null,
                                    columnId
                                });
                            });
                        }
                    );
                }

                setState({status: "ok", columns, tasks});
            })
            .catch(() => {
                setState({status: "error"});
            });
    };

    useEffect(() => {
        loadBoard();
    }, []);

    // ------------ drag & drop ------------

    const handleCardDragStart = (taskId: number) => () => {
        setDragTaskId(taskId);
    };

    const handleCardDragEnd = () => {
        setDragTaskId(null);
    };

    const handleCardDropOnCard =
        (columnId: number, targetTaskId: number) =>
            (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                if (dragTaskId == null) return;
                if (state.status !== "ok") return;

                const tasksInColumn = state.tasks.filter(
                    (t) => t.columnId === columnId
                );
                const index = tasksInColumn.findIndex(
                    (t) => t.id === targetTaskId
                );
                const targetIndex = index < 0 ? tasksInColumn.length : index;

                sendMoveRequest(dragTaskId, columnId, targetIndex);
            };

    const handleColumnDrop =
        (columnId: number) =>
            (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                if (dragTaskId == null) return;
                if (state.status !== "ok") return;

                const tasksInColumn = state.tasks.filter(
                    (t) => t.columnId === columnId
                );
                const targetIndex = tasksInColumn.length;

                sendMoveRequest(dragTaskId, columnId, targetIndex);
            };

    const sendMoveRequest = (
        taskId: number,
        columnId: number,
        index: number
    ) => {
        fetch(
            `/kanban/api/task/${encodeURIComponent(
                taskId
            )}/move?columnId=${encodeURIComponent(
                columnId
            )}&index=${encodeURIComponent(index)}`,
            {
                method: "POST",
                credentials: "include"
            }
        )
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error("HTTP " + resp.status);
                }
                loadBoard();
            })
            .catch((err) => {
                console.error("Move failed", err);
            });
    };

    // ------------ фильтры ------------

    const filtered = useMemo(() => {
        if (state.status !== "ok") return [];
        const tasks = state.tasks;

        const today = new Date();
        const todayOnly = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );
        const oneDayMs = 24 * 60 * 60 * 1000;
        const tomorrowOnly = new Date(todayOnly.getTime() + oneDayMs);

        const parseDateOnly = (str: string | null) => {
            if (!str) return null;
            const parts = str.split("-");
            if (parts.length !== 3) return null;
            const [y, m, d] = parts.map(Number);
            if (!y || !m || !d) return null;
            return new Date(y, m - 1, d);
        };

        return tasks.filter((t) => {
            if (priorityFilter && t.priority !== priorityFilter) {
                return false;
            }

            if (!dateFilter) return true;

            const d = parseDateOnly(t.dueDate);
            if (!d) return false;

            if (dateFilter === "overdue") {
                return d < todayOnly;
            }
            if (dateFilter === "today") {
                return d.getTime() === todayOnly.getTime();
            }
            if (dateFilter === "tomorrow") {
                return d.getTime() === tomorrowOnly.getTime();
            }
            return true;
        });
    }, [state, priorityFilter, dateFilter]);

    const columns: KanbanColumn[] =
        state.status === "ok" ? state.columns : [];

    const tasksByColumn = (columnId: number): KanbanTask[] => {
        if (state.status !== "ok") return [];
        const base = filtered.length ? filtered : state.tasks;
        return base.filter((t) => t.columnId === columnId);
    };

    const closeAllModals = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setModalError(null);
    };

    // ------------ открытие модалок ------------

    const openCreateForColumn = (columnId: number) => () => {
        setCreateForm({
            ...defaultForm,
            columnId,
            priority: "P2"
        });
        setModalError(null);
        setIsCreateOpen(true);
    };

    const openEditTask = (task: KanbanTask) => {
        setEditForm({
            id: task.id,
            columnId: task.columnId,
            title: task.title,
            description: task.description ?? "",
            priority: task.priority ?? "P2",
            dueDate: task.dueDate ?? ""
        });
        setModalError(null);
        setIsEditOpen(true);
    };

    // ------------ сохранение / удаление ------------

    const handleCreateSave = async () => {
        if (!createForm.title.trim()) {
            setModalError("Заголовок обязателен");
            return;
        }
        if (!createForm.columnId) {
            setModalError("Не выбрана колонка");
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
            const resp = await fetch("/kanban/api/task", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            let json: any = null;
            try {
                json = await resp.json();
            } catch {
                // может не быть тела
            }

            if (!resp.ok) {
                const msg =
                    json && json.error
                        ? String(json.error)
                        : "Не удалось создать задачу.";
                setModalError(msg);
                return;
            }

            closeAllModals();
            loadBoard();
        } catch (e) {
            console.error(e);
            setModalError("Ошибка сети при создании задачи.");
        }
    };

    const handleEditSave = async () => {
        if (!editForm.id) return;

        if (!editForm.title.trim()) {
            setModalError("Заголовок обязателен");
            return;
        }

        const payload = {
            title: editForm.title.trim(),
            description: editForm.description.trim() || null,
            priority: editForm.priority,
            dueDate: editForm.dueDate || null
        };

        try {
            const resp = await fetch(
                `/kanban/api/task/${encodeURIComponent(editForm.id)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                }
            );

            let json: any = null;
            try {
                json = await resp.json();
            } catch {
                // может не быть тела
            }

            if (!resp.ok) {
                const msg =
                    json && json.error
                        ? String(json.error)
                        : "Не удалось сохранить задачу.";
                setModalError(msg);
                return;
            }

            closeAllModals();
            loadBoard();
        } catch (e) {
            console.error(e);
            setModalError("Ошибка сети при сохранении задачи.");
        }
    };

    const handleDelete = async () => {
        if (!editForm.id) return;

        try {
            const resp = await fetch(
                `/kanban/api/task/${encodeURIComponent(editForm.id)}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );

            if (!resp.ok) {
                setModalError("Не удалось удалить задачу.");
                return;
            }

            closeAllModals();
            loadBoard();
        } catch (e) {
            console.error(e);
            setModalError("Ошибка сети при удалении задачи.");
        }
    };

    // ------------ рендер ------------

    if (state.status === "loading") {
        return (
            <div className="kanban-page">
                <ThemeToggle/>
                <div className="wrap-wide">
                    <p className="muted">Загружаю доску…</p>
                </div>
            </div>
        );
    }

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
                    <Link to="/" className="link">
                        ⟵ К Workspace
                    </Link>
                </div>

                <h1>Личная канбан-доска</h1>
                <p className="sub">
                    Простая доска для твоих задач. Дальше на этих данных можно
                    строить матрицу Эйзенхауэра и аналитику.
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
                            onChange={(e) =>
                                setPriorityFilter(
                                    e.target.value as KanbanPriority | ""
                                )
                            }
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
                            onChange={(e) =>
                                setDateFilter(e.target.value as DateFilter)
                            }
                        >
                            <option value="">Все</option>
                            <option value="overdue">Просрочено</option>
                            <option value="today">Сегодня</option>
                            <option value="tomorrow">Завтра</option>
                        </select>
                    </div>

                    <div className="toolbar-spacer"/>
                </div>

                {state.status === "error" && (
                    <p className="error">Не удалось загрузить доску.</p>
                )}

                {state.status === "ok" && (
                    <div className="board">
                        {columns.map((col) => (
                            <div
                                key={col.id}
                                className={
                                    "column " +
                                    (col.code === "TODO"
                                        ? "column-todo"
                                        : col.code === "IN_PROGRESS"
                                            ? "column-inprogress"
                                            : col.code === "DONE"
                                                ? "column-done"
                                                : "")
                                }
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleColumnDrop(col.id)}
                            >
                                <div className="column-header">
                                    <div className="column-title">{col.title}</div>
                                </div>

                                <div className="column-tasks">
                                    {tasksByColumn(col.id).map((t) => (
                                        <article
                                            key={t.id}
                                            className="task-card"
                                            draggable
                                            onDragStart={handleCardDragStart(t.id)}
                                            onDragEnd={handleCardDragEnd}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handleCardDropOnCard(col.id, t.id)}
                                            onClick={() => openEditTask(t)}
                                        >
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

                                            <div className="task-title">{t.title}</div>

                                            {t.description && (
                                                <div className="task-body">
                                                    {t.description}
                                                </div>
                                            )}

                                            <div className="task-meta">
                                                <div className="task-meta-left">
                                                    {t.dueDate && (
                                                        <span className="task-chip task-due-chip">
                                                            ⏱ <span>{t.dueDate}</span>
                                                        </span>
                                                    )}
                                                    {t.completedAt && (
                                                        <span className="task-chip">
                                                            ✔{" "}
                                                            <span>
                                                                {t.completedAt}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                {/* Кнопка добавления задачи в колонку */}
                                <button
                                    type="button"
                                    className="btn-secondary column-add-btn"
                                    onClick={openCreateForColumn(col.id)}
                                >
                                    + Добавить
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Модальное окно СОЗДАНИЯ задачи */}
            {isCreateOpen && (
                <div
                    className="modal-backdrop"
                    style={{display: "flex"}}
                >
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
                                    <option value="">Выбери колонку</option>
                                    {columns.map((col) => (
                                        <option key={col.id} value={col.id}>
                                            {col.title}
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
                                            priority:
                                                e.target.value as KanbanPriority
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

                            {modalError && (
                                <p className="error">{modalError}</p>
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
                                    onClick={handleCreateSave}
                                >
                                    Создать
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно РЕДАКТИРОВАНИЯ задачи */}
            {isEditOpen && (
                <div
                    className="modal-backdrop"
                    style={{display: "flex"}}
                >
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                Редактировать задачу
                            </h2>
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
                                            priority:
                                                e.target.value as KanbanPriority
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

                            {modalError && (
                                <p className="error">{modalError}</p>
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
                                    className="btn-secondary"
                                    onClick={handleDelete}
                                >
                                    Удалить
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
