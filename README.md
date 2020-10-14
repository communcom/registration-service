# Registration service

#### Clone the repository

```bash
git clone https://github.com/communcom/registration-service.git
cd registration-service
```

#### Create .env file

```bash
cp .env.example .env
```

Add variables

```bash
CYBERWAY_HTTP_URL=http://cyberway-node
GLS_PRISM_CONNECT=http://prism-node:3000
GLS_PAYMENT_CONNECT=http://payment-node:3000
GLS_SMS_CONNECT=http://sms-node:3000
GLS_EMAIL_CONNECT=http://email-node:3000
GLS_REGISTRATION_ACCOUNT=account
GLS_REGISTRATION_KEY=private key
GLS_DOMAIN_CREATOR_ACCOUNT=account
GLS_DOMAIN_CREATOR_PERMISSION=permission
GLS_DOMAIN_CREATOR_KEY=private key
GLS_PAYMENT_API_KEY=secret-key
WEB_CAPTCHA_SECRET=web-captcha-secret
IOS_CAPTCHA_SECRET=ios-captcha-secret
ANDROID_CAPTCHA_SECRET=android-captcha-secret
```

#### Create docker-compose file

```bash
cp docker-compose.example.yml docker-compose.yml
```

#### Run

```bash
docker-compose up -d --build
```
