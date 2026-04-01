const inquirer = require('inquirer');
const chalk = require('chalk');
const { Client } = require('pg');
const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');

// Цвета для вывода
const colors = {
  title: chalk.bold.green,
  error: chalk.bold.red,
  warning: chalk.bold.yellow,
  info: chalk.bold.blue,
  success: chalk.bold.greenBright
};

// Конфигурация серверов
const serverConfigs = {
  server1: {
    name: 'Сервер 1 (Прием заявок)',
    port: 3001,
    dbDefaultName: 'tickets_temp',
    migrationsPath: '../server1/database/migrations',
    srcFolder: 'server1',
    files: ['server1', 'shared', 'installer']
  },
  server2: {
    name: 'Сервер 2 (Хранение и админ-панель)',
    port: 3002,
    dbDefaultName: 'tickets_permanent',
    migrationsPath: '../server2/database/migrations',
    srcFolder: 'server2',
    files: ['server2', 'shared', 'installer']
  }
};

// Корневая директория проекта
const ROOT_DIR = path.join(__dirname, '..');

async function cleanupUnnecessaryFiles(serverType) {
  const config = serverConfigs[serverType];
  
  console.log(colors.info('Очистка ненужных файлов...'));
  
  // Получаем список всех папок в корне
  const allDirs = fs.readdirSync(ROOT_DIR).filter(item => {
    const fullPath = path.join(ROOT_DIR, item);
    return fs.statSync(fullPath).isDirectory();
  });
  
  // Удаляем папки, которые не нужны для этого сервера
  for (const dir of allDirs) {
    const dirPath = path.join(ROOT_DIR, dir);
    
    // Не удаляем нужные папки и системные
    if (config.files.includes(dir) || 
        dir === 'node_modules' || 
        dir === '.git' ||
        dir.startsWith('.')) {
      continue;
    }
    
    // Удаляем папку другого сервера
    if ((serverType === 'server1' && dir === 'server2') ||
        (serverType === 'server2' && dir === 'server1')) {
      console.log(colors.info(`  → Удаление папки: ${dir}`));
      fs.removeSync(dirPath);
    }
  }
  
  // Обновляем package.json - убираем workspace для ненужного сервера
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath);
    
    if (packageJson.workspaces) {
      delete packageJson.workspaces;
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    }
  }
  
  console.log(colors.success('✓ Очистка завершена'));
}

async function installDependencies(serverType) {
  console.log(colors.info('Установка зависимостей сервера...'));

  const serverPath = path.join(ROOT_DIR, serverConfigs[serverType].srcFolder);

  return new Promise((resolve, reject) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    
    const install = exec(`${npm} install`, {
      cwd: serverPath
    });

    install.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('npm')) {
          console.log(colors.info(`  ${trimmed}`));
        }
      }
    });

    install.stderr.on('data', (data) => {
      console.error(colors.error(`  ${data.toString().trim()}`));
    });

    install.on('close', (code) => {
      if (code === 0) {
        console.log(colors.success('✓ Зависимости установлены'));
        
        // Проверка критических зависимостей
        const criticalPackages = {
          server1: ['express', 'pg', 'multer', 'axios', 'form-data'],
          server2: ['express', 'pg', 'multer', 'bcrypt', 'express-session', 'connect-pg-simple']
        };
        
        const required = criticalPackages[serverType] || [];
        if (required.length > 0) {
          console.log(colors.info('  Проверка критических пакетов...'));
          let allInstalled = true;
          
          for (const pkg of required) {
            try {
              require.resolve(pkg, { paths: [serverPath] });
              console.log(colors.success(`    ✓ ${pkg}`));
            } catch (e) {
              console.log(colors.warning(`    ⚠ ${pkg} - не найден`));
              allInstalled = false;
            }
          }
          
          if (!allInstalled) {
            console.log(colors.warning('  Некоторые пакеты не установлены. Попробуйте запустить npm install вручную.'));
          }
        }
        
        resolve();
      } else {
        reject(new Error(`npm install exited with code ${code}`));
      }
    });
  });
}

async function askServerType() {
  const { serverType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'serverType',
      message: 'Выберите тип сервера:',
      choices: [
        { name: '📥 Сервер 1 - Прием заявок (временное хранение)', value: 'server1' },
        { name: '💾 Сервер 2 - Хранение и админ-панель', value: 'server2' }
      ]
    }
  ]);
  return serverType;
}

