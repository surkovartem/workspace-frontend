import React, {useEffect, useState} from "react";

type ThemeMode = "auto" | "light" | "dark";

const STORAGE_KEY = "ws-theme-mode";

function getSystemTheme(): "light" | "dark" {
    if (typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
        return "light";
    }
    return "dark";
}

// ВАЖНО: если в storage мусор или ничего нет — считаем, что нужен "light"
function normalizeMode(mode: string | null): ThemeMode {
    if (mode === "auto" || mode === "light" || mode === "dark") return mode;
    return "light";
}

function applyTheme(mode: ThemeMode) {
    if (typeof document === "undefined") return;

    const eff = mode === "auto" ? getSystemTheme() : mode;
    const body = document.body;

    body.classList.remove("light", "dark");
    body.classList.add(eff);
    (body as any).dataset.themeMode = mode;

    try {
        localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // игнорируем проблемы со storage
    }
}

export const ThemeToggle: React.FC = () => {
    // Инициализация: читаем из localStorage, но по умолчанию — LIGHT
    const [mode, setMode] = useState<ThemeMode>(() => {
        if (typeof window === "undefined") return "light";
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return normalizeMode(stored);
        } catch {
            return "light";
        }
    });

    // Применяем тему каждый раз, когда меняется mode
    useEffect(() => {
        applyTheme(mode);
    }, [mode]);

    // Слушаем смену системной темы ТОЛЬКО для режима auto
    useEffect(() => {
        if (typeof window === "undefined") return;

        const mq = window.matchMedia("(prefers-color-scheme: light)");

        const handler = () => {
            // если пользователь выбрал auto — пересчитаем effective-тему
            try {
                const stored = normalizeMode(localStorage.getItem(STORAGE_KEY));
                if (stored === "auto") {
                    applyTheme("auto");
                }
            } catch {
                // молча игнорируем
            }
        };

        if (mq.addEventListener) {
            mq.addEventListener("change", handler);
        } else {
            // @ts-ignore
            mq.addListener(handler);
        }

        return () => {
            if (mq.removeEventListener) {
                mq.removeEventListener("change", handler);
            } else {
                // @ts-ignore
                mq.removeListener(handler);
            }
        };
    }, []);

    const effective = mode === "auto" ? getSystemTheme() : mode;

    function cycleMode() {
        setMode((prev) => {
            if (prev === "light") return "dark";
            if (prev === "dark") return "auto";
            // из auto возвращаемся в светлую
            return "light";
        });
    }

    let icon = "🌙";
    let title = "Тема: тёмная";

    if (mode === "auto") {
        icon = effective === "light" ? "🌓" : "🌓";
        title = "Тема: по системе (Auto)";
    } else if (mode === "light") {
        icon = "☀";
        title = "Тема: светлая";
    }

    return (
        <button
            type="button"
            className="theme-toggle"
            data-theme-toggle
            aria-label="Переключить тему"
            title={title}
            onClick={cycleMode}
        >
            {icon}
        </button>
    );
};
