import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./App";

import "./styles/core.css";
import "./styles/workspace.css";
import "./styles/sprints.css";
import "./styles/tasks_style.css";
import "./styles/kanban_style.css";
import "./styles/login.css";
import "./styles/notfound.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    </React.StrictMode>
);
