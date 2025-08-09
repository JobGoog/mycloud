from rest_framework import serializers
from .models import User, Storage
import re

class StorageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Storage
        fields = "__all__"

class UserSerializer(serializers.ModelSerializer):
    storages = StorageSerializer(many=True, read_only=True)  # связь с файлами
    class Meta:
        model = User
        fields = ["id_user", "username", "fullname", "email", "role", "storages", "password"]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def validate_username(self, value):
        # Простая валидация логина
        if len(value) < 3:
            raise serializers.ValidationError("Логин должен содержать минимум 3 символа")
        if len(value) > 20:
            raise serializers.ValidationError("Логин не должен превышать 20 символов") 
        if not re.match("^[a-zA-Z0-9_]+$", value):
            raise serializers.ValidationError("Логин может содержать только буквы, цифры и подчеркивание")
        return value

    def validate_password(self, value):
        # Усиленная валидация пароля
        if len(value) < 8:
            raise serializers.ValidationError("Пароль должен содержать минимум 8 символов")
        if len(value) > 50:
            raise serializers.ValidationError("Пароль не должен превышать 50 символов")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну маленькую букву")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну большую букву")
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы одну цифру")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", value):
            raise serializers.ValidationError("Пароль должен содержать хотя бы один специальный символ (!@#$%^&*()_+-=[]{}|;:,.<>?)")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            fullname=validated_data['fullname'],
            role=validated_data.get('role', 'user')  # Установка роли по умолчанию
        )
        return user
