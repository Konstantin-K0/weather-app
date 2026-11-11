export type AppErrorCode =
  | 'apiStatus' | 'apiUnreadable' | 'apiTimeout' | 'apiConnection' | 'offline'
  | 'forecastInvalid' | 'forecastFailed' | 'searchInvalid' | 'searchFailed'
  | 'geoPermission' | 'geoUnsupported' | 'geoSecure' | 'geoTimeout' | 'geoDenied' | 'geoUnavailable';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number | undefined;

  constructor(code: AppErrorCode, status?: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
