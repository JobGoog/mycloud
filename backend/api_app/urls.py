from django.urls import path
from .views import UserView, StorageView

urlpatterns = [
    path("users/", UserView.as_view(), name="users_list-add_user"),  # Для GET: список пользователей и POST: создание нового пользователя, вход (выход) в(из) личный кабинет
    path("users/user_info/", UserView.as_view(), name="get_user_info"),  # Для GET: получение информации о пользователе
    path("users/<int:id_user>/", UserView.as_view(), name="user_delete-change_role"),  # Для DELETE: удаление пользователя и PATCH: изменение роли
    path("storage/<int:id_user>/", StorageView.as_view(), name='files_list-add_file'),  # Для GET: список файлов пользователя и POST: загрузка файла
    path("storage/view/<int:id_user>/<int:id_file>/", StorageView.as_view(), name='file_view'),  # Для GET: просмотр файла
    path("storage/download/<int:id_file>/", StorageView.as_view(), name='file_download'),  # Для GET: скачивание файла
    path("storage/download/<str:token>/", StorageView.as_view(), name='file_download_by_token'),  # Для GET: скачивание файла по уникальному токену
    path("storage/link/<int:id_user>/<int:id_file>/", StorageView.as_view(), name='generate_file_link'),  # Для POST: генерация ссылки
    path("storage/<int:id_user>/<int:id_file>/", StorageView.as_view(), name='delete_file'),  # Для DELETE: удаления файла по его id и PATCH: переименование файла
]
