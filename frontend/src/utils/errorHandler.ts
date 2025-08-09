// Простой унифицированный обработчик ошибок

export interface ErrorInfo {
    message: string;
    code?: number;
    details?: string;
}

export class ErrorHandler {
    // Централизованная обработка ошибок
    static handleError(error: any, context?: string): ErrorInfo {
        let errorInfo: ErrorInfo = {
            message: 'Произошла неизвестная ошибка'
        };

        // Обработка разных типов ошибок
        if (error instanceof Error) {
            errorInfo.message = error.message;
        } else if (typeof error === 'string') {
            errorInfo.message = error;
        } else if (error?.detail) {
            errorInfo.message = error.detail;
        } else if (error?.message) {
            errorInfo.message = error.message;
        }

        // Добавляем контекст если есть
        if (context) {
            errorInfo.details = `Контекст: ${context}`;
        }

        // Логируем ошибку
        console.error('ErrorHandler:', errorInfo, error);

        return errorInfo;
    }

    // Обработка HTTP ошибок
    static async handleHttpError(response: Response, context?: string): Promise<ErrorInfo> {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
            const errorData = await response.json();
            if (errorData.detail) {
                errorMessage = errorData.detail;
            } else if (errorData.message) {
                errorMessage = errorData.message;
            } else if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // Если не удалось распарсить JSON, используем статус
        }

        return this.handleError({
            message: errorMessage,
            code: response.status
        }, context);
    }

    // Показ ошибки пользователю (простая реализация)
    static showError(errorInfo: ErrorInfo): void {
        // В реальном приложении тут был бы toast или модальное окно
        alert(`Ошибка: ${errorInfo.message}`);
    }

    // Обработка сетевых ошибок
    static handleNetworkError(context?: string): ErrorInfo {
        return this.handleError(
            'Ошибка сети. Проверьте подключение к интернету.',
            context
        );
    }

    // Обработка ошибок авторизации
    static handleAuthError(context?: string): ErrorInfo {
        return this.handleError(
            'Ошибка авторизации. Войдите в систему заново.',
            context
        );
    }
}

export default ErrorHandler;