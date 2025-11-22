// src/pages/TasksPage.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import type {Task, TaskPriority, TaskStatus} from "../types/task";
import {useBodyPageClass} from "../hooks/useBodyPageClass";

type LoadState =
    | { status: "loading" }
    | { status: "ok"; tasks: Task[] }
    | { status: "error" };

type SortKey = "status" | "priority" | "title" | "due" | null;
type SortDir = "asc" | "desc";

interface TaskFormState {
    id?: number;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
}

const defaultForm: TaskFormState = {
    title: "",
    description: "",
    priority: "P2",
    status: "TODO",
    dueDate: ""
};

export const TasksPage: React.FC = () => {
    useBodyPageClass("tasks-page");

    const [state, setState] = useState<LoadState>({status: "loading"});

    const [statusFilter, setStatusFilter] = useState<string>("");
    const [priorityFilter, setPriorityFilter] = useState<string>("");
    const [timeFilter, setTimeFilter] = useState<string>("");

    const [sortKey, setSortKey] = useState<SortKey>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const [menuTaskId, setMenuTaskId] = useState<number | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [createForm, setCreateForm] = useState<TaskFormState>({...defaultForm});
    const [editForm, setEditForm] = useState<TaskFormState>({...defaultForm});

    const loadTasks = () => {
        setState((prev) =>
            prev.status === "loading" ? prev : {status: "loading"}
        );

        fetch("/tasks/api/list", {
            credentials: "include"
        })
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error("HTTP " + resp.status);
                }
                return resp.json();
            })
            .then((data: any[]) => {
                const tasks: Task[] = data.map((t) => ({
                    id: t.id,
                    title: t.title,
                    description: t.description ?? null,
                    priority: t.priority,
                    status: t.status,
                    dueDate: t.dueDate ?? null,
                    completedAt: t.completedAt ?? null
                }));
                setState({status: "ok", tasks});
            })
            .catch(() => {
                setState({status: "error"});
            });
    };

    useEffect(() => {
        loadTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredAndSorted = useMemo(() => {
        if (state.status !== "ok") return [];

        const parseDate = (str: string | null) => {
            if (!str) return null;
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        };

        const getThisWeekBounds = () => {
            const today = new Date();
            const day = today.getDay();
            const monday = new Date(today);
            const diff = day === 0 ? -6 : 1 - day;
            monday.setDate(today.getDate() + diff);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            monday.setHours(0, 0, 0, 0);
            sunday.setHours(23, 59, 59, 999);
            return {monday, sunday};
        };

        const weekBounds =
            timeFilter === "thisWeek" ? getThisWeekBounds() : null;

        let items = state.tasks.filter((t) => {
            if (statusFilter && t.status !== statusFilter) return false;
            if (priorityFilter && t.priority !== priorityFilter) return false;

            if (weekBounds) {
                const d = parseDate(t.dueDate);
                if (!d) return false;
                if (d < weekBounds.monday || d > weekBounds.sunday) return false;
            }
            return true;
        });

        if (!sortKey) return items;

        const factor = sortDir === "asc" ? 1 : -1;

        const statusOrder: Record<string, number> = {
            TODO: 1,
            IN_PROGRESS: 2,
            DONE: 3
        };

        const priorityOrder: Record<string, number> = {
            P0: 0,
            P1: 1,
            P2: 2,
            P3: 3,
            P4: 4
        };

        const parseDateOnly = (str: string | null) => {
            const d = parseDate(str);
            if (!d) return null;
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        };

        items = items.slice().sort((a, b) => {
            if (sortKey === "status") {
                const sa = statusOrder[a.status] ?? 999;
                const sb = statusOrder[b.status] ?? 999;
                return (sa - sb) * factor;
            }
            if (sortKey === "priority") {
                const pa = priorityOrder[a.priority] ?? 999;
                const pb = priorityOrder[b.priority] ?? 999;
                return (pa - pb) * factor;
            }
            if (sortKey === "title") {
                const ta = (a.title || "").toLowerCase();
                const tb = (b.title || "").toLowerCase();
                if (ta < tb) return -1 * factor;
                if (ta > tb) return 1 * factor;
                return 0;
            }
            if (sortKey === "due") {
                const da = parseDateOnly(a.dueDate);
                const db = parseDateOnly(b.dueDate);
                if (!da && !db) return 0;
                if (!da) return 1 * factor;
                if (!db) return -1 * factor;
                if (da < db) return -1 * factor;
                if (da > db) return 1 * factor;
                return 0;
            }
            return 0;
        });

        return items;
    }, [state, statusFilter, priorityFilter, timeFilter, sortKey, sortDir]);

    const onSortClick = (key: SortKey) => {
        if (!key) return;
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const isLoading = state.status === "loading";

    const openCreateModal = () => {
        setCreateForm({...defaultForm});
        setMenuTaskId(null);
        setIsCreateOpen(true);
    };

    const openEditModal = (task: Task) => {
        setEditForm({
            id: task.id,
            title: task.title,
            description: task.description ?? "",
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ?? ""
        });
        setMenuTaskId(null);
        setIsEditOpen(true);
    };

    const openDeleteModal = (task: Task) => {
        setEditForm({
            id: task.id,
            title: task.title,
            description: task.description ?? "",
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ?? ""
        });
        setMenuTaskId(null);
        setIsDeleteOpen(true);
    };

    const closeAllModals = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsDeleteOpen(false);
        setMenuTaskId(null);
    };

    const handleCreateSave = async () => {
        const payload = {
            title: createForm.title.trim(),
            description: createForm.description.trim() || null,
            priority: createForm.priority,
            dueDate: createForm.dueDate || null
        };

        const resp = await fetch("/tasks/api", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            alert("Не удалось создать задачу (" + resp.status + ")");
            return;
        }

        closeAllModals();
        loadTasks();
    };

    const handleEditSave = async () => {
        if (!editForm.id) return;

        const payload = {
            title: editForm.title.trim(),
            description: editForm.description.trim() || null,
            priority: editForm.priority,
            status: editForm.status,
            dueDate: editForm.dueDate || null
        };

        const resp = await fetch(`/tasks/api/${editForm.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            alert("Не удалось сохранить задачу (" + resp.status + ")");
            return;
        }

        closeAllModals();
        loadTasks();
    };

    const handleDeleteConfirm = async () => {
        if (!editForm.id) return;

        const resp = await fetch(`/tasks/api/${editForm.id}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!resp.ok) {
            alert("Не удалось удалить задачу (" + resp.status + ")");
            return;
        }

        closeAllModals();
        loadTasks();
    };

    return (
        <div className="tasks-page">
            <ThemeToggle/>

            <div className="wrap-wide">
                <div className="head-line tasks-head-line">
                    <div className="brand-pill">
                        <span className="brand-dot"/>
                        <span className="brand-name">Workspace</span>
                        <span>• таск-трекер</span>
                    </div>

                    <div className="tasks-head-actions">
                        <Link to="/" className="back-link">
                            <span>⟵</span>
                            <span>К рабочему пространству</span>
                        </Link>
                    </div>
                </div>

                <h1>Личный таск-трекер</h1>
                <p className="sub">
                    Табличный вид твоих задач. Канбан и трекер работают с одной
                    и той же сущностью Task.
                </p>

                <section className="card tasks-card">
                    <div className="tasks-card-header">
                        <div className="pill-small">
                            <span>Мои задачи</span>
                        </div>

                        <button
                            type="button"
                            className="btn-primary tasks-add-btn"
                            id="taskCreateBtn"
                            onClick={openCreateModal}
                        >
                            + Новая задача
                        </button>
                    </div>

                    <div className="tasks-toolbar">
                        <div className="tasks-filter-group">
                            <label
                                className="tasks-filter-label"
                                htmlFor="statusFilter"
                            >
                                Статус
                            </label>
                            <select
                                id="statusFilter"
                                className="tasks-filter-select"
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value)
                                }
                            >
                                <option value="">Все</option>
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="DONE">DONE</option>
                            </select>
                        </div>

                        <div className="tasks-filter-group">
                            <label
                                className="tasks-filter-label"
                                htmlFor="priorityFilter"
                            >
                                Приоритет
                            </label>
                            <select
                                id="priorityFilter"
                                className="tasks-filter-select"
                                value={priorityFilter}
                                onChange={(e) =>
                                    setPriorityFilter(e.target.value)
                                }
                            >
                                <option value="">Все</option>
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
                        </div>

                        <div className="tasks-filter-group">
                            <label
                                className="tasks-filter-label"
                                htmlFor="timeFilter"
                            >
                                Срок
                            </label>
                            <select
                                id="timeFilter"
                                className="tasks-filter-select"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                            >
                                <option value="">Все</option>
                                <option value="thisWeek">
                                    Текущая неделя
                                </option>
                            </select>
                        </div>

                        <div className="tasks-toolbar-spacer"/>
                    </div>

                    {state.status === "error" && (
                        <p className="error">Не удалось загрузить задачи.</p>
                    )}

                    {isLoading && (
                        <p className="muted">Загружаю задачи…</p>
                    )}

                    {!isLoading && state.status === "ok" && (
                        <table className="tasks-table">
                            <thead>
                            <tr>
                                <th className="col-id">ID</th>
                                <th
                                    className="col-status"
                                    data-sort-key="status"
                                    onClick={() => onSortClick("status")}
                                >
                                    Статус
                                </th>
                                <th
                                    className="col-priority"
                                    data-sort-key="priority"
                                    onClick={() => onSortClick("priority")}
                                >
                                    Приоритет
                                </th>
                                <th
                                    className="col-title"
                                    data-sort-key="title"
                                    onClick={() => onSortClick("title")}
                                >
                                    Заголовок
                                </th>
                                <th className="col-desc">Описание</th>
                                <th
                                    className="col-date"
                                    data-sort-key="due"
                                    onClick={() => onSortClick("due")}
                                >
                                    Срок
                                </th>
                                <th className="col-date">Завершено</th>
                                <th className="col-actions"/>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredAndSorted.map((t) => (
                                <tr className="task-row" key={t.id}>
                                    <td className="col-id">{t.id}</td>
                                    <td>
                                            <span
                                                className={
                                                    "status-badge " +
                                                    (t.status === "TODO"
                                                        ? "status-badge-todo"
                                                        : t.status ===
                                                        "IN_PROGRESS"
                                                            ? "status-badge-inprogress"
                                                            : t.status === "DONE"
                                                                ? "status-badge-done"
                                                                : "")
                                                }
                                            >
                                                {t.status}
                                            </span>
                                    </td>
                                    <td>
                                            <span className="priority-pill">
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
                                    </td>
                                    <td className="col-title-text">
                                        {t.title}
                                    </td>
                                    <td className="col-desc-text">
                                        {t.description}
                                    </td>
                                    <td>{t.dueDate ?? ""}</td>
                                    <td>{t.completedAt ?? ""}</td>
                                    <td className="task-row-actions">
                                        <div
                                            className="task-menu"
                                            style={{position: "relative"}}
                                        >
                                            <button
                                                type="button"
                                                className="task-menu-toggle"
                                                aria-haspopup="true"
                                                aria-expanded={menuTaskId === t.id}
                                                onClick={() =>
                                                    setMenuTaskId((prev) =>
                                                        prev === t.id ? null : t.id
                                                    )
                                                }
                                            >
                                                ⋯
                                            </button>

                                            {menuTaskId === t.id && (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        right: 0,
                                                        top: "120%",
                                                        backgroundColor: "#020617",
                                                        borderRadius: 8,
                                                        padding: "4px 0",
                                                        boxShadow:
                                                            "0 10px 30px rgba(0,0,0,0.5)",
                                                        zIndex: 20,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        minWidth: "180px"
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="task-menu-item task-menu-edit"
                                                        style={{
                                                            border: "none",
                                                            background: "transparent",
                                                            textAlign: "left",
                                                            padding:
                                                                "6px 12px",
                                                            cursor: "pointer",
                                                            fontSize: 14
                                                        }}
                                                        onClick={() =>
                                                            openEditModal(t)
                                                        }
                                                    >
                                                        Редактировать
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="task-menu-item task-menu-delete"
                                                        style={{
                                                            border: "none",
                                                            background: "transparent",
                                                            textAlign: "left",
                                                            padding:
                                                                "6px 12px",
                                                            cursor: "pointer",
                                                            fontSize: 14,
                                                            color: "#f97373"
                                                        }}
                                                        onClick={() =>
                                                            openDeleteModal(t)
                                                        }
                                                    >
                                                        Удалить
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAndSorted.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="muted">
                                        Нет задач под выбранные фильтры.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    )}

                    <div className="links tasks-links">
                        <Link className="link" to="/kanban">
                            <span>Открыть канбан-доску</span>
                            <span>⟶</span>
                        </Link>
                    </div>
                </section>
            </div>

            {/* Модалка СОЗДАНИЯ */}
            {isCreateOpen && (
                <div
                    className="modal-backdrop"
                    id="taskCreateModal"
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

                            <label className="modal-label inline">
                                Срок
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
                <div
                    className="modal-backdrop"
                    id="taskEditModal"
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
                                Статус
                                <select
                                    value={editForm.status}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            status: e.target.value as TaskStatus
                                        }))
                                    }
                                >
                                    <option value="TODO">TODO</option>
                                    <option value="IN_PROGRESS">
                                        IN PROGRESS
                                    </option>
                                    <option value="DONE">DONE</option>
                                </select>
                            </label>

                            <label className="modal-label inline">
                                Срок
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

            {/* Модалка УДАЛЕНИЯ */}
            {isDeleteOpen && (
                <div
                    className="modal-backdrop"
                    style={{display: "flex"}}
                >
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Удалить задачу</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeAllModals}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Точно удалить задачу{" "}
                                <b>{editForm.title}</b>?
                            </p>
                        </div>
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
                                onClick={handleDeleteConfirm}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
