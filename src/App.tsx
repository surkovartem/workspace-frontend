// src/App.tsx
import React from "react";
import {Routes, Route} from "react-router-dom";
import {HomePage} from "./pages/HomePage";
import {SprintsPage} from "./pages/SprintsPage";

const Stub: React.FC<{ title: string }> = ({title}) => (
    <div style={{padding: "40px 20px", color: "white"}}>
        <h1>{title}</h1>
        <p>Эта страница ещё не перенесена из Thymeleaf. Дойдём до неё следующим шагом.</p>
        <a href="/" style={{color: "#38bdf8"}}>⟵ Назад к Workspace</a>
    </div>
);

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage/>}/>

            {/* Уже реальный экран */}
            <Route path="/sprints/upload" element={<SprintsPage/>}/>

            {/* Остальное пока заглушки */}
            <Route path="/login" element={<Stub title="Login page"/>}/>
            <Route path="/tasks" element={<Stub title="Таск-трекер"/>}/>
            <Route path="/kanban" element={<Stub title="Канбан-доска"/>}/>
        </Routes>
    );
};

export default App;
