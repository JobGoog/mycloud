import "./LoginForm.css";

import API_BASE_URL from '../../config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC<{ updateRole: (role: string, is_superuser: boolean) => void }> = ({ updateRole }) => {
    const [username, setUsername] = useState<string>('');  
    const [password, setPassword] = useState<string>('');  
    const [error, setError] = useState<string>('');  
    const navigate = useNavigate();  

    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/login/`, {
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
            
            
            updateRole(role, is_superuser);
            
            
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
