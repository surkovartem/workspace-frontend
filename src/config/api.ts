// src/config/api.ts

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Универсальная обработка ответа:
 *  - кидает ошибку, если !res.ok
 *  - 204 → возвращает null
 *  - если не JSON → тоже null
 *  - JSON парсит безопасно
 */
async function handleResponse(res: Response) {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text}`);
    }

    // Нет тела
    if (res.status === 204) {
        return null;
    }

    const contentType = res.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    try {
        return await res.json();
    } catch {
        return null;
    }
}

export async function apiGet(path: string) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
    });
    return handleResponse(res);
}

export async function apiPost(path: string, body: unknown) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body),
    });
    return handleResponse(res);
}

export async function apiPut(path: string, body: unknown) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(body),
    });
    return handleResponse(res);
}

export async function apiDelete(path: string) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "DELETE",
        credentials: "include",
    });
    return handleResponse(res);
}
