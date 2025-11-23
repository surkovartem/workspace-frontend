// src/App.tsx
import React from "react";
import {Routes, Route} from "react-router-dom";
import {HomePage} from "./pages/HomePage";
import {SprintsPage} from "./pages/SprintsPage";
import {TasksPage} from "./pages/TasksPage";
import {KanbanPage} from "./pages/KanbanPage";
import {LoginPage} from "./pages/LoginPage";
import {NotFoundPage} from "./pages/NotFoundPage";
import {NotesPage} from "./pages/NotesPage.tsx"; // <-- добавить

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
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/sprints/upload" element={<SprintsPage/>}/>
            <Route path="/tasks/react" element={<TasksPage/>}/>
            <Route path="/tasks" element={<Stub title="Старый таск-трекер (UI из Spring)"/>}/>
            <Route path="/kanban" element={<KanbanPage/>}/>
            <Route path="*" element={<NotFoundPage/>}/>
            <Route path="/notes" element={<NotesPage/>}/>
            <Route path="/notes/*" element={<NotesPage/>}/>
        </Routes>
    );
};

export default App;
