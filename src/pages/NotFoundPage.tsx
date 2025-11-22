// src/pages/NotFoundPage.tsx
import React from "react";
import {Link, useLocation} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {useBodyPageClass} from "../hooks/useBodyPageClass";

export const NotFoundPage: React.FC = () => {
    useBodyPageClass("notfound-page");

    const location = useLocation();

    return (
        <div className="notfound-page">
            <ThemeToggle/>

            <div className="wrap">
                <div className="brand-pill">
                    <span className="brand-dot"/>
                    <span className="brand-name">Workspace</span>
                    <span>• ничего не найдено</span>
                </div>

                <div className="notfound-content">
                    <div className="notfound-code">
                        <span>4</span>
                        <span>0</span>
                        <span>4</span>
                    </div>

                    <h1 className="notfound-title">
                        Такой страницы у Workspace нет.
                    </h1>

                    <p className="notfound-sub">
                        Запрос: <code>{location.pathname}</code>
                    </p>
                    <p className="notfound-text">
                        Возможно, ты опечатался в адресе или страница ещё не реализована.
                    </p>

                    <div className="notfound-actions">
                        <Link to="/" className="btn-primary">
                            ⟵ В рабочее пространство
                        </Link>

                        <div className="notfound-links">
                            <span className="muted">Быстрый переход:</span>
                            <div className="notfound-links-list">
                                <Link to="/sprints/upload" className="link">
                                    Sprints (импорт CSV)
                                </Link>
                                <Link to="/tasks/react" className="link">
                                    Таск-трекер
                                </Link>
                                <Link to="/kanban" className="link">
                                    Канбан-доска
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="notfound-hint">
                        <span className="pill-small">
                            <span>dev-подсказка</span>
                        </span>
                        <p className="muted">
                            Если ты ожидал увидеть здесь инструмент — проверь роутинг React
                            и настройки proxy на бэке.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