async function askDatabaseConfig(serverType) {
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'dbHost',
      message: 'Хост PostgreSQL:',
      default: 'localhost'
    },
    {
      type: 'input',
      name: 'dbPort',
      message: 'Порт PostgreSQL:',
      default: '5432'
    },
    {
      type: 'input',
      name: 'dbUser',
      message: 'Пользователь PostgreSQL:',
      default: 'postgres'
    },
    {
      type: 'password',
      name: 'dbPassword',
      message: 'Пароль PostgreSQL:',
      mask: '*'
    },
    {
      type: 'input',
      name: 'dbName',
      message: 'Имя базы данных:',
      default: () => serverConfigs[serverType].dbDefaultName
    }
  ]);
  return config;
}

async function askServer1Config() {
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'server2Url',
      message: 'URL Сервера 2 (для отправки заявок):',
      default: 'http://localhost:3002'
    },
    {
      type: 'input',
      name: 'syncInterval',
      message: 'Интервал синхронизации (минут):',
      default: '5'
    },
    {
      type: 'input',
      name: 'tempStorageMinutes',
      message: 'Время хранения до отправки (минут):',
      default: '30'
    }
  ]);
  return config;
}

async function askServer2Config() {
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'sessionSecret',
      message: 'Секрет сессий:',
      default: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    },
    {
      type: 'input',
      name: 'adminUsername',
      message: 'Логин администратора:',
      default: 'admin'
    },
    {
      type: 'password',
      name: 'adminPassword',
      message: 'Пароль администратора:',
      mask: '*',
      default: 'admin123'
    }
  ]);
  return config;
}

async function askNetworkConfig(serverType) {
  const config = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: 'Хост для прослушивания (0.0.0.0 для всех интерфейсов):',
      default: '0.0.0.0'
    },
    {
      type: 'input',
      name: 'port',
      message: 'Порт сервера:',
      default: () => serverType === 'server1' ? '3001' : '3002'
    }
  ]);
  return config;
}

async function testDatabaseConnection(client) {
  console.log(colors.info('Проверка подключения к PostgreSQL...'));
  try {
    await client.connect();
    console.log(colors.success('✓ Подключение успешно!'));
    return true;
  } catch (err) {
    console.log(colors.error(`✗ Ошибка подключения: ${err.message}`));
    return false;
  }
}

async function createDatabase(client, dbName) {
  console.log(colors.info(`Создание базы данных "${dbName}"...`));
  try {
    // Проверяем существует ли БД
    const dbCheck = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      // Создаем базу данных
      // Используем отдельное подключение без БД для создания
      const adminClient = new Client({
        host: client.host,
        port: client.port,
        user: client.user,
        password: client.password,
        database: 'postgres' // Подключаемся к дефолтной БД
      });
      
      await adminClient.connect();
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      await adminClient.end();
      console.log(colors.success(`✓ База данных "${dbName}" создана!`));
    } else {
      console.log(colors.warning(`⚠ База данных "${dbName}" уже существует`));
    }
    return true;
  } catch (err) {
    console.log(colors.error(`✗ Ошибка создания БД: ${err.message}`));
    return false;
  }
}

async function runMigrations(client, migrationsPath) {
  console.log(colors.info('Выполнение миграций...'));
  try {
    const migrationsDir = path.join(__dirname, migrationsPath);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    
    for (const file of files.sort()) {
      console.log(colors.info(`  → Выполнение миграции: ${file}`));
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Разделяем SQL на отдельные запросы (по ;)
      const queries = sql.split(';').filter(q => q.trim().length > 0);
      
      for (const query of queries) {
        if (query.trim()) {
          await client.query(query);
        }
      }
    }
    
    console.log(colors.success('✓ Миграции выполнены успешно!'));
    return true;
  } catch (err) {
    console.log(colors.error(`✗ Ошибка выполнения миграций: ${err.message}`));
    return false;
  }
}

async function createEnvFile(serverType, dbConfig, extraConfig, networkConfig) {
  console.log(colors.info('Создание файла конфигурации .env...'));
  
  const envContent = {
    // Сетевые настройки
    HOST: networkConfig.host,
    PORT: networkConfig.port,
    
    // База данных
    DB_HOST: dbConfig.dbHost,
    DB_PORT: dbConfig.dbPort,
    DB_NAME: dbConfig.dbName,
    DB_USER: dbConfig.dbUser,
    DB_PASSWORD: dbConfig.dbPassword
  };

  if (serverType === 'server1') {
    envContent.SERVER2_URL = extraConfig.server2Url;
    envContent.SYNC_INTERVAL_MINUTES = extraConfig.syncInterval;
    envContent.TEMP_STORAGE_MINUTES = extraConfig.tempStorageMinutes;
  } else if (serverType === 'server2') {
    envContent.SESSION_SECRET = extraConfig.sessionSecret;
    envContent.ADMIN_USERNAME = extraConfig.adminUsername;
    envContent.ADMIN_PASSWORD = extraConfig.adminPassword;
  }

  const envPath = path.join(__dirname, '..', serverType, '.env');
  fs.writeFileSync(envPath, Object.entries(envContent)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  );
  
  console.log(colors.success('✓ Файл .env создан!'));
}

