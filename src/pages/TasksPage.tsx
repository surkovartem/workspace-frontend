import React, {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import type {Task} from "../types/task";

type LoadState =
    | { status: "loading" }
    | { status: "ok"; tasks: Task[] }
    | { status: "error" };

type SortKey = "status" | "priority" | "title" | "due" | null;
type SortDir = "asc" | "desc";

export const TasksPage: React.FC = () => {
    const [state, setState] = useState<LoadState>({status: "loading"});

    const [statusFilter, setStatusFilter] = useState<string>("");
    const [priorityFilter, setPriorityFilter] = useState<string>("");
    const [timeFilter, setTimeFilter] = useState<string>("");

    const [sortKey, setSortKey] = useState<SortKey>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    useEffect(() => {
        fetch("/tasks/api/list")
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
            const day = today.getDay(); // 0 - вс, 1 - пн, ...
            const monday = new Date(today);
            const diff = day === 0 ? -6 : 1 - day;
            monday.setDate(today.getDate() + diff);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            monday.setHours(0, 0, 0, 0);
            sunday.setHours(23, 59, 59, 999);
            return {monday, sunday};
        };

        const weekBounds = timeFilter === "thisWeek" ? getThisWeekBounds() : null;

        let items = state.tasks.filter((t) => {
            if (statusFilter && t.status !== statusFilter) {
                return false;
            }
            if (priorityFilter && t.priority !== priorityFilter) {
                return false;
            }
            if (weekBounds) {
                const d = parseDate(t.dueDate);
                if (!d) return false;
                if (d < weekBounds.monday || d > weekBounds.sunday) return false;
            }
            return true;
        });

        if (!sortKey) {
            return items;
        }

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
                            <span>⟵</span><span>К рабочему пространству</span>
                        </Link>
                    </div>
                </div>

                <h1>Личный таск-трекер</h1>
                <p className="sub">
                    Табличный вид твоих задач. Канбан и трекер работают с одной и той же сущностью Task.
                </p>

                <section className="card tasks-card">
                    <div className="tasks-card-header">
                        <div className="pill-small">
                            <span>Мои задачи</span>
                        </div>

                        <a
                            href="http://localhost:8080/tasks"
                            className="btn-primary tasks-add-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Открыть старый трекер (создание/редактирование)
                        </a>
                    </div>

                    <div className="tasks-toolbar">
                        <div className="tasks-filter-group">
                            <label className="tasks-filter-label" htmlFor="statusFilter">
                                Статус
                            </label>
                            <select
                                id="statusFilter"
                                className="tasks-filter-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Все</option>
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="DONE">DONE</option>
                            </select>
                        </div>

                        <div className="tasks-filter-group">
                            <label className="tasks-filter-label" htmlFor="priorityFilter">
                                Приоритет
                            </label>
                            <select
                                id="priorityFilter"
                                className="tasks-filter-select"
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

                        <div className="tasks-filter-group">
                            <label className="tasks-filter-label" htmlFor="timeFilter">
                                Срок
                            </label>
                            <select
                                id="timeFilter"
                                className="tasks-filter-select"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                            >
                                <option value="">Все</option>
                                <option value="thisWeek">Текущая неделя</option>
                            </select>
                        </div>

                        <div className="tasks-toolbar-spacer"></div>
                    </div>

                    {state.status === "error" && (
                        <p className="error">Не удалось загрузить задачи.</p>
                    )}

                    {isLoading && <p className="muted">Загружаю задачи…</p>}

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
                                <th className="col-actions"></th>
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
                                  : t.status === "IN_PROGRESS"
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
                        {t.priority === "P0" && "🔥P0 — срочное реагирование"}
                          {t.priority === "P1" && "🔴P1 — важно и срочно"}
                          {t.priority === "P2" && "🟠P2 — важно, не срочно"}
                          {t.priority === "P3" && "🟡P3 — срочно, не важно"}
                          {t.priority === "P4" && "⚪P4 — не срочно, не важно"}
                      </span>
                                    </td>
                                    <td className="col-title-text">{t.title}</td>
                                    <td className="col-desc-text">{t.description}</td>
                                    <td>{t.dueDate ?? ""}</td>
                                    <td>{t.completedAt ?? ""}</td>
                                    <td className="task-row-actions"/>
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
                        <a
                            className="link"
                            href="http://localhost:8080/kanban"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span>Открыть канбан-доску (старый UI)</span><span>⟶</span>
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
};
