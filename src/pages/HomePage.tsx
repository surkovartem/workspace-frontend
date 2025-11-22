// src/pages/HomePage.tsx
import React from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {useBodyPageClass} from "../hooks/useBodyPageClass";

export const HomePage: React.FC = () => {
    useBodyPageClass("workspace-page");

    const handleLogout = () => {
        // Отдаём управление Spring Security: он сделает logout и редирект на /login?logout
        window.location.href = "/logout";
    };

    return (
        <div className="workspace-page">
            <ThemeToggle/>

            <div className="wrap">
                <div className="brand-pill">
                    <span className="brand-dot"/>
                    <span className="brand-name">Workspace</span>
                    <span>• твой dev-хаб</span>
                </div>

                <h1>Инструменты</h1>
                <p className="sub">Выбери, с чем хочешь работать сегодня.</p>

                <div className="grid">
                    {/* Импорт спринтов */}
                    <section className="card workspace-tool">
                        <svg className="tool-icon" viewBox="0 0 24 24" fill="var(--accent)">
                            <path d="M4 4h16v2H4zm0 6h16v2H4zm0 6h10v2H4z"/>
                        </svg>

                        <h2 className="tool-title">Импорт спринтов</h2>
                        <p className="tool-sub">Загрузка Jira CSV и синхронизация с Google Sheets.</p>

                        <Link className="tool-link" to="/sprints/upload">
                            <span>Перейти к импорту</span>
                            <span className="arrow">⟶</span>
                        </Link>
                    </section>

                    {/* Таск-трекер */}
                    <section className="card workspace-tool">
                        <svg className="tool-icon" viewBox="0 0 24 24" fill="var(--accent)">
                            <path
                                d="M5 5h3v3H5zM5 11h3v3H5zM5 17h3v3H5zM11 6h8v1.5h-8zM11 12h8v1.5h-8zM11 18h8v1.5h-8z"/>
                        </svg>
                        <h2 className="tool-title">Таск-трекер</h2>
                        <p className="tool-sub">Единый список задач в табличном виде.</p>
                        <Link className="tool-link" to="/tasks/react">
                            <span>Перейти к трекеру</span>
                            <span className="arrow">⟶</span>
                        </Link>
                    </section>

                    {/* Канбан */}
                    <section className="card workspace-tool">
                        <svg className="tool-icon" viewBox="0 0 24 24" fill="var(--accent)">
                            <path d="M4 4h6v16H4zm10 0h6v10h-6z"/>
                        </svg>
                        <h2 className="tool-title">Канбан-доска</h2>
                        <p className="tool-sub">Личная система задач и приоритетов.</p>
                        <Link className="tool-link" to="/kanban">
                            <span>Перейти к доске</span>
                            <span className="arrow">⟶</span>
                        </Link>
                    </section>

                    {/* Остальные инструменты — заглушки */}
                    <section className="card workspace-tool tool-disabled">
                        <svg className="tool-icon" viewBox="0 0 24 24" fill="var(--accent)">
                            <path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 7v-7h7v7z"/>
                        </svg>
                        <h2 className="tool-title">Матрица Эйзенхауэра</h2>
                        <p className="tool-sub">P0–P4, важность/срочность и фокус на главном.</p>
                        <span className="tool-link">В разработке</span>
                    </section>

                    <section className="card workspace-tool tool-disabled">
                        <svg className="tool-icon" viewBox="0 0 24 24" fill="var(--accent)">
                            <path d="M3 6h18v2H3zm4 5h10v2H7zm-3 5h14v2H4z"/>
                        </svg>
                        <h2 className="tool-title">Диаграмма Ганта</h2>
                        <p className="tool-sub">Планирование и дорожные карты задач.</p>
                        <span className="tool-link">В разработке</span>
                    </section>

                    <section className="card workspace-tool tool-disabled">
                        <svg className="tool-icon" viewBox="0 0 24 24" fill="var(--accent)">
                            <path
                                d="M12 2a5 5 0 0 1 5 5v3h1a3 3 0 1 1 0 6h-1v3a5 5 0 0 1-10 0v-3H6a3 3 0 1 1 0-6h1V7a5 5 0 0 1 5-5z"/>
                        </svg>
                        <h2 className="tool-title">Аналитика багов</h2>
                        <p className="tool-sub">Разбор продовых инцидентов.</p>
                        <span className="tool-link">В разработке</span>
                    </section>
                </div>

                <div className="footer">
                    <button
                        type="button"
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        Выйти
                    </button>
                </div>
            </div>
        </div>
    );
};
