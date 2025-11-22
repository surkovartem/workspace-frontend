import {useEffect} from "react";

export function useBodyPageClass(pageClass: string) {
    useEffect(() => {
        const body = document.body;
        if (!body) return;

        const prev = (body as any).dataset.pageClass as string | undefined;

        if (prev && prev !== pageClass) {
            body.classList.remove(prev);
        }

        body.classList.add(pageClass);
        (body as any).dataset.pageClass = pageClass;

        return () => {
            body.classList.remove(pageClass);
            if ((body as any).dataset.pageClass === pageClass) {
                (body as any).dataset.pageClass = "";
            }
        };
    }, [pageClass]);
}
