import React, {useEffect, useState} from "react";

type ThemeMode = "auto" | "light" | "dark";

const STORAGE_KEY = "ws-theme-mode";

function getSystemTheme(): "light" | "dark" {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
    }
    return "dark";
}

function normalizeMode(mode: string | null): ThemeMode {
    if (mode === "auto" || mode === "light" || mode === "dark") return mode;
    return "auto";
}

function applyTheme(mode: ThemeMode) {
    const eff = mode === "auto" ? getSystemTheme() : mode;
    const body = document.body;

    body.classList.remove("light", "dark");
    body.classList.add(eff);
    (body as any).dataset.themeMode = mode;

    localStorage.setItem(STORAGE_KEY, mode);
}

export const ThemeToggle: React.FC = () => {
    const [mode, setMode] = useState<ThemeMode>(() =>
        normalizeMode(localStorage.getItem(STORAGE_KEY))
    );

    // при первой загрузке
    useEffect(() => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            setMode("auto");
            applyTheme("auto");
        } else {
            applyTheme(mode);
        }

        // слушаем изменение системной темы, если включен auto
        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const handler = () => {
            const stored = normalizeMode(localStorage.getItem(STORAGE_KEY));
            if (stored === "auto") {
                applyTheme("auto");
            }
        };
        if (mq.addEventListener) {
            mq.addEventListener("change", handler);
        } else {
            // старые браузеры
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

    useEffect(() => {
        applyTheme(mode);
    }, [mode]);

    const effective = mode === "auto" ? getSystemTheme() : mode;

    function cycleMode() {
        setMode((prev) => {
            if (prev === "auto") return "light";
            if (prev === "light") return "dark";
            return "auto";
        });
    }

    let icon = "🌙";
    let title = "Тема: Dark";

    if (mode === "auto") {
        icon = effective === "light" ? "A☀" : "A🌙";
        title = "Тема: Auto (по системе)";
    } else if (mode === "light") {
        icon = "☀";
        title = "Тема: Light";
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
