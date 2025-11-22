import React from "react";
import {Routes, Route} from "react-router-dom";
import {HomePage} from "./pages/HomePage";
import {SprintsPage} from "./pages/SprintsPage";
import {TasksPage} from "./pages/TasksPage";

const Stub: React.FC<{ title: string }> = ({title}) => (
    <div style={{padding: "40px 20px", color: "white"}}>
        <h1>{title}</h1>
        <p>Эта страница ещё не перенесена из Thymeleaf.</p>
        <a href="/" style={{color: "#38bdf8"}}>⟵ Назад к Workspace</a>
    </div>
);

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/sprints/upload" element={<SprintsPage/>}/>
            <Route path="/tasks" element={<TasksPage/>}/>
            <Route path="/kanban" element={<Stub title="Канбан-доска"/>}/>
            <Route path="/login" element={<Stub title="Login page"/>}/>
        </Routes>
    );
};

export default App;
