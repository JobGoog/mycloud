// Простое шифрование для localStorage (учебный проект)

class SimpleStorage {
    private static encode(value: string): string {
        // Простое кодирование с base64 и префиксом
        try {
            return 'enc_' + btoa(value);
        } catch {
            return value;
        }
    }

    private static decode(value: string): string {
        // Простое декодирование
        try {
            if (value.startsWith('enc_')) {
                return atob(value.substring(4));
            }
            return value;
        } catch {
            return value;
        }
    }

    static setItem(key: string, value: string): void {
        try {
            const encodedValue = this.encode(value);
            localStorage.setItem(key, encodedValue);
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
        }
    }

    static getItem(key: string): string | null {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return null;
            return this.decode(value);
        } catch (error) {
            console.error('Ошибка чтения из localStorage:', error);
            return null;
        }
    }

    static removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Ошибка удаления из localStorage:', error);
        }
    }

    static clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Ошибка очистки localStorage:', error);
        }
    }
}

export default SimpleStorage;