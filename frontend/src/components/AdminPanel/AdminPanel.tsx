import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import API_BASE_URL from '../../config';
import './AdminPanel.css';

// Определение типа пользователя
interface User {
    id_user: number;
    email: string;
    username: string;
    fullname: string;
    role: string;
    storages: File[];
}

interface File {
    id_file: number;
    original_name: string;
    size: number;
}

/**
 * AdminPanel - компонент, который отображает список пользователей
 * и предоставляет возможности для управления пользователями, 
 * включая удаление, изменение роли и просмотр файлового хранилища.
 *
 * - При загрузке компонента автоматически загружается список пользователей с сервера.
 * - Пользователи отображаются в отсортированном порядке: администраторы сначала, затем остальные
 *   пользователи в алфавитном порядке по имени.
 * - Предоставляет функции для удаления пользователей и изменения их ролей.
 * 
 * @returns {JSX.Element} - Возвращает JSX компонент, представляющий административную панель.
 * 
 * @example
 * Пример использования:
 * <AdminPanel />
 */
export const AdminPanel: React.FC = () => {    
    const [users, setUsers] = useState<User[]>([]);  // Используем состояние для хранения списка пользователей
    const auth_token = localStorage.getItem('token');
    const navigate = useNavigate();  // Хук для навигации между страницами
    
    /**
     * fetchUsers - функция для загрузки пользователей с сервера.
     * Она извлекает список пользователей из API, сортирует его и обновляет состояние компонента.
     * 
     * @async
     * @function
     * @throws {Error} - выбрасывает ошибку при проблемах с загрузкой данных.
     */
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);

            if (!response.ok) {
                throw new Error('Ошибка при загрузке пользователей');
            }

            const data: User[] = await response.json();
            
            // Сортируем пользователей: admin сначала, затем остальные в алфавитном порядке
            const sortedUsers = data.sort((a, b) => {
                // Проверяем: admin ли пользователь, и если да, то возвращаем -1, чтобы он был первым
                if (a.role === 'admin' && b.role !== 'admin') return -1; 
                if (a.role !== 'admin' && b.role === 'admin') return 1;

                // Если роли одинаковые, сортируем по username
                return a.username.localeCompare(b.username);
            });
            
            setUsers(sortedUsers);  // Устанавливаем полученный список пользователей в состояние
        } catch (error) {
            console.error(error);
        }
    };

    // Вызывается при загрузке компонента
    useEffect(() => {
        fetchUsers();
    }, []);

    /**
     * handleDeleteUser - функция для удаления пользователя по ID.
     * 
     * @async
     * @function
     * @param {number} id_user - ID пользователя, которого нужно удалить.
     * @throws {Error} - выбрасывает ошибку при проблемах с удалением пользователя.
     */
    const handleDeleteUser = async (id_user: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${id_user}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${auth_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка при удалении пользователя');
            }

            const newData = users.filter(user => user.id_user !== Number(id_user));

            setUsers(newData);
        } catch (error) {
            console.error(error);
        }
    };

    /**
     * toggleAdmin - функция для изменения роли пользователя (admin или user).
     * 
     * @async
     * @function
     * @param {number} id_user - ID пользователя, роль которого нужно изменить.
     * @param {string} newRole - новая роль для пользователя (например, "user" или "admin").
     * @throws {Error} - выбрасывает ошибку при проблемах с изменением роли пользователя.
     */
    const toggleAdmin = async (id_user: number, newRole: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${id_user}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${auth_token}`,
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) {
                throw new Error('Ошибка при изменении роли пользователя');
            }

            const updatedRole = await response.json();

            setUsers(users.map(user => user.id_user === id_user ? { ...user, role: updatedRole.role } : user));
            
            // После изменения роли заново загружаем пользователей
            await fetchUsers();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="admin-panel">
            <h2 className="admin-panel__title">Администраторы и пользователи</h2>
    
            <ul className="admin-panel__list">
                {users.map(user => {
                    const totalFileSize = user.storages.reduce((total, file) => (
                        total + (file.size || 0)
                    ), 0);
    
                    return (
                        <li key={user.id_user} className="admin-panel__item">
                            {Object.entries(user).map(([key, value]) => (
                                (key !== 'password' && key !== 'id_user') && (
                                    (key !== 'storages') ? (
                                        <div key={key}>
                                            <strong>{key}:</strong> {value}
                                        </div>
                                    ) : (
                                        <div key={key}>
                                            <strong>{key}:</strong> {` ${value.length} files; Total Size: ${totalFileSize} bytes`}
                                        </div>
                                    )
                                )
                            ))}
                            <button className="admin-panel__button" onClick={() => navigate(`/storage/${user.id_user}`)}>Хранилище</button>
                            <button className="admin-panel__button" onClick={() => {
                                const newRole = prompt('Введите новую роль:', user.role);
                                if (newRole) toggleAdmin(user.id_user, newRole);
                            }}>Изменить роль</button>
                            <button className="admin-panel__button" onClick={() => handleDeleteUser(user.id_user)}>Удалить</button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default AdminPanel;
