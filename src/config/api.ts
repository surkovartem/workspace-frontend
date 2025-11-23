// src/config/api.ts

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiGet(path: string) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
    });
    if (!res.ok) {
        throw new Error(`GET ${path} failed`);
    }
    return res.json();
}

export async function apiPost(path: string, body: unknown) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`POST ${path} failed`);
    }
    return res.json();
}
