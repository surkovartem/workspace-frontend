export type TaskPriority = "P0" | "P1" | "P2" | "P3" | "P4";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string | null;
    completedAt: string | null;
}
