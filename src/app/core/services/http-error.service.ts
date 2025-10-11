import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class HttpErrorService {
    private readonly snackBar = inject(MatSnackBar);

    notifyHttpError(error: HttpErrorResponse): void {
        const message = this.extractMessage(error);
        this.snackBar.open(message, 'Cerrar', {
            duration: 6000,
            panelClass: ['mat-mdc-snack-bar-container--error'],
        });
    }

    createError(error: unknown): Error {
        if (error instanceof HttpErrorResponse) {
            return new Error(this.extractMessage(error));
        }

        if (error instanceof Error) {
            return error;
        }

        return new Error('Se produjo un error inesperado.');
    }

    private extractMessage(error: HttpErrorResponse): string {
        if (typeof error.error === 'string' && error.error.trim().length > 0) {
            return error.error;
        }

        if (error.error?.message) {
            return String(error.error.message);
        }

        if (error.message) {
            return error.message;
        }

        return 'Se produjo un error inesperado al comunicarse con el servidor.';
    }
}
