import "./LoginForm.css";

import API_BASE_URL from '../../config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC<{ updateRole: (role: string, is_superuser: boolean) => void }> = ({ updateRole }) => {
    const [username, setUsername] = useState<string>('');  // Состояние для хранения имени пользователя, вводимого в форму
    const [password, setPassword] = useState<string>('');  // Состояние для хранения пароля, вводимого в форму
    const [error, setError] = useState<string>('');  // Состояние для хранения сообщения об ошибке в случае неудачной аутентификации
    const navigate = useNavigate();  // Хук для навигации между страницами приложения в зависимости от роли пользователя

    /**
     * handleSubmit - Обработчик отправки формы для входа пользователя.
     * 
     * Эта асинхронная функция выполняется при отправке формы входа. Она предотвращает 
     * стандартное поведение формы, отправляет POST-запрос на сервер для аутентификации 
     * пользователя и обрабатывает ответ. 
     * 
     * Основные шаги:
     * 1. Предотвращает стандартное поведение формы с помощью e.preventDefault().
     * 2. Отправляет POST-запрос на '/api/login' с данными пользователя (имя пользователя и пароль).
     * 3. Если ответ от сервера не успешен (response.ok === false), выбрасывает ошибку 
     *    с сообщением 'Некорректный логин или пароль'.
     * 4. Если аутентификация успешна, извлекает токен и роль пользователя из ответа сервера:
     *    - Если роль 'admin' или указан флаг 'is_superuser', перенаправляет на 
     *      административную панель ('/admin').
     *    - Если роль 'user', перенаправляет на панель файлового хранилища ('/storage/{userId}').
     * 5. Обрабатывает любые ошибки, возникающие во время запроса:
     *    - Устанавливает сообщение об ошибке с помощью setError().
     * 
     * Ожидаемые данные от сервера: 
     * - auth_token: Токен аутентификации (строка)
     * - role: Роль пользователя (строка, возможные значения: 'admin', 'user')
     * - id_user: ID пользователя (число)
     * - is_superuser: Флаг, указывающий, является ли пользователь суперпользователем (boolean)
     */
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/token/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            if (!response.ok) {
                throw new Error('Некорректный логин или пароль');
            }

            const data = await response.json();
            
            const { auth_token } = data;
            localStorage.setItem('token', auth_token);
            
            const response_user = await fetch(`${API_BASE_URL}/api/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${auth_token}`,
                },
                body: JSON.stringify({ username }),
            });
            
            if (!response_user.ok) {
                const errorData = await response_user.json();
                throw new Error(errorData.detail || 'Что-то пошло не так');
            }

            const data_user = await response_user.json();
            
            const { role, id_user, is_superuser } = data_user;
            localStorage.setItem('role', role);
            
            // Обновляем роль
            updateRole(role, is_superuser);
            
            // Переход на соответствующую страницу в зависимости от роли
            if (role === 'admin' || is_superuser) {
                navigate('/admin');
            } else {
                navigate(`/storage/${id_user}`);
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Произошла ошибка');
            }
        }
    };

    return (
        <div className="wrap">
            <h2>Введите данные для входа</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-signin">
                    <label>
                        Логин:
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </label>
                </div>                
                <div className="input-signin">
                    <label>
                        Пароль:
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                </div>
                {error && <div style={{ color: 'red' }}>{error}</div>}
                <button className="button-signin" type="submit">Войти</button>
            </form>
        </div>
    );
};
