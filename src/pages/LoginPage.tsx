// src/pages/LoginPage.tsx
import React from "react";
import {useLocation} from "react-router-dom";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {useBodyPageClass} from "../hooks/useBodyPageClass";

export const LoginPage: React.FC = () => {
    useBodyPageClass("login-page");

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const hasError = params.has("error");
    const hasLogout = params.has("logout");

    return (
        <>
            <ThemeToggle/>

            <div className="shell">
                <section className="hero">
                    <div className="brand-pill">
                        <span className="brand-dot"></span>
                        <span className="brand-name">Workspace</span>
                        <span>• dev hub</span>
                    </div>

                    <h1 className="hero-title">
                        Один вход — все инструменты под рукой.
                    </h1>

                    <p className="hero-sub">
                        Импорт спринтов, канбан, аналитика. Минималистично и только для тебя.
                    </p>

                    <div className="hero-meta">
                        <div className="pill"><strong>Sprints</strong>&nbsp;· CSV → Sheets</div>
                        <div className="pill">Kanban · скоро</div>
                        <div className="pill">Gantt · позже</div>
                    </div>
                </section>

                <section className="card">
                    <h2 className="card-title">Вход в Workspace</h2>
                    <p className="card-sub">Локальный аккаунт, без лишних интеграций.</p>

                    {/* Обрати внимание: action="/api/login" */}
                    <form method="post" action="/api/login">
                        <div className="field">
                            <label htmlFor="username">Логин</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="password">Пароль</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button className="btn-primary" type="submit">
                            Войти
                        </button>

                        {hasError && (
                            <p className="status error">
                                Неверные логин или пароль.
                            </p>
                        )}

                        {hasLogout && (
                            <p className="status info">
                                Сессия завершена.
                            </p>
                        )}
                    </form>
                </section>
            </div>
        </>
    );
};
