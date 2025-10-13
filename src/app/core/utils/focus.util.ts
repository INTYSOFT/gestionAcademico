export function blurActiveElement(): void {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
        activeElement.blur();
    }
}
