const fs = require('fs');
const net = require('net');
const { exec } = require('child_process');
const { WebSocket, createWebSocketStream } = require('ws');
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);
const uuid = (process.env.UUID || 'de04add9-5c68-6bab-950c-08cd5320df37').replace(/-/g, "");
const port = process.env.PORT || 3000;
const NEZHA_SERVER = 'nz.f4i.cn:5555';
const NEZHA_KEY = 'N9BVoBfucVIrIzCBt8';
const filePath = './server'; 
const newPermissions = 0o777; 

fs.chmod(filePath, newPermissions, (err) => {
  if (err) {
    console.error(`Empowerment failure:${err}`);
  } else {
    console.log(`Empowering Success:${newPermissions.toString(8)} (${newPermissions.toString(10)})`);
  }
});

const command = `./server -s ${NEZHA_SERVER} -p ${NEZHA_KEY} > /dev/null 2>&1 &`;
exec(command, (error) => {
  if (error) {
    console.error(`server running error: ${error}`);
  } else {
    console.log('server is running');
    
  }
});

const wss = new WebSocket.Server({ port }, logcb('listening:', port));
wss.on('connection', ws => {
  console.log("connected successfully")
  ws.once('message', msg => {
    const [VERSION] = msg;
    const id = msg.slice(1, 17);
    if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) return;
    let i = msg.slice(17, 18).readUInt8() + 19;
    const port = msg.slice(i, i += 2).readUInt16BE(0);
    const ATYP = msg.slice(i, i += 1).readUInt8();
    const host = ATYP == 1 ? msg.slice(i, i += 4).join('.') : // IPV4
      (ATYP == 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
        (ATYP == 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : '')); // IPv6

    logcb('Connect:', host, port);
    ws.send(new Uint8Array([VERSION, 0]));
    const duplex = createWebSocketStream(ws);
    net.connect({ host, port }, function () {
      this.write(msg.slice(i));
      duplex.on('error', errcb('E1:')).pipe(this).on('error', errcb('E2:')).pipe(duplex);
    }).on('error', errcb('Connect-Err:', { host, port }));
  }).on('error', errcb('WebSocket Error:'));
});
