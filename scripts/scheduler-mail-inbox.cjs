// Local-only SMTP sink for development. It never delivers email externally.
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const directory = process.argv[2] || "/private/tmp/jpakjr-scheduler-mail";
fs.mkdirSync(directory, { recursive: true });
let count = 0;
net
  .createServer((socket) => {
    socket.write("220 localhost scheduler test inbox\r\n");
    let buffer = "";
    let collecting = false;
    let message = [];
    socket.on("data", (data) => {
      buffer += data.toString();
      let position;
      while ((position = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, position);
        buffer = buffer.slice(position + 2);
        if (collecting) {
          if (line === ".") {
            fs.writeFileSync(
              path.join(directory, `mail-${Date.now()}-${++count}.eml`),
              message.join("\r\n"),
            );
            message = [];
            collecting = false;
            socket.write("250 message captured\r\n");
            console.log(`Captured test email ${count}`);
          } else message.push(line.replace(/^\.\./, "."));
        } else if (/^(EHLO|HELO)/i.test(line))
          socket.write("250-localhost\r\n250 PIPELINING\r\n");
        else if (/^DATA/i.test(line)) {
          collecting = true;
          socket.write("354 end with a dot\r\n");
        } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
    socket.on("error", () => {});
  })
  .listen(2525, "127.0.0.1", () =>
    console.log(
      `Local SMTP inbox listening on 127.0.0.1:2525; messages: ${directory}`,
    ),
  );
