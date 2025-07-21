** Шаги по развертыванию приложения на сервере

1. Генерируем SSH-ключ удобным способом. Копируем публичный SSH-ключ
2. Создаем на сайте [reg.ru](https://cloud.reg.ru) облачный сервер:
   - образ - `Ubuntu 24.04 LTS`
   - тип диска - `Стандартный`
   - тариф - `Std C1-M1-D10`
   - регион размещения - `Москва`
   - добавляем новый SSH-ключ:  
       добавляем новый SSH-ключ, используя ранее сгенерированный публичный SSH-ключ  
       указываем название ключа  
       указываем название сервера  
   - нажимаем кнопку `Заказать сервер`

   ---

3. Запускаем терминал и подключаемся к серверу:\
   `ssh root@<ip адрес сервера>`\
   Вводим пароль для доступа к серверу от SSH-ключа или из письма, полученного на эл. почту
4. Создаем нового пользователя:\
   `adduser <ИМЯ ПОЛЬЗОВАТЕЛЯ>`
5. Добавляем созданного пользователя в группу `sudo`:\
   `usermod <ИМЯ ПОЛЬЗОВАТЕЛЯ> -aG sudo`
6. Выходим из под пользователя `root`:\
   `logout`
7. Подключаемся к серверу под новым пользователем:\
   `ssh <ИМЯ ПОЛЬЗОВАТЕЛЯ>@<IP АДРЕС СЕРВЕРА>`

   ---

8. Обновляем список доступных пакетов `apt` и их версий из всех настроенных репозиториев, включая PPA, чтобы пользоваться их актуальными релизами:\
   `sudo apt update`\
   ***Необязательно:***
      - обновляем установленные пакеты на системе до последней доступной версии, но только тех, что могут быть обновлены без изменения зависимостей или удаления других пакетов:\
      `sudo apt upgrade`
      - если нужно также обновить пакеты, которые требуют изменения зависимостей (например, если необходимо удалить старые пакеты или установить новые), можно использовать команду:\
      `sudo apt full-upgrade`
9. Устанавливаем нужной версии `Python 3.13.1+`:
   - Установка необходимых инструментов для добавления PPA:\
      `sudo apt install software-properties-common`
   - Добавление PPA для установок новых версий Python:\
      `sudo add-apt-repository ppa:deadsnakes/ppa`
   - Обновление списка пакетов:\
      `sudo apt update`
   - Установка Python 3.13 и необходимых пакетов для разработки:\
      `sudo apt install python3.13 python3.13-venv python3.13-dev python3-pip`
   - Проверка установленной версии Python 3.13:\
      `python3.13 --version`
   - Настройка Python 3.13 как альтернативы для python3:\
      `sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.13 1`\
      `sudo update-alternatives --config python3`
   - Проверка версии python3, чтобы убедиться, что всё настроено правильно:\
      `python3 --version`
10. Устанавливаем необходимые пакеты:\
   `sudo apt install postgresql nginx`

    ---

11. Заходим в панель `psql` под пользователем `postgres`:\
   `sudo -u postgres psql`
12. Задаем пароль для пользователя `postgres`:\
   `ALTER USER postgres WITH PASSWORD 'postgres';`
13. Создаем базу данных:\
   `CREATE DATABASE mycloud;`
14. Выходим из панели `psql`:\
    `\q`

    ---

15. Проверяем что установлен `git`:\
   `git --version`
16. Клонируем репозиторий:\
   `git clone https://github.com/jobgoog/mycloud.git`

    ---

17. Переходим в папку проекта `backend`:\
   `cd /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/My_Cloud_diplom/backend`
18. Устанавливаем виртуальное окружение:\
   `python3 -m venv venv`
19. Активируем виртуальное окружение:\
   `source venv/bin/activate`
20. Устанавливаем зависимости:\
   `pip install -r requirements.txt`
21. В папке `backend` создаем файл `.env` в соответствии с шаблоном:\
   `nano .env`

      ```python
         # Настройки Django
         # можно сгенерировать на сайте https://djecrety.ir или с помощью терминала python: >>> import secrets >>> print(secrets.token_urlsafe(50))
         SECRET_KEY=*******
         # False or True
         DEBUG=False
         ALLOWED_HOSTS=*

         # Настройки базы данных, что создали на этапе 12-13
         DATABASE_NAME=mycloud
         DATABASE_USER=postgres
         DATABASE_PASSWORD=password
         DATABASE_HOST=localhost
         DATABASE_PORT=5432
      ```

22. Применяем миграции:\
   `python manage.py migrate`
23. Создаем администратора (суперпользователя):\
   `python manage.py createsuperuser`\
   *Суперпользователь позволят входить как в "Django administration", так и в "Административный интерфейс" сайта после входа.*
24. Собираем весь статичный контент в одной папке (`static`) на сервере:\
   `python manage.py collectstatic`
25. Запускаем сервер:\
   `python manage.py runserver 0.0.0.0:8000`

    ---

26. Проверяем работу `gunicorn`:\
   `gunicorn --bind 0.0.0.0:8000 backend_project.wsgi`
27. Создаем файл `gunicorn.socket`:\
   `sudo nano /etc/systemd/system/gunicorn.socket`

      ```ini
      [Unit]
      Description=gunicorn socket

      [Socket]
      ListenStream=/run/gunicorn.sock

      [Install]
      WantedBy=sockets.target
      ```

    ---

28. Создаем файл `gunicorn.service`:\
   `sudo nano /etc/systemd/system/gunicorn.service`

      ```ini
      [Unit]
      Description=gunicorn daemon
      Requires=gunicorn.socket
      After=network.target

      [Service]
      User=<ИМЯ ПОЛЬЗОВАТЕЛЯ>
      Group=www-data
      WorkingDirectory=/home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/backend
      ExecStart=/home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/backend/venv/bin/gunicorn \
               --access-logfile - \
               --workers 3 \
               --bind unix:/run/gunicorn.sock \
               backend_project.wsgi:application

      [Install]
      WantedBy=multi-user.target
      ```

      ***Объяснение параметров:***

      - User — Имя пользователя, под которым будет работать Gunicorn.
      - Group — Группа, к которой принадлежит пользователь.
      - WorkingDirectory — Путь к вашему приложению.
      - ExecStart — Команда для запуска Gunicorn, где вы указываете:
        - --access-logfile — Логирование запросов (или - для stdout).
        - --workers — Количество рабочих процессов (в данном случае 3).
        - --bind — Указывает на сокет, который вы создали.

    ---

29. Запускаем файл `gunicorn.socket`:\
   `sudo systemctl start gunicorn.socket`\
   `sudo systemctl enable gunicorn.socket`
30. Проверяем статус файла `gunicorn.socket`:\
   `sudo systemctl status gunicorn.socket`
31. Убеждаемся что файл `gunicorn.sock` присутствует в папке `/run`:\
   `file /run/gunicorn.sock`
32. Проверяем статус `gunicorn`:\
   `sudo systemctl status gunicorn`

      Если `gunicorn` не активен, то запускаем его:\
      `sudo systemctl start gunicorn;`\
      `sudo systemctl enable gunicorn;`

    ---

33. Создаем модуль `nginx`:\
   `sudo nano /etc/nginx/sites-available/mycloud`

      ```ini
      server {
         listen 80;
         server_name <ИМЯ ДОМЕНА ИЛИ IP АДРЕС СЕРВЕРА>;
         root /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/frontend/dist;
         index index.html index.htm;
         try_files $uri $uri/ /index.html;

         location = /favicon.ico {
            access_log off;
            log_not_found off;
         }

         location /static/ {
            alias /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/backend/static/;
         }

         location /media/ {
            alias /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/backend/media/;
         }

         location /admindjango/ {
            proxy_pass http://unix:/run/gunicorn.sock;
            include proxy_params;
         }

         location /api/ {
            proxy_pass http://unix:/run/gunicorn.sock;
            include proxy_params;
         }
      }
      ```

34. Создаем символическую ссылку:\
   `sudo ln -s /etc/nginx/sites-available/mycloud/etc/nginx/sites-enabled`
35. Добавляем пользователя `www-data` в группу текущего пользователя:\
   `sudo usermod -a -G ${USER} www-data`
36. Диагностируем `nginx` на предмет ошибок в синтаксисе:\
   `sudo nginx -t`
37. Перезапускаем веб-сервер:\
   `sudo systemctl restart nginx`
38. Проверяем статус `nginx`:\
   `sudo systemctl status nginx`
39. При помощи `firewall` даем полные права `nginx` для подключений:\
   `sudo ufw allow 'Nginx Full'`

    ---

40. Устанавливаем [Node Version Manager](https://github.com/nvm-sh/nvm) (nvm):\
   `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`
41. Добавляем переменную окружения:

      ```bash
      export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      ```

42. Проверяем версию `nvm`:\
   `nvm -v`
43. Устанавливаем нужную версию `node`:\
   `nvm install <НОМЕР ВЕРСИИ>`
44. Проверяем версию `node`:\
   `node -v`
45. Проверяем версию `npm`:\
   `npm -v`

    ---

46. Переходим в папку проекта `frontend`:\
   `cd /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/frontend`
47. В папке `frontend/src` в файле `config.ts` редактируем базовый URL:\
   `nano config.ts`\
   `const API_BASE_URL = 'http://<IP АДРЕС СЕРВЕРА>:8000';`
48. Устанавливаем зависимости:\
   `npm i`

    ---

49. В папке `frontend` создаем файл `start.sh`:\
   `nano start.sh`

      ```sh
      #!/bin/bash
      . /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/.nvm/nvm.sh
      npm run build
      ```

50. Делаем файл `start.sh` исполняемым:\
   `sudo chmod +x /home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/frontend/start.sh`

    ---

51. Создаем файл `frontend.service`:\
   `sudo nano /etc/systemd/system/frontend.service`

      ```ini
      [Unit]
      Description=frontend service
      After=network.target

      [Service]
      User=<ИМЯ ПОЛЬЗОВАТЕЛЯ>
      Group=www-data
      WorkingDirectory=/home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/frontend
      ExecStart=/home/<ИМЯ ПОЛЬЗОВАТЕЛЯ>/mycloud/frontend/start.sh

      [Install]
      WantedBy=multi-user.target
      ```

    ---

52. Запускаем сервис `frontend`:\
   `sudo systemctl start frontend`\
   `sudo systemctl enable frontend`
53. Проверяем статус сервиса `frontend`:\
   `sudo systemctl status frontend`

    ---

54. Запускаем сервер с помощью `gunicorn` и команды `nohup`:\
   `nohup gunicorn backend_project.wsgi -b 0.0.0.0:8000 > gunicorn.log 2>&1 &`

      ***Объяснение команды:***
      - **nohup** — запускает процесс так, что он не завершится при выходе из системы.
      - **gunicorn backend_project.wsgi -b 0.0.0.0:8000** — указывает команду для запуска сервера gunicorn.
      - **gunicorn.log** — перенаправляет стандартный вывод (stdout) в файл gunicorn.log.
      - **2>&1** — перенаправляет стандартный вывод ошибок (stderr) в тот же файл, что и стандартный вывод, то есть все логи будут записаны в gunicorn.log.
      - **&** — запускает процесс в фоновом режиме.

    ---

55. Проверяем доступность сайта по адресу:\
   `http://<IP АДРЕС СЕРВЕРА>`
56. Проверяем доступность Django administration по адресу:\
   `http://<IP АДРЕС СЕРВЕРА>/admindjango/`
#   m y c l o u d 
 
 #   m y c l o u d 
 
 
