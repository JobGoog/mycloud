// Утилиты для работы с файлами в FileStorage

import API_BASE_URL from '../config';
import SimpleStorage from './storage';

export interface FileItem {
    id_file: number;
    original_name: string;
    comment: string;
    size: number;
    upload_date: string;
    last_download_date: string;
}

export class FileUtils {
    // Получение токена авторизации
    static getAuthToken(): string | null {
        return SimpleStorage.getItem('token');
    }

    // Загрузка списка файлов
    static async fetchFiles(id_user: string): Promise<FileItem[]> {
        const token = this.getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/api/storage/${id_user}`, {
            headers: {
                'Authorization': `Token ${token}`,
            },
        });
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить файлы');
        }
        
        return await response.json();
    }

    // Загрузка файла на сервер
    static async uploadFile(id_user: string, file: File, comment: string): Promise<FileItem[]> {
        const token = this.getAuthToken();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('comment', comment);

        const response = await fetch(`${API_BASE_URL}/api/storage/${id_user}/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить файл');
        }

        return await response.json();
    }

    // Удаление файла
    static async deleteFile(id_user: string, id_file: number): Promise<void> {
        const token = this.getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/api/storage/${id_user}/${id_file}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Не удалось удалить файл');
        }
    }

    // Переименование файла
    static async renameFile(id_user: string, id_file: number, newName: string): Promise<FileItem> {
        const token = this.getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/api/storage/${id_user}/${id_file}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName }),
        });

        if (!response.ok) {
            throw new Error('Не удалось переименовать файл');
        }

        return await response.json();
    }

    // Создание ссылки для скачивания
    static async createDownloadLink(id_user: string, id_file: number): Promise<string> {
        const token = this.getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/api/storage/link/${id_user}/${id_file}/`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Не удалось создать ссылку');
        }

        const data = await response.json();
        return data.link;
    }

    // Форматирование размера файла
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Форматирование даты
    static formatDate(dateString: string): string {
        if (!dateString) return 'Не скачивался';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

export default FileUtils;