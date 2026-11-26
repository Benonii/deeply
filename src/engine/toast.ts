let showMessage: ((message: string | null) => void) | null = null;

export function registerToast(setter: ((message: string | null) => void) | null) {
  showMessage = setter;
}

export function showToast(message: string) {
  showMessage?.(message);
}
