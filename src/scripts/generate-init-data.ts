import crypto from "crypto";

function generateValidInitData(botToken: string, user: any) {
  const authDate = Math.floor(Date.now() / 1000);
  
  // Создаем URLSearchParams
  const params = new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: authDate.toString()
  });

  // Сортируем и создаем data-check-string
  const dataCheckArray: string[] = [];
  Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      dataCheckArray.push(`${key}=${value}`);
    });

  const dataCheckString = dataCheckArray.join('\n');

  // Создаем секретный ключ
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Вычисляем hash
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Добавляем hash
  params.append('hash', hash);

  return params.toString();
}

// Пример использования
const BOT_TOKEN = 'your_bot_token_here';

const testUser = {
  id: 123456789,
  first_name: 'John',
  last_name: 'Doe',
  username: 'johndoe'
};

const initData = generateValidInitData(BOT_TOKEN, testUser);
console.log('Generated initData:');
console.log(initData);
