import React from "react";
import {Link} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {useBodyPageClass} from "../hooks/useBodyPageClass";
import {API_BASE_URL} from "../config/api";

export const HomePage: React.FC = () => {
    useBodyPageClass("workspace-page");

    const handleLogout = () => {
        // /logout на бэке очистит сессию и редиректнёт на /login?logout фронта
        window.location.href = `${API_BASE_URL}/logout`;
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

                {/* Ряд сверху: слева спринты, справа заметки */}
                <div className="workspace-sections-row">
                    {/* Блок 1: планирование спринтов */}
                    <section className="workspace-section-block workspace-section-block--sprints">
                        <div className="workspace-section-header">
                            <h2 className="workspace-section-title">Планирование спринтов</h2>
                            <p className="workspace-section-sub">
                                Работа с Jira CSV и синхронизация с Google Sheets.
                            </p>
                        </div>

                        <div className="grid">
                            {/* Импорт спринтов */}
                            <section className="card workspace-tool">
                                <svg className="tool-icon" viewBox="0 0 24 24">
                                    <path d="M4 4h16v2H4zm0 6h16v2H4zm0 6h10v2H4z"/>
                                </svg>

                                <h3 className="tool-title">Импорт спринтов</h3>
                                <p className="tool-sub">
                                    Загрузка Jira CSV и синхронизация с Google Sheets.
                                </p>

                                <Link className="tool-link" to="/sprints/upload">
                                    <span>Перейти к импорту</span>
                                    <span className="arrow">⟶</span>
                                </Link>
                            </section>
                        </div>
                    </section>

                    {/* Блок 2: работа с заметками (на одном уровне со спринтами) */}
                    <section className="workspace-section-block workspace-section-block--notes">
                        <div className="workspace-section-header">
                            <h2 className="workspace-section-title">Работа с заметками</h2>
                            <p className="workspace-section-sub">
                                Лёгкие визуальные заметки и личные планы.
                            </p>
                        </div>

                        <div className="grid">
                            <section className="card workspace-tool">
                                <svg className="tool-icon" viewBox="0 0 24 24">
                                    <path d="M5 4h14v2H5zm0 4h10v2H5zm0 4h14v2H5zm0 4h10v2H5z"/>
                                </svg>

                                <h3 className="tool-title">Заметки</h3>
                                <p className="tool-sub">Быстрые записи и визуальные мысли.</p>

                                <Link className="tool-link" to="/notes">
                                    <span>Открыть заметки</span>
                                    <span className="arrow">⟶</span>
                                </Link>
                            </section>
                        </div>
                    </section>
                </div>

                {/* Блок 3: работа с задачами */}
                <section className="workspace-section-block workspace-section-block--tasks">
                    <div className="workspace-section-header">
                        <h2 className="workspace-section-title">Работа с задачами</h2>
                        <p className="workspace-section-sub">
                            Один источник правды: список, канбан и приоритизация P0–P4.
                        </p>
                    </div>

                    <div className="grid">
                        {/* Таск-трекер */}
                        <section className="card workspace-tool">
                            <svg className="tool-icon" viewBox="0 0 24 24">
                                <path
                                    d="M5 5h3v3H5zM5 11h3v3H5zM5 17h3v3H5zM11 6h8v1.5h-8zM11 12h8v1.5h-8zM11 18h8v1.5h-8z"
                                />
                            </svg>
                            <h3 className="tool-title">Таск-трекер</h3>
                            <p className="tool-sub">Единый список задач в табличном виде.</p>
                            <Link className="tool-link" to="/tasks/react">
                                <span>Перейти к трекеру</span>
                                <span className="arrow">⟶</span>
                            </Link>
                        </section>

                        {/* Канбан */}
                        <section className="card workspace-tool">
                            <svg className="tool-icon" viewBox="0 0 24 24">
                                <path d="M4 4h6v16H4zm10 0h6v10h-6z"/>
                            </svg>
                            <h3 className="tool-title">Канбан-доска</h3>
                            <p className="tool-sub">Личная система задач и приоритетов.</p>
                            <Link className="tool-link" to="/kanban">
                                <span>Перейти к доске</span>
                                <span className="arrow">⟶</span>
                            </Link>
                        </section>

                        {/* Матрица Эйзенхауэра */}
                        <section className="card workspace-tool tool-disabled">
                            <svg className="tool-icon" viewBox="0 0 24 24">
                                <path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 7v-7h7v7z"/>
                            </svg>
                            <h3 className="tool-title">Матрица Эйзенхауэра</h3>
                            <p className="tool-sub">
                                P0–P4, важность/срочность и фокус на главном.
                            </p>
                            <span className="tool-link">В разработке</span>
                        </section>
                    </div>
                </section>

                {/* Блок 4: построение отчётов */}
                <section className="workspace-section-block workspace-section-block--reports">
                    <div className="workspace-section-header">
                        <h2 className="workspace-section-title">Построение отчётов</h2>
                        <p className="workspace-section-sub">
                            Шаблоны отчётов по продукту, релизам и личной эффективности.
                        </p>
                    </div>

                    <div className="grid">
                        {/* Отчет по продуктовым инцидентам */}
                        <section className="card workspace-tool tool-disabled">
                            <svg className="tool-icon" viewBox="0 0 24 24">
                                <path d="M5 3h14v2H5zm0 4h10v2H5zm0 4h14v2H5zm0 4h8v2H5z"/>
                            </svg>
                            <h3 className="tool-title">Отчёт по продуктовым инцидентам</h3>
                            <p className="tool-sub">
                                Сводка по багам, влиянию и SLA.
                            </p>
                            <span className="tool-link">В разработке</span>
                        </section>

                        {/* Отчет по релизам */}
                        <section className="card workspace-tool tool-disabled">
                            <svg className="tool-icon" viewBox="0 0 24 24">
                                <path d="M4 5h16v2H4zm4 4h12v2H8zm-4 4h10v2H4zm6 4h8v2H10z"/>
                            </svg>
                            <h3 className="tool-title">Отчёт по релизам</h3>
                            <p className="tool-sub">
                                Динамика релизов и стабильность поставок.
                            </p>
                            <span className="tool-link">В разработке</span>
                        </section>

                        {/* Отчет по моей работе */}
                        <section className="card workspace-tool tool-disabled">
                            <svg className="tool-icon" viewBox="0 0 24 24">
                                <path d="M6 4h12v2H6zm0 4h7v2H6zm0 4h10v2H6zm0 4h8v2H6z"/>
                            </svg>
                            <h3 className="tool-title">Отчёт по моей работе</h3>
                            <p className="tool-sub">
                                Личная статистика задач и фокуса.
                            </p>
                            <span className="tool-link">В разработке</span>
                        </section>
                    </div>
                </section>

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
