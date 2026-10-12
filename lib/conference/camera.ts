export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(name)) return "Camera access is blocked. Open this site's camera permission in your browser and choose Allow. Also allow your browser to use the camera in your phone or computer settings.";
  if (["NotFoundError", "DevicesNotFoundError"].includes(name)) return "No camera was found. Connect a camera or use your phone. You can also choose a QR photo below.";
  if (["NotReadableError", "TrackStartError", "AbortError"].includes(name)) return "The camera is unavailable or in use by another app. Close other camera apps or video calls, then try again.";
  if (name === "OverconstrainedError") return "This camera cannot use the requested settings. Try another camera or choose a QR photo.";
  return "The camera could not start. Try again, choose another camera, or use a QR photo below.";
}
