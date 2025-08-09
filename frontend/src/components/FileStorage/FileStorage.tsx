import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './FileStorage.css';
import FileUtils, { FileItem } from '../../utils/fileUtils';
import ErrorHandler from '../../utils/errorHandler';
import API_BASE_URL from '../../config';
import SimpleStorage from '../../utils/storage';

export const FileStorage: React.FC = () => {
    const { id_user } = useParams<{ id_user: string }>(); // Получаем ID пользователя из URL
    const [files, setFiles] = useState<FileItem[]>([]);  // Состояние для хранения списка файлов
    const [error, setError] = useState<string>('');  // Cостояние для хранения сообщения об ошибках
    const [selectedFile, setSelectedFile] = useState<File | null>(null);  // Состояние для хранения выбранного файла для загрузки
    const [comment, setComment] = useState<string>('');  // Состояние для хранения комментария к загружаемому файлу
    const [isLoading, setIsLoading] = useState<boolean>(false);  // Состояние для отслеживания состояния загрузки
    // Загрузка файлов при монтировании компонента
    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const data = await FileUtils.fetchFiles(id_user!);
            setFiles(data);
        } catch (err: unknown) {
            const errorInfo = ErrorHandler.handleError(err, 'Загрузка файлов');
            setError(errorInfo.message);
            setTimeout(() => setError(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [id_user]);
    
    // Обработчик загрузки файла
    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFile) return;
        
        setIsLoading(true);
        try {
            const newFiles = await FileUtils.uploadFile(id_user!, selectedFile, comment);
            setFiles(newFiles);
            setComment('');
            setSelectedFile(null);
        } catch (err: unknown) {
            const errorInfo = ErrorHandler.handleError(err, 'Загрузка файла');
            setError(errorInfo.message);
            setTimeout(() => setError(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчик удаления файла
    const handleDelete = async (id_file: number) => {
        setIsLoading(true);
        try {
            await FileUtils.deleteFile(id_user!, id_file);
            const newFiles = files.filter(file => file.id_file !== id_file);
            setFiles(newFiles);
        } catch (err: unknown) {
            const errorInfo = ErrorHandler.handleError(err, 'Удаление файла');
            setError(errorInfo.message);
            setTimeout(() => setError(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Обработчик переименования файла. Переименовывает файл с указанным идентификатором.
     * 
     * Функция отправляет PATCH-запрос на сервер для изменения имени файла с заданным
     * идентификатором. Если запрос завершается успешно, состояние файла обновляется, 
     * и новое имя устанавливается как текущее имя для переименованного файла. 
     * В случае возникновения ошибки во время процесса переименования, 
     * функция обрабатывает её и выводит сообщение об ошибке пользователю.
     * 
     * @param {number} id_file - Идентификатор файла, который необходимо переименовать.
     * @param {string} newName - Новое имя для файла.
     * @returns {Promise<void>} - Возвращает промис, который разрешается после завершения операции.
     */
    const handleRename = async (id_file: number, newName: string) => {
        setIsLoading(true);
        try {
            const updatedFile = await FileUtils.renameFile(id_user!, id_file, newName);
            // Обновляем файл в списке
            const updatedFiles = files.map(file => 
                file.id_file === id_file ? updatedFile : file
            );
            setFiles(updatedFiles);
        } catch (err: unknown) {
            const errorInfo = ErrorHandler.handleError(err, 'Переименование файла');
            setError(errorInfo.message);
            setTimeout(() => setError(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Обработчик скачивания файла. Загружает файл с указанным идентификатором.
     * 
     * Функция отправляет GET-запрос на сервер для скачивания файла с заданным 
     * идентификатором. Если запрос завершился успешно, обновляется дата последнего 
     * скачивания файла. Если произошла ошибка, выводит сообщение об ошибке пользователю.
     * 
     * @param {number} id_file - Идентификатор файла, который необходимо скачать.
     * @returns {Promise<void>} - Возвращает промис, который разрешается после завершения операции.
     */
    const handleDownload = async (id_file: number) => {
        setIsLoading(true);
        const token = SimpleStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/storage/download/${id_file}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });    
    
            if (!response.ok) {
                throw new Error('Ошибка при скачивании файла');
            }

            const update_last_download_date = response.headers.get('X-Last-Download-Date');  // Получаем дату последнего скачивания из заголовка ответа
            
            setFiles(
                files.map(file => 
                    file.id_file === id_file 
                        ? { ...file, last_download_date: update_last_download_date ?? file.last_download_date } // Обновляем поле last_download_date
                        : file
                )
            );

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
    
            // Проверяем, есть ли имя файла, если нет, используем значение по умолчанию
            const filename = response.headers.get('X-Filename');
            a.download = filename ? decodeURIComponent(filename) : `file_${id_file}`;
            
            // Удаляем элемент 'a' после нажатия
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            // Очищаем объект URL после скачивания
            window.URL.revokeObjectURL(url); 
        } catch (err) {
            console.error(err);
            setError('Произошла ошибка при скачивании файла');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Копирует текст в буфер обмена, используя временный элемент textarea.
     * 
     * Эта функция создает временный элемент textarea, помещает в него
     * текст, который необходимо скопировать, выделяет его и выполняет
     * команду копирования. После копирования временный элемент удаляется из DOM.
     * 
     * @param {string} text - Текст, который нужно скопировать.
     * @returns {void} - Не возвращает никаких значений.
     */
    const fallbackCopyTextToClipboard = (text: string): void => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    };
    
    /**
     * Обработчик генерации и копирования ссылки для скачивания файла.
     * 
     * Функция отправляет POST-запрос на сервер для генерации уникальной ссылки 
     * на файл с заданным идентификатором. Если запрос завершается успешно,
     * ссылка копируется в буфер обмена и выводится сообщение об успешном
     * копировании пользователю. В случае ошибки при выполнении запроса
     * выводится соответствующее сообщение об ошибке.
     * 
     * navigator.clipboard обычно доступен только на страницах, загруженных по HTTPS,
     * или на localhost (при разработке). Если сайт развернут по HTTP, необходимо 
     * развернуть его через HTTPS, чтобы использовать Clipboard API. Например, можно
     * использовать такие решения, как [Let's Encrypt](https://letsencrypt.org/), 
     * чтобы получить бесплатный SSL-сертификат.
     * 
     * @param {number} id_file - Идентификатор файла, для которого нужно 
     *                            сгенерировать ссылку.
     * @returns {Promise<void>} - Возвращает промис, который разрешается после завершения операции.
     */
    const handleCopyLink = async (id_file: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/storage/link/${id_user}/${id_file}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${SimpleStorage.getItem('token')}`, // аутентификация через токен
                },
            });

            const data = await response.json();
            if (response.ok) {
                try {
                    await navigator.clipboard.writeText(data.link);
                    alert(`Ссылка ${data.link} скопирована в буфер обмена!`);
                } catch {
                    // Если копирование через Clipboard API не удалось, используем fallback
                    fallbackCopyTextToClipboard(data.link);
                    alert('Ссылка скопирована в буфер обмена через fallback!');
                }
            } else {
                alert(data.detail || 'Ошибка при копировании ссылки');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`Ошибка сети ${error}`);
        }
    };


        return (
            <div className="wrap">
                <h2>Файлы</h2>
                {isLoading && <div>Загрузка...</div>}
                {error && <div style={{ color: 'red' }}>{error}</div>}
                <form className="form-storage" onSubmit={handleUpload}>
                    <input className="input-storage"
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Комментарий для файла"
                        required
                    />
                    <button type="submit">Загрузить</button>
                </form>
                {files.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Имя файла</th>
                                <th>Комментарий</th>
                                <th>Размер (байт)</th>
                                <th>Дата загрузки</th>
                                <th>Дата последнего скачивания</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map(file => (
                                <tr key={file.id_file}>
                                    <td>{file.original_name}</td>
                                    <td>{file.comment}</td>
                                    <td>{file.size}</td>
                                    <td>{new Date(file.upload_date).toLocaleString()}</td>
                                    <td>
                                        {file.last_download_date ? new Date(file.last_download_date).toLocaleString() : 'Нет данных'}
                                    </td>
                                    <td>
                                        <button onClick={() => handleDelete(file.id_file)}>Удалить</button>
                                        <button onClick={() => {
                                            const newName = prompt('Введите новое имя файла:');
                                            if (newName?.trim()) {
                                                handleRename(file.id_file, newName);
                                            } else {
                                                alert('Имя файла не может быть пустым.');
                                            }                                            
                                        }}>
                                            Переименовать
                                        </button>
                                        <button onClick={() => handleDownload(file.id_file)} >Скачать</button>
                                        <button onClick={() => handleCopyLink(file.id_file)}>Копировать ссылку</button>
                                        <a href={`${API_BASE_URL}/api/storage/view/${id_user}/${file.id_file}/`} target="_blank" rel="noopener noreferrer">Просмотр</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Нет загруженных файлов.</p>
                )}
            </div>
    );
};
