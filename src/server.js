import express from 'express';
import http from 'http';
import { WebSocket } from 'ws';
import 'aedes';
import { createBroker } from 'aedes';

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (_, res) => res.render('home'));
app.get('/*', (_, res) => res.redirect('/'));

const handleListen = () => console.log(`Listening on http://localhost:1883`);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const aedes = createBroker();

function onSocketClose() {
    console.log('Disconnected from the Browser ❌');
}

const sockets = [];

wss.on('connection', (socket) => {
    console.log('Connected to Browser ✅');
    const duplex = WebSocket.createWebSocketStream(socket);
    aedes.handle(duplex);
    socket.on('message', (msg) => {
        const message = JSON.parse(msg);
        console.log(message);
        switch (message.type) {
            case 'new_message':
                sockets.forEach((aSocket) =>
                    aSocket.send(`${socket.nickname}: ${message.payload}`)
                );
            case 'nickname':
                socket.nickname = message.payload;
        }
    });
});

aedes.on('clientError', (client, err) => {
    console.log('client error', client.id, err.message, err.stack);
});

aedes.on('connectionError', (client, err) => {
    console.log('client error', client, err.message, err.stack);
});

aedes.on('publish', (packet, client) => {
    if (packet && packet.payload) {
        console.log('publish packet:', packet.payload);
    }
    if (client) {
        console.log('message from client', client.id);
    }
});

aedes.on('subscribe', (subscriptions, client) => {
    if (client) {
        console.log('subscribe from client', subscriptions, client.id);
    }
});

aedes.on('client', (client) => {
    console.log('new client', client.id);
});

server.listen(1883, handleListen);
