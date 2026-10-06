/** Sends the browser to another address (the card payment page). A one-line wrapper so it can be replaced in tests. */
export function goTo(url: string): void {
  window.location.href = url;
}
