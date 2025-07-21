import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import API_BASE_URL from '../../config';

/**
 * Компонент ProtectedRoute обеспечивает защиту маршрутов для аутентифицированных пользователей.
 *
 * Компонент проверяет наличие токена аутентификации и роль пользователя. 
 * Если токен отсутствует, пользователя перенаправляют на страницу входа ("/signin").
 * Если для доступа к маршруту требуется роль администратора (requireAdmin=true), 
 * и текущая роль пользователя не является администратором, происходит перенаправление 
 * на страницу "/storage/{id_user}", где {id_user} - это ID пользователя.
 *
 * Пропсы:
 * @param {Object} props - Свойства компонента.
 * @param {React.ReactNode} props.children - Дочерние компоненты, которые будут рендериться, если доступ разрешен.
 * @param {boolean} [props.requireAdmin=false] - Опциональный параметр, указывающий, требуется ли роль администратора для доступа к маршруту.
 *
 * @returns {JSX.Element} - Возвращает дочерние компоненты, пока идет проверка, или выполняет перенаправление.
 */
export const ProtectedRoute: React.FC<{
    children: React.ReactNode;
    requireAdmin?: boolean;
}> = ({ children, requireAdmin }) => {
    const [loading, setLoading] = useState(true);
    const [redirectPath, setRedirectPath] = useState<string | null>(null);
    const token = localStorage.getItem('token');
    
    useEffect(() => {
        const roleUser = async () => {
            if (!token) {
                setRedirectPath("/signin"); // Если нет токена, перенаправляем на страницу входа
                setLoading(false);
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/user_info/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Ошибка при загрузке');
                }

                const userInfo = await response.json();                

                // Проверка требуемой роли
                if (requireAdmin && userInfo.role !== 'admin' && !userInfo.is_superuser) {
                    setRedirectPath(`/storage/${userInfo.id_user}`);
                } else {
                    setRedirectPath(null); // Пользователь имеет доступ, продолжаем
                }
            } catch (error) {
                console.error(error);
                setRedirectPath("/signin"); // В случае ошибки перенаправляем на страницу входа
            } finally {
                setLoading(false);
            }
        };

        roleUser();
    }, [requireAdmin, token]);

    if (loading) {
        return <div>Загрузка...</div>;
    }

    // Если нужно перенаправление, отображаем Navigate
    if (redirectPath) {
        return <Navigate to={redirectPath} />;
    }

    // Если все прошло успешно
    return <>{children}</>;
};
