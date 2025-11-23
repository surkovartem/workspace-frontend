// src/types/note.ts

export interface Note {
    id: number;
    title: string;
    contentHtml: string;
    color: string;
    tags: string[];
    archived: boolean;
    position: number;
    createdAt: string;
    updatedAt: string | null;
}
