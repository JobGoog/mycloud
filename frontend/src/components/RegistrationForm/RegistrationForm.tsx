import "./RegistrationForm.css";
import API_BASE_URL from '../../config';
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
        const usernameRegex = /^[a-zA-Z][a-zA-Z0-9]{3,19}$/;
        if (!usernameRegex.test(username)) {
            setError('Логин должен начинаться с буквы, содержать только латинские буквы и цифры, и быть длиной от 4 до 20 символов.');
            return false;
        }        
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError('Неверный формат email.');
            return false;
        }        
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            setError('Пароль должен содержать минимум 6 символов, одну заглавную букву, одну цифру и один специальный символ.');
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
                throw new Error(errorData.message || 'Ошибка во время регистрации');
            }
            setSuccess('Регистрация прошла успешно!');
            setError('');
            setTimeout(() => {
                navigate('/signin'); 
            }, 2000);
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
