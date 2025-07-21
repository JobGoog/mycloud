import './App.css';
import API_BASE_URL from './config';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useEffect, useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { AdminPanel } from './components/AdminPanel';
import { FileStorage } from './components/FileStorage';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';


/**
 * Компонент App
 * 
 * Главный компонент приложения, который отвечает за маршрутизацию и отображение
 * различных страниц. Использует библиотеку `react-router-dom` для управления маршрутами.
 * 
 * Структура приложения включает в себя:
 * - Navbar: навигационная панель с ссылками на разные страницы приложения.
 * - Routes: определяет маршруты для следующих страниц:
 *   - Главная ("/"): отображает приветственное сообщение и краткое описание функционала приложения.
 *   - Вход ("/signin"): отображает форму для входа пользователя и обновляет состояние при успешном входе.
 *   - Регистрация ("/signup"): отображает форму для регистрации нового пользователя.
 *   - Файловое хранилище ("/storage/:id_user"): защищенный маршрут для доступа к файлам пользователя, требует аутентификации.
 *   - Панель администратора ("/admin"): защищенный маршрут для доступа к административной панели, доступен только суперпользователям.
 * 
 * Компонент также управляет состоянием аутентификации пользователя, используя
 * состояние `isSuperuser`, которое показывает, является ли пользователь суперпользователем.
 * При загрузке приложения роль пользователя извлекается из `localStorage`, и состояние обновляется, 
 * если ролей нет, устанавливается значение по умолчанию.
 * 
 * @returns {JSX.Element} - Возвращает JSX, представляющий главный интерфейс приложения с навигацией и маршрутами.
 */
const App = () => {
    const [role, setRole] = useState<string>(localStorage.getItem('role') ?? '');
    const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
    
    // Функция выхода из системы
    const handleLogout = async () => {        

        const response = await fetch(`${API_BASE_URL}/auth/token/logout/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Не удалось выйти.');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('id_user');
        localStorage.removeItem('role');
        setRole('');
        setIsSuperuser(false);
        console.log('Вы успешно вышли.');
    };
    
    // Обновляет состояние роли пользователя при изменении
    const updateRole = (userRole: string, is_superuser: boolean) => {
        setRole(userRole);
        setIsSuperuser(is_superuser);
    };

    // проверяем наличие роли при загрузке приложения (один раз при монтировании)
    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        if (storedRole) {
            setRole(storedRole);
        }
    }, []);

    return (
        <Router>
            <Navbar onLogout={handleLogout} role={role} is_superuser={isSuperuser} />
            <Routes>
                <Route path="/" element={
                    <div className="wrap">
                        <h1>Облачное хранилище My Cloud</h1>
                        <p>Приложение позволяет пользователям отображать, загружать, отправлять, скачивать и переименовывать файлы.</p>
                        <p>Выберите действие для продолжения</p>
                    </div>
                } />
                <Route path="/signin" element={<LoginForm updateRole={updateRole} />} />
                <Route path="/signup" element={<RegistrationForm />} />
                <Route path="/storage/:id_user" element={
                    <ProtectedRoute >
                        <FileStorage />
                    </ProtectedRoute>
                } />
                <Route path="/admin" element={
                    <ProtectedRoute requireAdmin={true}>
                        <AdminPanel />
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
};

export default App
