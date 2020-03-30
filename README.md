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

onboardingCommunitySubscriptions:             // Шаг процесса онбординга -- подписка на 3 сообщества.
    userId <string>                           // User Id пользователя
    communityIds <[string]>                   // Community Id сообществ

onboardingDeviceSwitched:                     // Шаг процесса онбординга -- логин с другого устройства.
    userId <string>                           // User Id пользователя

onboardingSharedLink:                         // Шаг процесса онбординга -- логин с другого устройства.
    userId <string>                           // User Id пользователя
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

```json
{
    "id": 1,
    "method": "getState",
    "jsonrpc": "2.0",
    "params": {
        "identity": "<id из oauth-service>"
    }
}
```

```json
{
    "id": 1,
    "method": "getState",
    "jsonrpc": "2.0",
    "params": {
        "email": "alice@commun.com"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "currentState": "(firstStep|verify|firstStepEmail|verifyEmail|createIdentity|setUsername|toBlockChain|registered)"
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
        "captcha": "captcha code",
        "captchaType": "(web|android|ios)"
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

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 1103  | Recaptcha check failed     | Ошибка проверки каптчи   |

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

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 1104  | Wrong activation code      | Неверный код верификации |

### resendSmsCode

=> Запрос

```json
{
    "id": 1,
    "method": "resendSmsCode",
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
        "nextSmsRetry": "2019-10-15T07:57:43.879Z",
        "currentState": "verify"
    }
}
```

Ошибки

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 1107  | Try later                  | Try later                |
| 1108  | Too many retries           | Too many retries         |

### firstStepEmail

=> Запрос

```json
{
    "id": 1,
    "method": "firstStepEmail",
    "jsonrpc": "2.0",
    "params": {
        "email": "alice@commun.com",
        "captcha": "captcha code",
        "captchaType": "(web|android|ios)"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "nextEmailRetry": "2019-10-15T07:57:43.879Z",
        "currentState": "verifyEmail"
    }
}
```

Ошибки

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 1103  | Recaptcha check failed     | Ошибка проверки каптчи   |

### verifyEmail

=> Запрос

```json
{
    "id": 1,
    "method": "verifyEmail",
    "jsonrpc": "2.0",
    "params": {
        "email": "alice@commun.com",
        "code": "<code>"
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

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 1104  | Wrong activation code      | Неверный код верификации |

### resendEmailCode

=> Запрос

```json
{
    "id": 1,
    "method": "resendEmailCode",
    "jsonrpc": "2.0",
    "params": {
        "email": "alice@commun.com"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "nextEmailRetry": "2019-10-15T07:57:43.879Z",
        "currentState": "verifyEmail"
    }
}
```

Ошибки

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 1107  | Try later                  | Try later                |
| 1108  | Too many retries           | Too many retries         |

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

```json
{
    "id": 1,
    "method": "setUsername",
    "jsonrpc": "2.0",
    "params": {
        "identity": "<id из oauth-service>",
        "username": "some-user-name"
    }
}
```

```json
{
    "id": 1,
    "method": "setUsername",
    "jsonrpc": "2.0",
    "params": {
        "email": "alice@commun.com",
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

| Code  | Message                        | Описание                  |
| ----- | ------------------------------ | ------------------------- |
| 1101  | Account already registered     | Аккаунт зарегестрирован   |
| 1102  | Invalid step taken             | Неверный шаг регистрации  |
| 1106  | This username is already taken | Данный username уже занят |

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

```json
{
    "id": 1,
    "method": "toBlockChain",
    "jsonrpc": "2.0",
    "params": {
        "identity": "<id из oauth-service>",
        "username": "some-user-name",
        "userId": "<userId c шага setUsername>",
        "publicOwnerKey": "GLS8Bb....",
        "publicActiveKey": "GLS35B...."
    }
}
```

```json
{
    "id": 1,
    "method": "toBlockChain",
    "jsonrpc": "2.0",
    "params": {
        "email": "alice@commun.com",
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

### onboardingCommunitySubscriptions

=> Запрос

```json
{
    "id": 1,
    "method": "onboardingCommunitySubscriptions",
    "jsonrpc": "2.0",
    "params": {
        "userId": "tst5swkjbtgy",
        "communityIds": ["GIFS", "GIRLS", "HEALTH"]
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "status": "OK"
    }
}
```

### onboardingDeviceSwitched

=> Запрос

```json
{
    "id": 1,
    "method": "onboardingDeviceSwitched",
    "jsonrpc": "2.0",
    "params": {
        "userId": "tst5swkjbtgy"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "status": "OK"
    }
}
```

### onboardingSharedLink

=> Запрос

```json
{
    "id": 1,
    "method": "onboardingSharedLink",
    "jsonrpc": "2.0",
    "params": {
        "userId": "tst5swkjbtgy"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "status": "OK"
    }
}
```

Ошибки

| Code  | Message                    | Описание                 |
| ----- | -------------------------- | ------------------------ |
| 1101  | Account already registered | Аккаунт зарегестрирован  |
| 1102  | Invalid step taken         | Неверный шаг регистрации |
| 500   | Internal Service Error     | Ошибка сервиса           |
