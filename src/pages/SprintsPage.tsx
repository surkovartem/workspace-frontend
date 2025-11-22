import React, {useEffect, useRef, useState} from "react";
import {ThemeToggle} from "../components/layout/ThemeToggle";
import {Link} from "react-router-dom";

type SheetState =
    | { status: "loading" }
    | { status: "ok"; sheets: string[] }
    | { status: "error" };

export const SprintsPage: React.FC = () => {
    const [sheetState, setSheetState] = useState<SheetState>({status: "loading"});
    const [fileName, setFileName] = useState<string>("Файл не выбран");
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // подгружаем список листов с backend
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

    const renderSourceSheetField = () => {
        if (sheetState.status === "ok") {
            return (
                <>
                    <select name="sourceSheet" required defaultValue="">
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

        // fallback: ручной ввод, как и раньше
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

    // === Dropzone / выбор файла ===

    const handleDropzoneClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName("Файл не выбран");
        }
    };

    const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];

            // проставляем файл в скрытый <input/>
            if (fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
            }

            setFileName(file.name);
        }
    };

    return (
        <div className="dark sprints-upload-page">
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
                    {/* ВНИМАНИЕ: action оставляем на Spring Boot, он как раньше сделает redirect на result.html */}
                    <form
                        method="post"
                        action="http://localhost:8080/sprints/ui/import"
                        encType="multipart/form-data"
                    >
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
                                {/* скрытый input, управляем им из dropzone */}
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
                                                d="M12 3l4 4h-3v6h-2V7H8l4-4zm-6 9v7h12v-7h2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7h2z"
                                            />
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

                        <button className="btn-primary" type="submit">
                            Импортировать
                        </button>
                    </form>

                    <Link
                        to="/"
                        className="back-link"
                        style={{marginTop: "16px", display: "inline-flex", gap: 4}}
                    >
                        <span>⟵</span>
                        <span>К рабочему пространству</span>
                    </Link>
                </section>
            </div>
        </div>
    );
};
