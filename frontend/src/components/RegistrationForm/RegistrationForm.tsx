import "./RegistrationForm.css";
import API_BASE_URL from '../../config';
import ErrorHandler from '../../utils/errorHandler';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const RegistrationForm: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [fullname, setFullName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const navigate = useNavigate();

    /**
     * Функция для валидации введённых данных формы регистрации.
     * 
     * Эта функция проверяет корректность значений, введённых пользователем в поля
     * формы (логин, email и пароль). В случае возникновения ошибок, соответствующее 
     * сообщение об ошибке устанавливается в состояние `error`.
     * 
     * Если все проверки пройдены успешно, функция сбрасывает сообщения об ошибках
     * и возвращает `true`, указывая, что форма корректна.
     * 
     * @returns {boolean} - Возвращает `true`, если все поля формы валидны.
     *                      Возвращает `false`, если есть ошибки валидации.
     */
    const validateForm = (): boolean => {
        // Приводим валидацию логина в соответствие с backend требованиями
        if (username.length < 3) {
            setError('Логин должен содержать минимум 3 символа.');
            return false;
        }
        if (username.length > 20) {
            setError('Логин не должен превышать 20 символов.');
            return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Логин может содержать только латинские буквы, цифры и подчеркивание.');
            return false;
        }        
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError('Неверный формат email.');
            return false;
        }        
        // Усиленная валидация пароля в соответствие с backend требованиями
        if (password.length < 8) {
            setError('Пароль должен содержать минимум 8 символов.');
            return false;
        }
        if (password.length > 50) {
            setError('Пароль не должен превышать 50 символов.');
            return false;
        }
        if (!/[a-z]/.test(password)) {
            setError('Пароль должен содержать хотя бы одну маленькую букву.');
            return false;
        }
        if (!/[A-Z]/.test(password)) {
            setError('Пароль должен содержать хотя бы одну большую букву.');
            return false;
        }
        if (!/[0-9]/.test(password)) {
            setError('Пароль должен содержать хотя бы одну цифру.');
            return false;
        }
        if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
            setError('Пароль должен содержать хотя бы один специальный символ (!@#$%^&*()_+-=[]{}|;:,.<>?).');
            return false;
        }
        setError(''); 
        return true;
    };

    /**
     * Обработчик события отправки формы регистрации.
     * 
     * Эта асинхронная функция выполняется при отправке формы. 
     * Она предотвращает стандартное поведение отправки формы и:
     * 1. Проверяет корректность введённых данных с помощью функции `validateForm()`.
     *    Если данные некорректные, функция завершает выполнение без дальнейших действий.
     * 2. Если валидация прошла успешно, функция отправляет POST-запрос на сервер 
     *    по адресу HTTP_API_BASE_URL/api/register с введёнными данными 
     *    (логин, полное имя, email и пароль) в формате JSON.
     * 3. Если ответ от сервера не успешен (код ответа не в диапазоне 200-299), 
     *    функция обрабатывает это как ошибку, пытаясь извлечь сообщение об ошибке
     *    из ответа сервера и выбрасывает его.
     * 4. При успешной регистрации устанавливается сообщение об успешной регистрации 
     *    в состояние `success`, а сообщение об ошибке сбрасывается.
     *    После этого происходит автоматическое перенаправление пользователя 
     *    на страницу входа ('/signin') через 2 секунды.
     * 5. В случае возникновения ошибки (например, проблем с сетью или с ответом сервера),
     *    функция обрабатывает её и устанавливает сообщение об ошибке в состояние `error`.
     * 
     * @param {React.FormEvent<HTMLFormElement>} e - Объект события,
     * представляющий событие отправки формы.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/`, {  
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, username, fullname, password }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                
                // Обрабатываем ошибки валидации Django REST Framework
                const errorMessages: string[] = [];
                
                if (errorData.username) {
                    errorMessages.push(`Логин: ${errorData.username.join(', ')}`);
                }
                if (errorData.email) {
                    errorMessages.push(`Email: ${errorData.email.join(', ')}`);
                }
                if (errorData.password) {
                    errorMessages.push(`Пароль: ${errorData.password.join(', ')}`);
                }
                if (errorData.fullname) {
                    errorMessages.push(`Полное имя: ${errorData.fullname.join(', ')}`);
                }
                
                // Если есть общие ошибки (non_field_errors)
                if (errorData.non_field_errors) {
                    errorMessages.push(...errorData.non_field_errors);
                }
                
                // Если есть конкретные ошибки полей, показываем их
                if (errorMessages.length > 0) {
                    throw new Error(errorMessages.join(' '));
                }
                
                // Если ошибки в неожиданном формате, показываем общее сообщение
                throw new Error(errorData.detail || errorData.message || 'Ошибка при регистрации. Проверьте введенные данные.');
            }
            setSuccess('Регистрация прошла успешно!');
            setError('');
            setTimeout(() => {
                navigate('/signin'); 
            }, 2000);
        } catch (err: unknown) {
            const errorInfo = ErrorHandler.handleError(err, 'Регистрация пользователя');
            setError(errorInfo.message);
        }
    };

    return (
        <div className="wrap">
            <h2>Введите данные для регистрации</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-signup">

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
                <div className="input-signup">
                    <label>
                        Полное имя:
                        <input
                            type="text"
                            value={fullname}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </label>
                </div>
                <div className="input-signup">
                    <label>
                        Email:
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                </div>
                <div className="input-signup">
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
                {success && <div style={{ color: 'green' }}>{success}</div>}
                <button className="button-signup" type="submit">Зарегистрироваться</button>
            </form>
        </div>
    );
};
