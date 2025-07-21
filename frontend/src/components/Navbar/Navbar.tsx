import { Link, useLocation } from "react-router-dom";

/**
 * Navbar - компонент навигационной панели.
 *
 * Компонент отображает навигационные ссылки для перехода между различными страницами приложения.
 * В зависимости от текущего пути (location.pathname) и роли пользователя, ссылки отображаются условно.
 * 
 * Основное поведение:
 * - Если пользователь находится на страницах "/storage" или "/admin", 
 *   отображается только кнопка "Выход", ведущая на главную страницу.
 * - На других страницах (Главная, Вход, Регистрация) отображаются соответствующие ссылки.
 * 
 * Условия отображения:
 * - На странице "/admin":
 *   - Отображается только кнопка "Выход".
 * - На страницах, начинающихся с "/storage/":
 *   - Если пользователь имеет роль 'admin' или является суперпользователем (is_superuser), отображается ссылка "Назад" на страницу администрирования и кнопка "Выход".
 *   - Если роль пользователя не 'admin', отображается только кнопка "Выход".
 * - На остальных страницах:
 *   - Отображаются ссылки "Главная", "Вход" и "Регистрация" в зависимости от текущего пути.
 *
 * Пропсы:
 * @param {Function} onLogout - Функция, вызываемая при выходе пользователя из системы.
 * @param {boolean} isAuthenticated - Флаг, указывающий, аутентифицирован ли пользователь.
 * @param {string} role - Роль пользователя, которая влияет на отображение ссылок (например, 'admin').
 * @param {boolean} is_superuser - Флаг, указывающий, является ли пользователь суперпользователем.
 * 
 * Использует хук useLocation из 'react-router-dom' для получения текущего пути.
 * 
 * Доступные ссылки:
 * - Главная ("/")
 * - Вход ("/signin")
 * - Регистрация ("/signup")
 */
export const Navbar = ({ onLogout, role, is_superuser }: { onLogout: () => void; role: string; is_superuser: boolean }) => {
    const location = useLocation();
    
    return (
        <nav>
            <ul className="nav-ul">
                {location.pathname === '/admin' ? (
                    <li className="nav-ul-li">
                        <Link to="/" onClick={onLogout}>Выход</Link>
                    </li>
                ) : (
                    <>
                        {((role === 'admin' || is_superuser) && location.pathname.startsWith('/storage/')) ? (
                            <>                                
                                <li className="nav-ul-li">
                                    <Link to='/admin'>Назад</Link>
                                </li>
                                <li className="nav-ul-li">
                                    <Link to="/" onClick={onLogout}>Выход</Link>
                                </li>
                            </>
                            ) : ((role !== 'admin' && location.pathname.startsWith('/storage/')) ? (
                                    <li className="nav-ul-li">
                                        <Link to="/" onClick={onLogout}>Выход</Link>
                                    </li>
                                ) : (
                                    <>
                                        {location.pathname !== '/' && (
                                            <li className="nav-ul-li"><Link to="/">Главная</Link></li>
                                        )}
                                        {location.pathname !== '/signin' && (
                                            <li className="nav-ul-li"><Link to="/signin">Вход</Link></li>
                                        )}
                                        {location.pathname !== '/signup' && (
                                            <li className="nav-ul-li"><Link to="/signup">Регистрация</Link></li>
                                        )}
                                    </>
                                )
                            )
                        }
                    </>
                )}
            </ul>
        </nav>
    );
};
