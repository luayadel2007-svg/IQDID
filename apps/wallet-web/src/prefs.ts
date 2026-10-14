const NOTIFY_KEY = 'iqdid-demo-notify';

/** In-app notification preference (per browser, convenience only). */
export function readNotifyPref(): boolean {
  try {
    return window.localStorage.getItem(NOTIFY_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeNotifyPref(on: boolean): void {
  try {
    window.localStorage.setItem(NOTIFY_KEY, on ? 'on' : 'off');
  } catch {
    /* preference applies for this page only */
  }
}
