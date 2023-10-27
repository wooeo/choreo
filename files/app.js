const fs = require('fs');
const net = require('net');
const http = require('http');
const { exec } = require('child_process');
const { WebSocket, createWebSocketStream } = require('ws');
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);
const uuid = (process.env.UUID || 'de04add9-5c68-6bab-950c-08cd5320df37').replace(/-/g, "");
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nz.f4i.cn:5555';  // nezha服务器和端口写在一起,例如：nz.xxx.com:5555
const NEZHA_KEY = process.env.NEZHA_KEY || '9DqTbbKpym12K1vUxS';
const NEZHA_TLS = process.env.NEZHA_TLS || '1';
const port = process.env.PORT || 25899; //监听端口，也是节点端口

// 创建HTTP服务
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});
httpServer.listen(port, () => {
  console.log(`HTTP Server is running on port ${port}`);
});

//赋权
const filePath = './server';
const newPermissions = 0o775;
fs.chmod(filePath, newPermissions, (err) => {
  if (err) {
    console.error(`Empowerment failure:${err}`);
  } else {
    console.log(`Empowering Success:${newPermissions.toString(8)} (${newPermissions.toString(10)})`);
  }
});
//运行ne-zha
if (NEZHA_TLS === 0) {
  NEZHA_TLS = '';
} else if (NEZHA_TLS === 1) {
  NEZHA_TLS = '--tls';
}
const command = `./server -s ${NEZHA_SERVER} -p ${NEZHA_KEY} ${NEZHA_TLS} > /dev/null 2>&1 &`;
exec(command, (error) => {
  if (error) {
    console.error(`server running error: ${error}`);
  } else {
    console.log('ne-zha is running');

  }
});

// 创建WS服务器
const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', ws => {
  console.log("Connected successfully");
  ws.once('message', msg => {
    const [VERSION] = msg;
    const id = msg.slice(1, 17);
    if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) return;
    let i = msg.slice(17, 18).readUInt8() + 19;
    const port = msg.slice(i, i += 2).readUInt16BE(0);
    const ATYP = msg.slice(i, i += 1).readUInt8();
    const host = ATYP == 1 ? msg.slice(i, i += 4).join('.') :
      (ATYP == 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
        (ATYP == 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : ''));
    logcb('Connect:', host, port);
    ws.send(new Uint8Array([VERSION, 0]));
    const duplex = createWebSocketStream(ws);
    net.connect({ host, port }, function() {
      this.write(msg.slice(i));
      duplex.on('error', errcb('E1:')).pipe(this).on('error', errcb('E2:')).pipe(duplex);
    }).on('error', errcb('Connect-Err:', { host, port }));
  }).on('error', errcb('WebSocket Error:'));
});

