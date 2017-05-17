# express-sso-auth-cli

单点登录客户端验证包。需要自己创建单点登录认证系统的认证逻辑以及功能。

# Example

```
const express = require('express');
const server = express();

server.use(require('express-sso-auth-cli')({
    sso_server: 'http://127.0.0.1:8800',
    sso_client: 'http://127.0.0.1:8801'
}, server));

```
