// src/pages/SprintsPage.tsx
import React, {useEffect, useMemo, useRef, useState, type FormEvent} from "react";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {Link} from "react-router-dom";
import {useBodyPageClass} from "../hooks/useBodyPageClass";

type SheetState =
    | { status: "loading" }
    | { status: "ok"; sheets: string[] }
    | { status: "error" };

type ImportChangeType = "INSERT" | "UPDATE" | "DELETE_SOFT" | "NOCHANGE";

interface ImportDiff {
    field: string;
    oldVal: string | null;
    newVal: string | null;
}

interface ImportChange {
    type: ImportChangeType;
    task: string;
    rowNum?: number | null;
    diffs?: ImportDiff[];
    oldSnapshot?: Record<string, string>;
}

interface ImportResult {
    parsed: number;
    inserted: number;
    updated: number;
    changes: ImportChange[];
}

type ImportState =
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | {
    phase: "success";
    filename: string;
    originalSheet: string;
    sheet: string;
    result: ImportResult;
};

export const SprintsPage: React.FC = () => {
    useBodyPageClass("sprints-upload-page");

    const [sheetState, setSheetState] = useState<SheetState>({status: "loading"});

    const [selectedSheet, setSelectedSheet] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>("Файл не выбран");
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    const [importState, setImportState] = useState<ImportState>({phase: "idle"});

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // --- загрузка листов ---
    useEffect(() => {
        fetch("/sprints/api/sheets")
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error("HTTP " + resp.status);
                }
                return resp.json();
            })
            .then((data: string[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setSheetState({status: "ok", sheets: data});
                } else {
                    setSheetState({status: "error"});
                }
            })
            .catch(() => {
                setSheetState({status: "error"});
            });
    }, []);

    // --- поле "Исходный лист" ---
    const renderSourceSheetField = () => {
        if (sheetState.status === "ok") {
            return (
                <>
                    <select
                        name="sourceSheet"
                        required
                        value={selectedSheet}
                        onChange={(e) => setSelectedSheet(e.target.value)}
                    >
                        <option value="">Выбери лист</option>
                        {sheetState.sheets.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <div className="field-hint">
                        Перед импортом будет создана копия: <b>«Имя листа (копия)»</b>, а импорт
                        выполнится в копию. Оригинал останется нетронутым.
                    </div>
                </>
            );
        }

        // fallback — ручной ввод
        return (
            <>
                <input
                    type="text"
                    name="sourceSheet"
                    placeholder="Напр.: Sprint 56"
                    required
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                />
                <div className="field-hint">
                    Не удалось автоматически подгрузить список листов. Введи имя листа вручную.
                    Перед импортом будет создана копия: <b>«Имя листа (копия)»</b>, импорт пойдёт в
                    копию.
                </div>
            </>
        );
    };

    // --- обработка выбора файла / дропа ---
    const handleFileChange = (f: File | null) => {
        setFile(f);
        if (f) {
            setFileName(f.name);
        } else {
            setFileName("Файл не выбран");
        }
    };

    const onNativeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        handleFileChange(f);
    };

    const onDropzoneClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const onDropzoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDropzoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const onDropzoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileChange(files[0]);
        }
    };

    // --- сабмит формы ---
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!selectedSheet.trim()) {
            setImportState({phase: "error", message: "Выбери исходный лист."});
            return;
        }
        if (!file) {
            setImportState({phase: "error", message: "Выбери CSV-файл для импорта."});
            return;
        }

        const formData = new FormData();
        formData.append("sourceSheet", selectedSheet.trim());
        formData.append("file", file);

        setImportState({phase: "loading"});

        fetch("/sprints/api/import", {
            method: "POST",
            body: formData
        })
            .then(async (resp) => {
                const json = await resp.json();
                if (!resp.ok || !json.success) {
                    const msg =
                        json && json.error
                            ? String(json.error)
                            : "Ошибка при импорте спринта.";
                    throw new Error(msg);
                }

                const result = json.result as ImportResult;
                setImportState({
                    phase: "success",
                    filename: json.filename ?? file.name,
                    originalSheet: json.originalSheet ?? selectedSheet.trim(),
                    sheet: json.sheet ?? "",
                    result
                });
            })
            .catch((err: Error) => {
                setImportState({
                    phase: "error",
                    message: err.message || "Ошибка при импорте спринта."
                });
            });
    };

    const changes = useMemo<ImportChange[]>(() => {
        if (importState.phase !== "success") return [];
        return importState.result.changes || [];
    }, [importState]);

    const isLoading = importState.phase === "loading";

    return (
        <div className="sprints-upload-page">
            <ThemeToggle/>

            <div className="wrap">
                <div className="brand-line">
                    <div className="brand-pill">
                        <span className="brand-dot"/>
                        <span className="brand-name">Workspace</span>
                        <span>• импорт спринтов</span>
                    </div>
                    <button
                        type="button"
                        className="logout-btn"
                        onClick={() => alert("Потом привяжем logout к backend")}
                    >
                        Выйти
                    </button>
                </div>

                <h1>Загрузка Jira CSV</h1>
                <p className="sub">
                    Импортируй экспорт Jira и синхронизируй его с Google Sheets.
                </p>

                <section className="card upload-card">
                    {importState.phase === "success" ? (
                        <div>
                            <div className="head-line" style={{marginBottom: 24}}>
                                <div className="brand-pill">
                                    <span className="brand-dot"/>
                                    <span className="brand-name">Workspace</span>
                                    <span>• результат импорта</span>
                                </div>
                            </div>

                            <p className="sub">
                                Исходный лист <b>{importState.originalSheet}</b> скопирован в{" "}
                                <b>{importState.sheet}</b>, и данные файла{" "}
                                <code>{importState.filename}</code> импортированы в копию.
                            </p>

                            <div className="grid-result">
                                {/* Левая карточка: сводка */}
                                <section className="card">
                                    <div className="pill-small">
                                        <span>Сводка</span>
                                    </div>

                                    <div className="result-summary-metrics">
                                        <div className="metric metric-parsed">
                                            <div className="metric-value">
                                                {importState.result.parsed}
                                            </div>
                                            <div className="metric-label">Разобрано строк</div>
                                        </div>
                                        <div className="metric metric-inserted">
                                            <div className="metric-value">
                                                {importState.result.inserted}
                                            </div>
                                            <div className="metric-label">Добавлено</div>
                                        </div>
                                        <div className="metric metric-updated">
                                            <div className="metric-value">
                                                {importState.result.updated}
                                            </div>
                                            <div className="metric-label">Обновлено</div>
                                        </div>
                                    </div>

                                    <div className="links">
                                        <button
                                            className="btn-primary"
                                            type="button"
                                            onClick={() => {
                                                setImportState({phase: "idle"});
                                                handleFileChange(null);
                                            }}
                                        >
                                            ⟵ Импортировать ещё
                                        </button>
                                        <Link className="link" to="/">
                                            <span>К Workspace</span>
                                            <span>⟶</span>
                                        </Link>
                                    </div>
                                </section>

                                {/* Правая карточка: изменения */}
                                <section className="card changes-section">
                                    <h2>Изменения</h2>
                                    {(!changes || changes.length === 0) && (
                                        <p className="muted">Изменений нет.</p>
                                    )}

                                    {changes &&
                                        changes.map((c, idx) => (
                                            <div key={idx} className="change-card">
                                                <div>
                                                    {c.type === "INSERT" && (
                                                        <span className="tag tag-insert">
                                                            <i></i>INSERT
                                                        </span>
                                                    )}
                                                    {c.type === "UPDATE" && (
                                                        <span className="tag tag-update">
                                                            <i></i>UPDATE
                                                        </span>
                                                    )}
                                                    {c.type === "DELETE_SOFT" && (
                                                        <span className="tag tag-delete">
                                                            <i></i>DELETE_SOFT
                                                        </span>
                                                    )}
                                                    {c.type === "NOCHANGE" && (
                                                        <span className="tag tag-nochange">
                                                            <i></i>NOCHANGE
                                                        </span>
                                                    )}
                                                    &nbsp;Задача: <b>{c.task}</b>
                                                    {typeof c.rowNum === "number" && (
                                                        <span className="muted">
                                                            {" "}
                                                            | Строка: {c.rowNum}
                                                        </span>
                                                    )}
                                                </div>

                                                {c.type === "UPDATE" &&
                                                    c.diffs &&
                                                    c.diffs.length > 0 && (
                                                        <div style={{marginTop: 8}}>
                                                            <table>
                                                                <thead>
                                                                <tr>
                                                                    <th>Поле</th>
                                                                    <th>Было</th>
                                                                    <th>Стало</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {c.diffs.map((d, i2) => (
                                                                    <tr key={i2}>
                                                                        <td>{d.field}</td>
                                                                        <td>{d.oldVal}</td>
                                                                        <td>{d.newVal}</td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                {c.type === "DELETE_SOFT" && c.oldSnapshot && (
                                                    <div style={{marginTop: 8}}>
                                                        <details>
                                                            <summary>Что было до очистки</summary>
                                                            <ul className="summary-list">
                                                                <li>
                                                                    <b>Task</b>:{" "}
                                                                    <span>
                                                                        {c.oldSnapshot["Task"] ?? ""}
                                                                    </span>
                                                                </li>
                                                                <li>
                                                                    <b>Epic</b>:{" "}
                                                                    <span>
                                                                        {c.oldSnapshot["Epic"] ?? ""}
                                                                    </span>
                                                                </li>
                                                                <li>
                                                                    <b>Type</b>:{" "}
                                                                    <span>
                                                                        {c.oldSnapshot["Type"] ?? ""}
                                                                    </span>
                                                                </li>
                                                                <li>
                                                                    <b>Status</b>:{" "}
                                                                    <span>
                                                                        {c.oldSnapshot["Status"] ??
                                                                            ""}
                                                                    </span>
                                                                </li>
                                                            </ul>
                                                        </details>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </section>
                            </div>
                        </div>
                    ) : (
                        // --- форма импорта ---
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <label>Исходный лист:</label>
                                <div style={{flex: 1, minWidth: 230}}>
                                    {sheetState.status === "loading" && (
                                        <div className="field-hint">
                                            Загружаю список листов…
                                        </div>
                                    )}
                                    {sheetState.status !== "loading" &&
                                        renderSourceSheetField()}
                                </div>
                            </div>

                            <div className="row" style={{alignItems: "flex-start"}}>
                                <label>Файл CSV:</label>
                                <div style={{flex: 1, minWidth: 230}}>
                                    <input
                                        id="fileInput"
                                        type="file"
                                        name="file"
                                        accept=".csv"
                                        ref={fileInputRef}
                                        style={{display: "none"}}
                                        onChange={onNativeInputChange}
                                    />

                                    <div
                                        className={
                                            "dropzone" + (isDragOver ? " drag-over" : "")
                                        }
                                        id="dropzone"
                                        onClick={onDropzoneClick}
                                        onDragOver={onDropzoneDragOver}
                                        onDragLeave={onDropzoneDragLeave}
                                        onDrop={onDropzoneDrop}
                                    >
                                        <div className="dropzone-icon">
                                            <svg viewBox="0 0 24 24">
                                                <path
                                                    d="M12 3l4 4h-3v6h-2V7H8l4-4zm-6 9v7h12v-7h2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7h2z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="dropzone-text-main">
                                                Перетащи CSV сюда или нажми, чтобы выбрать
                                            </div>
                                            <div className="dropzone-text-sub">
                                                Поддерживается стандартный экспорт Jira с
                                                разделителем ;
                                            </div>
                                        </div>
                                        <div className="dropzone-file" id="fileName">
                                            {fileName}
                                        </div>
                                    </div>

                                    <p className="hint">
                                        Экспортируй CSV из Jira с разделителем <b>;</b>. Копия
                                        листа будет создана автоматически, импорт пойдёт именно в
                                        неё.
                                    </p>
                                </div>
                            </div>

                            {importState.phase === "error" && (
                                <p className="error" style={{marginTop: 12}}>
                                    {importState.message}
                                </p>
                            )}

                            <button className="btn-primary" type="submit" disabled={isLoading}>
                                {isLoading ? "Импортирую…" : "Импортировать"}
                            </button>

                            <Link
                                to="/"
                                className="back-link"
                                style={{
                                    marginTop: "16px",
                                    display: "inline-flex",
                                    gap: 4
                                }}
                            >
                                <span>⟵</span>
                                <span>К рабочему пространству</span>
                            </Link>
                        </form>
                    )}
                </section>
            </div>
        </div>
    );
};
