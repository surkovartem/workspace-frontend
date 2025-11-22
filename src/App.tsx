// src/App.tsx
import React from "react";
import {Routes, Route} from "react-router-dom";
import {HomePage} from "./pages/HomePage";
import {SprintsPage} from "./pages/SprintsPage";
import {TasksPage} from "./pages/TasksPage";
import {KanbanPage} from "./pages/KanbanPage";
import {LoginPage} from "./pages/LoginPage";

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
            {/* Главная SPA */}
            <Route path="/" element={<HomePage/>}/>

            {/* React-логин */}
            <Route path="/login" element={<LoginPage/>}/>

            {/* Спринты (React-форма поверх старого backend) */}
            <Route path="/sprints/upload" element={<SprintsPage/>}/>

            {/* НОВОЕ: React-таск-трекер */}
            <Route path="/tasks/react" element={<TasksPage/>}/>

            {/* Старый таск-трекер (Thymeleaf), если вдруг нужен */}
            <Route path="/tasks" element={<Stub title="Старый таск-трекер (UI из Spring)"/>}/>

            {/* Канбан — уже React-страница */}
            <Route path="/kanban" element={<KanbanPage/>}/>

            {/* fallback */}
            <Route path="*" element={<Stub title="Страница не найдена"/>}/>
        </Routes>
    );
};

export default App;
