type ObserverCallback = (isIntersecting: boolean) => void;

class SharedIntersectionObserver {
    private observer: IntersectionObserver | null = null;
    private callbacks = new Map<Element, ObserverCallback>();

    private ensureObserver() {
        if (!this.observer) {
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const callback = this.callbacks.get(entry.target);
                        if (callback) {
                            callback(entry.isIntersecting);
                        }
                    });
                },
                {
                    rootMargin: '200px',
                    threshold: 0.01,
                }
            );
        }
    }

    observe(element: Element, callback: ObserverCallback) {
        this.ensureObserver();
        this.callbacks.set(element, callback);
        this.observer?.observe(element);
    }

    unobserve(element: Element) {
        this.observer?.unobserve(element);
        this.callbacks.delete(element);
    }
}

export const sharedObserver = new SharedIntersectionObserver();