async function startServer(serverType) {
  console.log(colors.info('Запуск сервера...'));
  
  const serverPath = path.join(__dirname, '..', serverType, 'src', 'index.js');
  
  const serverProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..', serverType),
    stdio: 'inherit',
    detached: false
  });

  serverProcess.on('error', (err) => {
    console.log(colors.error(`Ошибка запуска сервера: ${err.message}`));
  });

  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(colors.warning(`Сервер остановлен с кодом: ${code}`));
    }
  });

  return serverProcess;
}

async function main() {
  console.log('\n' + colors.title('='.repeat(50)));
  console.log(colors.title('   Установщик системы заявок'));
  console.log(colors.title('='.repeat(50)) + '\n');

  try {
    // Выбор типа сервера
    const serverType = await askServerType();
    const serverConfig = serverConfigs[serverType];
    
    console.log(colors.info(`\nНастройка: ${serverConfig.name}\n`));

    // Очистка ненужных файлов
    await cleanupUnnecessaryFiles(serverType);

    // Установка зависимостей
    await installDependencies(serverType);

    // Конфигурация БД
    const dbConfig = await askDatabaseConfig(serverType);

    // Дополнительные настройки в зависимости от типа сервера
    let extraConfig = {};
    if (serverType === 'server1') {
      extraConfig = await askServer1Config();
    } else if (serverType === 'server2') {
      extraConfig = await askServer2Config();
    }

    // Сетевые настройки
    const networkConfig = await askNetworkConfig(serverType);

    // Тест подключения к PostgreSQL
    const client = new Client({
      host: dbConfig.dbHost,
      port: dbConfig.dbPort,
      user: dbConfig.dbUser,
      password: dbConfig.dbPassword,
      database: 'postgres' // Временное подключение к системной БД
    });

    const connected = await testDatabaseConnection(client);
    if (!connected) {
      console.log(colors.error('\nНе удалось подключиться к PostgreSQL. Проверьте параметры.'));
      await client.end();
      return;
    }

    // Создание базы данных
    await createDatabase(client, dbConfig.dbName);
    await client.end();

    // Подключение к созданной БД для миграций
    const dbClient = new Client({
      host: dbConfig.dbHost,
      port: dbConfig.dbPort,
      user: dbConfig.dbUser,
      password: dbConfig.dbPassword,
      database: dbConfig.dbName
    });

    await dbClient.connect();

    // Выполнение миграций
    await runMigrations(dbClient, serverConfig.migrationsPath);
    await dbClient.end();

    // Создание .env файла
    await createEnvFile(serverType, dbConfig, extraConfig, networkConfig);

    console.log('\n' + colors.success('='.repeat(60)));
    console.log(colors.success('   Установка завершена успешно!'));
    console.log(colors.success('='.repeat(60)) + '\n');

    // Информация о сервере
    if (serverType === 'server1') {
      console.log(colors.success('📥 Сервер 1 (Прием заявок) готов к работе!'));
      console.log('');
      console.log('  Форма подачи заявок:');
      console.log(`  http://localhost:${networkConfig.port}`);
      console.log('');
      console.log('  Статус синхронизации:');
      console.log(`  http://localhost:${networkConfig.port}/status`);
      console.log('');
      console.log('  Особенности:');
      console.log('  ✓ Загрузка файлов (фото, видео, документы)');
      console.log('  ✓ Автоматическая синхронизация с Server 2');
      console.log(`  ✓ Интервал синхронизации: ${extraConfig.syncInterval} мин`);
    } else if (serverType === 'server2') {
      console.log(colors.success('💾 Сервер 2 (Хранение и админ-панель) готов к работе!'));
      console.log('');
      console.log('  Админ-панель:');
      console.log(`  http://localhost:${networkConfig.port}/admin`);
      console.log('');
      console.log('  Данные для входа:');
      console.log(`  Логин: ${extraConfig.adminUsername}`);
      console.log(`  Пароль: ${extraConfig.adminPassword}`);
      console.log('');
      console.log('  Особенности:');
      console.log('  ✓ Просмотр вложений (lightbox для фото и видео)');
      console.log('  ✓ История изменений статусов');
      console.log('  ✓ Комментарии к заявкам');
      console.log('  ✓ Статистика по заявкам');
    }
    
    console.log('');
    console.log(colors.info('Запуск сервера...\n'));

    // Запуск сервера
    await startServer(serverType);

  } catch (err) {
    console.log(colors.error(`\n✗ Критическая ошибка: ${err.message}`));
    console.log(err.stack);
    process.exit(1);
  }
}

// Запуск установщика
main();
