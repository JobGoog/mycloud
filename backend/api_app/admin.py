from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Storage

# Настраиваем отображение модели User
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'fullname', 'role', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('email', 'username')
    ordering = ('email',)
    filter_horizontal = ()
    fieldsets = ()

# Настраиваем отображение модели Storage
class StorageAdmin(admin.ModelAdmin):
    list_display = ('original_name', 'id_user', 'size', 'upload_date')
    list_filter = ('id_user', 'upload_date')
    search_fields = ('original_name', 'id_user__username')

# Регистрируем модели
admin.site.register(User, UserAdmin)
admin.site.register(Storage, StorageAdmin)
