// Простые утилиты для работы с аутентификацией

import API_BASE_URL from '../config';
import SimpleStorage from './storage';

export class AuthUtils {
    // Проверка валидности токена
    static async checkTokenValidity(): Promise<boolean> {
        const token = SimpleStorage.getItem('token');
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/user_info/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });
            return response.ok;
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            return false;
        }
    }

    // Простое обновление токена (повторный логин)
    static async refreshToken(): Promise<boolean> {
        const storedUsername = SimpleStorage.getItem('username');
        const storedPassword = SimpleStorage.getItem('password');
        
        if (!storedUsername || !storedPassword) {
            console.log('Нет сохраненных данных для обновления токена');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username: storedUsername, 
                    password: storedPassword 
                }),
            });

            if (response.ok) {
                const data = await response.json();
                SimpleStorage.setItem('token', data.auth_token);
                console.log('Токен успешно обновлен');
                return true;
            } else {
                console.log('Не удалось обновить токен');
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Ошибка обновления токена:', error);
            this.logout();
            return false;
        }
    }

    // Проверка и автоматическое обновление токена
    static async ensureValidToken(): Promise<boolean> {
        const isValid = await this.checkTokenValidity();
        if (isValid) return true;

        console.log('Токен истек, пытаемся обновить...');
        return await this.refreshToken();
    }

    // Выход из системы
    static logout(): void {
        SimpleStorage.removeItem('token');
        SimpleStorage.removeItem('role');
        SimpleStorage.removeItem('username');
        SimpleStorage.removeItem('password');
        console.log('Пользователь вышел из системы');
        // Перенаправление на страницу логина
        window.location.href = '/signin';
    }

    // Сохранение данных для автообновления токена
    static saveCredentials(username: string, password: string): void {
        SimpleStorage.setItem('username', username);
        SimpleStorage.setItem('password', password);
    }
}

export default AuthUtils;