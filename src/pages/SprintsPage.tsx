import React, {useEffect, useRef, useState} from "react";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {Link} from "react-router-dom";

type SheetState =
    | { status: "loading" }
    | { status: "ok"; sheets: string[] }
    | { status: "error" };

interface ImportResult {
    filename: string;
    originalSheet: string;
    sheet: string;
    parsed: number;
    inserted: number;
    updated: number;
    changes: any;
}

export const SprintsPage: React.FC = () => {
    const [sheetState, setSheetState] = useState<SheetState>({status: "loading"});
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [fileName, setFileName] = useState<string>("Файл не выбран");
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        fetch("/sprints/api/sheets")
            .then((resp) => resp.ok ? resp.json() : [])
            .then((data: string[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setSheetState({status: "ok", sheets: data});
                } else {
                    setSheetState({status: "error"});
                }
            })
            .catch(() => setSheetState({status: "error"}));
    }, []);

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setImportResult(null);
        setIsSubmitting(true);

        const form = e.currentTarget;
        const formData = new FormData(form);

        fetch("/sprints/api/import", {
            method: "POST",
            body: formData
        })
            .then((resp) => {
                if (!resp.ok) throw new Error("Import failed");
                return resp.json();
            })
            .then((data: ImportResult) => {
                setImportResult(data);
            })
            .catch(() => {
                alert("Импорт завершился с ошибкой");
            })
            .finally(() => setIsSubmitting(false));
    };

    const renderSourceSheetField = () => {
        if (sheetState.status === "ok") {
            return (
                <>
                    <select name="sourceSheet" required>
                        <option value="" disabled>
                            Выбери лист
                        </option>
                        {sheetState.sheets.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <div className="field-hint">
                        Перед импортом будет создана копия: <b>«Имя листа (копия)»</b>,
                        а импорт выполнится в копию. Оригинал останется нетронутым.
                    </div>
                </>
            );
        }

        return (
            <>
                <input
                    type="text"
                    name="sourceSheet"
                    placeholder="Напр.: Sprint 56"
                    required
                />
                <div className="field-hint">
                    Не удалось автоматически подгрузить список листов. Введи имя листа
                    вручную. Перед импортом будет создана копия:
                    <b> «Имя листа (копия)»</b>, импорт пойдёт в копию.
                </div>
            </>
        );
    };

    const handleDropzoneClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        setFileName(f ? f.name : "Файл не выбран");
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (fileInputRef.current) {
                // @ts-ignore — браузер позволяет, TS ругается, но по факту всё ок
                fileInputRef.current.files = files;
            }
            setFileName(files[0].name);
        }
    };

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
                    <form onSubmit={onSubmit} encType="multipart/form-data">
                        <div className="row">
                            <label>Исходный лист:</label>
                            <div style={{flex: 1, minWidth: 230}}>
                                {sheetState.status === "loading" && (
                                    <div className="field-hint">Загружаю список листов…</div>
                                )}
                                {sheetState.status !== "loading" && renderSourceSheetField()}
                            </div>
                        </div>

                        <div className="row" style={{alignItems: "flex-start"}}>
                            <label>Файл CSV:</label>
                            <div style={{flex: 1, minWidth: 230}}>
                                {/* Скрытый input для файла */}
                                <input
                                    ref={fileInputRef}
                                    id="fileInput"
                                    type="file"
                                    name="file"
                                    accept=".csv"
                                    required
                                    style={{display: "none"}}
                                    onChange={handleFileChange}
                                />

                                {/* Красивый dropzone, как раньше */}
                                <div
                                    className={`dropzone ${isDragOver ? "drag-over" : ""}`}
                                    id="dropzone"
                                    onClick={handleDropzoneClick}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
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
                                            Поддерживается стандартный экспорт Jira с разделителем ;
                                        </div>
                                    </div>
                                    <div className="dropzone-file" id="fileName">
                                        {fileName}
                                    </div>
                                </div>

                                <p className="hint">
                                    Экспортируй CSV из Jira с разделителем <b>;</b>. Копия листа
                                    будет создана автоматически, импорт пойдёт именно в неё.
                                </p>
                            </div>
                        </div>

                        <button className="btn-primary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Импортирую…" : "Импортировать"}
                        </button>
                    </form>

                    <Link
                        to="/"
                        className="back-link"
                        style={{marginTop: "16px", display: "inline-flex", gap: 4}}
                    >
                        <span>⟵</span><span>К рабочему пространству</span>
                    </Link>
                </section>

                {/* Блок результата импорта, уже на React */}
                {importResult && (
                    <div className="grid-result" style={{marginTop: 24}}>
                        {/* Левая карточка: сводка */}
                        <section className="card">
                            <div className="pill-small">
                                <span>Сводка</span>
                            </div>

                            <div className="result-summary-metrics">
                                <div className="metric metric-parsed">
                                    <div className="metric-value">{importResult.parsed}</div>
                                    <div className="metric-label">Разобрано строк</div>
                                </div>
                                <div className="metric metric-inserted">
                                    <div className="metric-value">{importResult.inserted}</div>
                                    <div className="metric-label">Добавлено</div>
                                </div>
                                <div className="metric metric-updated">
                                    <div className="metric-value">{importResult.updated}</div>
                                    <div className="metric-label">Обновлено</div>
                                </div>
                            </div>

                            <p className="sub" style={{marginTop: 16}}>
                                Исходный лист <b>{importResult.originalSheet}</b> скопирован в{" "}
                                <b>{importResult.sheet}</b>, файл{" "}
                                <code>{importResult.filename}</code> импортирован в копию.
                            </p>
                        </section>

                        {/* Правая карточка: изменения (пока просто JSON) */}
                        <section className="card changes-section">
                            <h2>Изменения</h2>
                            {!importResult.changes && (
                                <p className="muted">Изменений нет или сервис вернул пустой список.</p>
                            )}
                            {importResult.changes && (
                                <pre style={{whiteSpace: "pre-wrap"}}>
                                    {JSON.stringify(importResult.changes, null, 2)}
                                </pre>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};
