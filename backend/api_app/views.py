import mimetypes
import os
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, StreamingHttpResponse
from django.views import View
from django.utils.crypto import get_random_string
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
import urllib.parse
from .serializers import UserSerializer, StorageSerializer
from .models import User, Storage
from .permissions import IsAuthenticatedOrViewFile
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class UserView(APIView):
    permission_classes = [AllowAny]
    # Метод для обработки GET-запрос: получение списка всех пользователей с данными или получение данных о пользователе по токену
    def get(self, request, id_user=None):
        logger.info('GET запрос: %s', request.path)
        if request.path == '/api/users/user_info/':
            return self.get_user_info(request)
        
        queryset = User.objects.all()
        serializer = UserSerializer(queryset, many=True)
        logger.debug('Список пользователей: %s', queryset)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    def get_user_info(self, request):
        logger.info('GET запрос: Получение данных о пользователе по токену')
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)

        user = request.user
        user_data = {
            'id_user': user.id_user,
            'email': user.email,
            'username': user.username,
            'fullname': user.fullname,
            'role': user.role,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }
        logger.debug('Данные о пользователе: %s', user_data)
        return Response(user_data)

    # Метод для обработки POST-запроса: создание нового пользователя, вход и выход в(из) личного кабинета
    def post(self, request):
        logger.info('POST запрос с данными: %s', request.data)
        if len(request.data) == 1 and list(request.data.keys())[0] == 'username' :     
            # вход в личный кабинет
            return self.login_user(request)
        elif 'password' in request.data:
            # создание нового пользователя
            return self.create_user(request)
        else:
            # выход из личного кабинета
            return self.logout(request)

    def logout(self, request):
        logger.info('ПOST запрос: Выход из личного кабинета')
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)

        request.user.auth_token.delete()
        logger.info('Пользователь вышел: %s', request.user.username)
        return Response(status=204)

    def create_user(self, request):
        logger.info('Создание нового пользователя с данными: %s', request.data)
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            logger.info('Пользователь создан: %s', user.username)
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        logger.warning('Невалидные данные: %s', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def login_user(self, request):
        logger.info('Вход в личный кабинет: %s', request.data["username"])
        self.permission_classes = [IsAuthenticated]
        try:
            self.check_permissions(request)
            user = User.objects.get(username=request.data["username"])
        except AuthenticationFailed:
            logger.error('Аутентификация не удалась для пользователя: %s', request.data["username"])
            return Response({"detail": "Не авторизован."}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            logger.warning('Пользователь не найден: %s', request.data["username"])
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
        else:
            logger.info('Пользователь успешно вошел в систему: %s', user.username)
            return Response({
                'id_user': user.id_user,
                'role': user.role,
                'is_superuser': user.is_superuser,
            }, status=status.HTTP_200_OK)

    # Метод для обработки DELETE-запроса: удаление пользователя по ID
    def delete(self, request, **kwargs):
        logger.info('DELETE запрос на удаление пользователя: %s', kwargs.get("id_user"))
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)
        id_user = kwargs.get("id_user")
        try:
            user = User.objects.get(id_user=id_user)
            # Получаем все связанные записи Storage и удаляем их
            storages = user.storages.all()
            for storage in storages:
                storage.delete()  # вызывется метод delete из Storage, и файл будет удалён из файловой системы
            user.delete()
            logger.info('Пользователь и его файлы удалены:: %s', id_user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            logger.warning('Пользователь не найден по user ID: %s', id_user)
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)

    # Метод для обработки PATCH-запроса: изменение роли пользователя
    def patch(self, request, **kwargs):
        logger.info('PATCH запрос на изменение роли пользователя: %s', kwargs.get("id_user"))
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)
        id_user = kwargs.get("id_user")
        if id_user is None:
            logger.error('Требуется User ID.')
            return Response({"detail": "Требуется User ID."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id_user=id_user)
        except User.DoesNotExist:
            logger.warning('Пользователь не найден по user ID: %s', id_user)
            return Response({"detail": "Пользователь не найден."}, status=status.HTTP_404_NOT_FOUND)
        
        if "role" in request.data:
            user.role = request.data["role"]
            user.save()
            serializer = UserSerializer(user)
            logger.info('Роль пользователя успешно обновлена: %s', user.username)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        logger.error('Неправильное поле для обновления: %s', request.data)
        return Response({"detail": "Неправильное поле для обновления."}, status=status.HTTP_400_BAD_REQUEST)


class StorageView(APIView):
    permission_classes = [IsAuthenticatedOrViewFile]
    
    # Метод для Обновления поля last_download_date
    def update_last_download_date(self, file: Storage):
        logger.info(f'Обновление даты последнего скачивания для файла: {file.original_name}')
        file.last_download_date = timezone.now()
        file.save(update_fields=['last_download_date'])

    # Метод для очистки истекших токенов для специальных ссылок
    def clean_expired_tokens(self):
        objects = Storage.objects.filter(token_expiration__lt=timezone.now())
        # Обновляем истекшие токены, очищая поля token и token_expiration
        if objects:
            logger.info(f'Удаление устаревших токенов {len(objects)} объектов')
            objects.update(token=None, token_expiration=None)

    # Метод для обработки GET-запроса: получение списка всех файлов пользователя, просмотр файла, скачивание файла
    def get(self, request, id_user=None, id_file=None, token=None):
        logger.info('GET запрос: id_user=%s, id_file=%s, token=%s', id_user, id_file, token)
        if id_user and id_file:
            # просмотр файла
            return self.view_file(request, id_user, id_file)
        elif id_file:
            # скачивание файла
            return self.download_file(request, id_file)
        elif token:
            # скачивание файла по токену(специальной ссылке)
            return self.download_file_by_token(request, token)
        else:
            self.clean_expired_tokens()  # удаляем истекшие ссылки
            # получение списка всех файлов
            queryset = Storage.objects.filter(id_user=id_user)
            serializer = StorageSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
    
    # Дополнительный метод к view_file, download_file, download_file_by_token
    def get_file_params(self, id_file=None, token=None, options=None):
        """
        Метод для получения файла, путь к нему, MIME-тип, имя файла
        """
        logger.debug('Получение параметров файла: id_file=%s, token=%s', id_file, token)
        if token:
            file = Storage.objects.get(token=token)
        elif id_file: 
            file = Storage.objects.get(id_file=id_file)

        file_path = file.file.path

        if options == "os.path" and not os.path.exists(file_path):
            logger.error('Файл не найден: %s', file_path)
            raise Http404("Файл не найден")

        # Получаем MIME-тип файла
        content_type, _ = mimetypes.guess_type(file_path)
        
        # Если MIME-тип не удалось определить, устанавливаем значение по умолчанию
        if content_type is None:
            content_type = 'application/octet-stream'
        encoded_file_name = urllib.parse.quote(file.original_name)

        return file_path, content_type, encoded_file_name, file
    
    # Дополнительный метод к download_file, download_file_by_token
    def file_iterator(self, file_name, chunk_size=512):
        """
        Функция file_iterator позволяtn считывать файлы по частям, 
        управляя использованием памяти и делая программу более производительной
        """
        logger.debug('Итерация по файлу: %s', file_name)
        with open(file_name, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    # Метод для обработки GET-запроса: просмотр файла    
    def view_file(self, request, id_user, id_file):
        logger.info('Предоставление файла для просмотра: id_file=%s', id_file)
        try:
            file_path, content_type, encoded_file_name, _ = self.get_file_params(id_file=id_file, options="os.path")

            # Если файл текстовый, открываем его с кодировкой
            if content_type in ['text/plain', 'text/html', 'text/csv']:
                with open(file_path, 'r', encoding='utf-8') as file:
                    response = HttpResponse(file.read(), content_type=f"{content_type}; charset=utf-8")
            else:
                # Для остальных типов файлов, используем FileResponse
                response = FileResponse(open(file_path, 'rb'), content_type=content_type)

            response['Content-Disposition'] = f'inline; filename="{encoded_file_name}"'
            return response
        except Storage.DoesNotExist:
            logger.warning('Файл не найден для просмотра: id_file=%s', id_file)
            raise Http404("Файл не найден")
        
    # Вариант 2:работает но 2 проблемы:
    # 1. не отображает нормально русские буквы в txt файлах, 
    # 2. если браузер не поддерживает просмотр то скачивает файл, но под непонятным именем
    # def view_file(self, request, id_user, id_file):
    #     storage = get_object_or_404(Storage, id_user=id_user, id_file=id_file)
    #     file_path = storage.file.path

    #     # Определяем тип контента файла
    #     content_type = mimetypes.guess_type(file_path)[0]
    #     print("content_type", content_type)
    #     if content_type is None:
    #         content_type = 'application/octet-stream'
    #     print("content_type", content_type, type(content_type))

    #     # Открываем файл и отправляем его содержимое в ответ
    #     with open(file_path, 'rb') as file:
    #         encoded_file_name = urllib.parse.quote(storage.original_name)
    #         response = HttpResponse(file, content_type=content_type)
    #         response['Content-Disposition'] = f'inline; filename="{encoded_file_name}"'
    #         return response
        
    # Метод для обработки GET-запроса: скачивание файла
    def download_file(self, request, id_file):
        logger.info('Скачивание файла: id_file=%s', id_file)
        try:
            file_path, content_type, encoded_file_name, file = self.get_file_params(id_file=id_file)

            self.update_last_download_date(file)

            response = StreamingHttpResponse(self.file_iterator(file_path), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{encoded_file_name}"'
            response['X-Filename'] = encoded_file_name
            
            response['X-Last-Download-Date'] = file.last_download_date.isoformat()
            return response
        except Storage.DoesNotExist:
            logger.warning('Файл не найден при скачивании: id_file=%s', id_file)
            return HttpResponse(status=404)
    
    # Метод к GET-запросу: скачивание файла по ссылке
    def download_file_by_token(self, request, token):
        logger.info('Скачивание файла по токену: token=%s', token)
        try:
            file_path, content_type, encoded_file_name, file = self.get_file_params(token=token, options="os.path")

            # Проверяем, не истек ли токен
            if file.token_expiration < timezone.now():
                logger.warning('Ссылка устарела для токена: %s', token)
                return Response({"detail": "Ссылка устарела."}, status=status.HTTP_403_FORBIDDEN)

            # Обновляем поле last_download_date
            self.update_last_download_date(file)

            response = StreamingHttpResponse(self.file_iterator(file_path), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{encoded_file_name}"'
            response['X-Filename'] = encoded_file_name
            logger.info('Файл %s успешно скачан по токену', encoded_file_name)
            return response

        except Storage.DoesNotExist:
            logger.warning('Файл не найден по токену: token=%s', token)
            return Response({"detail": "Файл не найден."}, status=status.HTTP_404_NOT_FOUND)

    # Метод для обработки POST-запроса: загрузка нового файла, генерации ссылки
    def post(self, request, id_user=None, id_file=None):
        logger.info('POST запрос: id_user=%s, id_file=%s', id_user, id_file)
        if id_file and id_user:
            # генерация ссылки
            return self.generate_file_link(request, id_user, id_file)
        else:
            # загрузка файла
            return self.upload_file(request, id_user)
        
    # Дополнительный метод к POST-запросу post: генерация ссылки
    def generate_file_link(self, request, id_user, id_file):
        logger.info('Генерация ссылки для файла: id_user=%s, id_file=%s', id_user, id_file)
        # Проверяем, существует ли файл
        try:
            storage_item = Storage.objects.get(id_file=id_file, id_user=id_user)
        except Storage.DoesNotExist:
            logger.error('Файл не найден: id_user=%s, id_file=%s', id_user, id_file)
            return Response({"detail": "Файл не найден."}, status=status.HTTP_404_NOT_FOUND)

        # Генерируем уникальный токен
        unique_token = get_random_string(length=32)

        # Сохраняем токен
        storage_item.token = unique_token
        storage_item.token_expiration = timezone.now() + timezone.timedelta(minutes=5)
        storage_item.save()

        # Формируем ссылку
        link = request.build_absolute_uri(f"/api/storage/download/{unique_token}/")
        logger.info('Ссылка сгенерирована: %s', link)

        return Response({"link": link}, status=status.HTTP_200_OK)
    
    # Дополнительный метод к POST-запросу post: загрузка нового файла
    def upload_file(self, request, id_user):
        logger.info('Загрузка файла: id_user=%s', id_user)
        file = request.data["file"]
        comment = request.data["comment"]
        
        try:
            user = User.objects.get(id_user=id_user)
        except User.DoesNotExist:
            logger.error('Пользователь не найден: id_user=%s', id_user)
            return Response({"detail": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

        # Сохраняем файл и информацию о файле в базе данных
        storage_file = Storage(
            id_user=user,
            original_name=file.name,
            comment=comment,
            size=file.size,
            file=file
        )
        storage_file.save()

        if file.name.replace(' ', '_') != storage_file.file.name.split('/')[-1]:
            new_name = storage_file.file.name.split('/')[-1]  # Получаем имя файла без пути
            logger.warning("Файл %s уже существует. Изменяем его на %s", file.name, new_name)
            storage_file.new_name = new_name
            storage_file.save()
        logger.info('Файл %s загружен успешно', file.name)
        return self.get(request, id_user)
    
    # Метод для обработки PATCH-запроса: переименование файла
    def patch(self, request, id_user, id_file):
        logger.info('PATCH запрос для переименования файла: id_user=%s, id_file=%s', id_user, id_file)
        new_name = request.data["name"]
        # Проверяем, существует ли файл с таким именем
        if os.path.exists(os.path.join(settings.MEDIA_ROOT, "uploads", new_name)):
            logger.error('Файл с таким именем уже существует: %s', new_name)
            return Response({"detail": "Файл с таким именем уже существует"}, status=status.HTTP_400_BAD_REQUEST)        
        try:
            file_to_rename = Storage.objects.get(id_file=id_file)
            old_file_path = file_to_rename.file.path
            new_file_path = os.path.join(os.path.dirname(old_file_path), new_name.replace(" ", "_"))
            os.rename(old_file_path, new_file_path)
            file_to_rename.original_name = new_name
            file_to_rename.file.name = os.path.join('uploads', new_name.replace(" ", "_"))
            file_to_rename.new_name = None
            file_to_rename.save()
            serializer = StorageSerializer(file_to_rename)

            logger.info('Файл переименован: %s', new_name)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Storage.DoesNotExist:
            logger.error('Файл с указанным id_file=%s не существует в базе данных', id_file)
            return Response({"detail": f"Файл с указанным id_file = {id_file} не существует в базе данных"}, status=status.HTTP_404_NOT_FOUND)
        except FileNotFoundError:
            logger.error('Файл для переименования не найден на файловой системе: id_file=%s', id_file)
            return Response({"detail": "Файл для переименования не найден на файловой системе"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Ошибка при переименовании файла: %s', str(e))
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    # Метод для обработки DELETE-запроса: удаление файла по ID
    def delete(self, request, id_user, id_file): 
        logger.info('DELETE запрос для файла: id_user=%s, id_file=%s', id_user, id_file)       
        try:
            file = Storage.objects.get(id_user=id_user, id_file=id_file)
            file.delete()
            logger.info('Файл с id_file=%s был успешно удалён', id_file)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Storage.DoesNotExist:
            logger.error('Файл не найден для удаления: id_file=%s', id_file)
            return Response({"Детали": "Файл не найден."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Ошибка при удалении файла: %s', str(e))
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
