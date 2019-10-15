# REGISTRATION-SERVICE

**REGISTRATION-SERVICE** является сервисом регистрации для commun.com и приложений.

## API

```
getState:                 // Получить текущий стейт регистрации для пользователя.
    phone <string>        // Телефон пользователя.

firstStep:                // Первый шаг регистрации.
    phone <string>        // Номер телефона.
    captcha <string>      // Google reCaptcha.

verify:                   // Второй шаг регистрации, верификация аккаунта.
    phone <string>        // Телефон пользователя.
    code <number/string>  // Код из смс.

setUsername:              // Третий шаг регистрации, верификация аккаунта.
    phone <string>        // Телефон пользователя.
    username <string>     // Имя пользователя.

toBlockChain:             // Последний шаг регистрации, запись в блокчейн.
    phone <string>           // Телефон пользователя.
    userId <string>          // User Id пользователя
    username <string>        // Имя пользователя.
    publicOwnerKey <string>  // Ключ аккаунта (главный ключ).
    publicActiveKey <string> // Ключ аккаунта (активный ключ).
```

## Описание API

### getState

=> Запрос

```json
{
    "id": 1,
    "method": "getState",
    "jsonrpc": "2.0",
    "params": {
        "phone": "+380000000000"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "currentState": "(firstStep|verify|setUsername|toBlockChain|registered)"
    }
}
```

### firstStep

=> Запрос

```json
{
    "id": 1,
    "method": "firstStep",
    "jsonrpc": "2.0",
    "params": {
        "phone": "+380000000000",
        "captcha": "captcha code"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "nextSmsRetry": "2019-10-15T07:57:43.879Z",
        "currentState": "verify"
    }
}
```
Ошибки

| Code | Message | Описание |
| --- | --- | --- |
| 1101 | Account already registered | Аккаунт зарегестрирован |
| 1102 | Invalid step taken | Неверный шаг регистрации |
| 1103 | Recaptcha check failed | Ошибка проверки каптчи |

### verify

=> Запрос

```json
{
    "id": 1,
    "method": "verify",
    "jsonrpc": "2.0",
    "params": {
        "phone": "+380000000000",
        "code": 1234
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "currentState": "setUsername"
    }
}
```
Ошибки

| Code | Message | Описание |
| --- | --- | --- |
| 1101 | Account already registered | Аккаунт зарегестрирован |
| 1102 | Invalid step taken | Неверный шаг регистрации |
| 1104 | Wrong activation code | Неверный код верификации |

### setUsername

=> Запрос

```json
{
    "id": 1,
    "method": "setUsername",
    "jsonrpc": "2.0",
    "params": {
        "phone": "+380000000000",
        "username": "some-user-name"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "currentState": "toBlockChain",
        "userId": "<generated userId>"
    }
}
```
Ошибки

| Code | Message | Описание |
| --- | --- | --- |
| 1101 | Account already registered | Аккаунт зарегестрирован |
| 1102 | Invalid step taken | Неверный шаг регистрации |
| 1106 | This username is already taken | Данный username уже занят |

### toBlockChain

=> Запрос

```json
{
    "id": 1,
    "method": "toBlockChain",
    "jsonrpc": "2.0",
    "params": {
        "phone": "+380000000000",
        "username": "some-user-name",
        "userId": "<userId c шага setUsername>",
        "publicOwnerKey": "GLS8Bb....", 
    	"publicActiveKey": "GLS35B...."
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "username": "some-user-name",
        "userId": "<userId c шага setUsername>",
        "currentState": "registered"
    }
}
```
Ошибки

| Code | Message | Описание |
| --- | --- | --- |
| 1101 | Account already registered | Аккаунт зарегестрирован |
| 1102 | Invalid step taken | Неверный шаг регистрации |
| 500 | Internal Service Error | Ошибка сервиса |
